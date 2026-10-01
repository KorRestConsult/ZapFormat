"use strict";

// Supplier-only state. This module never imports the ZapFormat database/session/cart code.
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const catalog = require("./partgrade-methods.json");

function normalizePath(value) {
  const p = String(value || "").replace(/^\/+|\/+$/g, "");
  if (!p || !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(p)) throw new Error("invalid_partgrade_path");
  return p;
}

function operation(method, value) {
  const p = normalizePath(value);
  const found = catalog.find(x => x.path === p && x.method === method);
  if (!found) throw new Error("undocumented_partgrade_operation");
  return found;
}

function assertNoCredentials(value) {
  if (!value || typeof value !== "object") return;
  for (const [key, v] of Object.entries(value)) {
    if (/(?:userlogin|userpsw|password|passwd|authorization|secret|token|api.?key)/i.test(key)) throw new Error("credentials_are_server_side");
    assertNoCredentials(v);
  }
}

function flatten(value, prefix = "", out = {}) {
  for (const [key, v] of Object.entries(value || {})) {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (v && typeof v === "object") flatten(v, name, out);
    else if (v !== undefined && v !== null && v !== "") out[name] = String(v);
  }
  return out;
}

function payloadFor(action, args = {}) {
  assertNoCredentials(args);
  let p, params;
  if (["basket_add", "instant_order"].includes(action)) {
    if (!Array.isArray(args.items) || !args.items.length || args.items.length > 500) throw new Error("invalid_positions");
    const positions = args.items.map(item => {
      if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) throw new Error("invalid_quantity");
      if (!item.code && (!item.number || !item.brand || !item.supplierCode || !item.itemKey)) throw new Error("exact_offer_required");
      return Object.fromEntries(["code", "number", "brand", "supplierCode", "itemKey", "quantity", "comment"].filter(k => item[k] !== undefined).map(k => [k, item[k]]));
    });
    p = action === "basket_add" ? "basket/add" : "orders/instant";
    params = { ...(args.options || {}), positions };
  } else if (action === "basket_order") {
    p = "basket/order";
    params = { wholeOrderOnly: 1, ...(args.options || {}) };
    if (!Array.isArray(params.positionIds) || !params.positionIds.length) throw new Error("explicit_position_ids_required");
  } else if (action === "cancel_order_position") {
    p = "orders/cancelPosition";
    if (!String(args.positionId || "").trim()) throw new Error("position_id_required");
    params = { positionId: args.positionId };
  } else if (action === "raw_request") {
    const op = operation(String(args.method || "POST").toUpperCase(), args.path);
    return { method: op.method, path: op.path, encoding: op.encoding, params: op.encoding === "json" ? args.params || {} : flatten(args.params || {}) };
  } else throw new Error("unsupported_partgrade_action");
  return { method: "POST", path: p, encoding: "form", params: flatten(params) };
}

function redact(value, secrets = []) {
  if (typeof value === "string") {
    let result = value;
    for (const secret of secrets.filter(Boolean)) result = result.split(secret).join("[redacted]");
    return result;
  }
  if (Array.isArray(value)) return value.map(x => redact(x, secrets));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, /(?:userlogin|userpsw|password|passwd|authorization|secret|access.?token|api.?key)/i.test(k) ? "[redacted]" : redact(v, secrets)]));
  return value;
}

function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

function basketSnapshot(data) {
  if (!Array.isArray(data)) throw new Error("unverified_basket_response");
  return data.map(row => Object.fromEntries(["positionId", "brand", "number", "supplierCode", "itemKey", "quantity", "price", "priceRate", "priceInSiteCurrency", "basketId", "status", "deadline", "deadlineMax"].map(k => [k, row[k] ?? null]))).sort((a,b) => String(a.positionId).localeCompare(String(b.positionId)));
}

function createActionStore({ filename, now = Date.now, ttl = 600000 }) {
  let records = {}, queue = Promise.resolve();
  const loaded = fs.readFile(filename, "utf8").then(raw => { records = JSON.parse(raw); }).catch(error => { if (error.code !== "ENOENT") throw error; });
  async function save() {
    await fs.mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
    const temp = `${filename}.${crypto.randomUUID()}.tmp`;
    const file = await fs.open(temp, "wx", 0o600);
    try { await file.writeFile(JSON.stringify(records)); await file.sync(); } finally { await file.close(); }
    await fs.rename(temp, filename);
    const dir = await fs.open(path.dirname(filename), "r");
    try { await dir.sync(); } finally { await dir.close(); }
  }
  function serial(fn) { const result = queue.then(() => loaded).then(fn); queue = result.catch(() => {}); return result; }
  return {
    prepare(payload, summary, snapshot = null) {
      return serial(async () => {
        const id = crypto.randomUUID();
        const item = { action_id: id, state: "pending", payload: structuredClone(payload), payload_hash: digest(payload), summary: structuredClone(summary), snapshot: structuredClone(snapshot), expires_at: new Date(now() + ttl).toISOString() };
        records[id] = item;
        await save();
        return item;
      });
    },
    status(id) { return serial(() => records[id] ? { ...records[id], state: records[id].state === "executing" ? "unknown" : records[id].state === "pending" && now() >= Date.parse(records[id].expires_at) ? "expired" : records[id].state } : { state: "not_found" }); },
    async execute(id, confirmed, payloadHash, send, verify) {
      if (confirmed !== true) throw new Error("explicit_approval_required");
      const item = await serial(async () => {
        const found = records[id];
        if (!found) throw new Error("partgrade_action_not_found");
        if (found.state !== "pending") throw new Error("partgrade_action_not_pending_check_status_do_not_retry");
        if (now() >= Date.parse(found.expires_at)) throw new Error("partgrade_action_expired");
        if (found.payload_hash !== payloadHash) throw new Error("approved_payload_mismatch");
        if (verify) await verify(found);
        found.state = "executing";
        // Reserve durably before upstream I/O. Restart/timeout can never replay this ID.
        await save();
        return structuredClone(found);
      });
      let result;
      try { result = await send(item.payload); }
      catch (error) {
        await serial(async () => { records[id].state = "unknown"; records[id].error = String(error.code || "upstream_outcome_unknown"); await save(); });
        return { action_id: id, state: "unknown", error: String(error.code || "upstream_outcome_unknown"), retry_allowed: false };
      }
      return serial(async () => {
        records[id].state = "executed";
        records[id].result = result;
        await save();
        return { action_id: id, state: "executed", result, retry_allowed: false };
      });
    }
  };
}

module.exports = { catalog, operation, normalizePath, assertNoCredentials, flatten, payloadFor, redact, digest, basketSnapshot, createActionStore };
