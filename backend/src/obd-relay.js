"use strict";

const crypto = require("node:crypto");

const DEFAULT_REQUEST_TIMEOUT_MS = 45000;
const DEFAULT_POLL_WAIT_MS = 25000;
const DEFAULT_ACTION_TTL_MS = 5 * 60 * 1000;

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function timingSafeHexEqual(candidate, expected) {
  if (!/^[a-f0-9]{64}$/i.test(String(expected || ""))) return false;
  const a = Buffer.from(String(candidate || "").toLowerCase());
  const b = Buffer.from(String(expected || "").toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function validSecret(value, expectedSha256) {
  return timingSafeHexEqual(sha256(value), expectedSha256);
}

function sanitizeError(error) {
  const message = String(error?.message || error || "obd_error");
  return message.replace(/[\r\n\t]/g, " ").slice(0, 500);
}

function makeToolResult(data, isError = false) {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
    isError
  };
}

function createObdRelayManager(options = {}) {
  const now = options.now || (() => Date.now());
  const requestTimeoutMs = Math.max(1000, Number(options.requestTimeoutMs || DEFAULT_REQUEST_TIMEOUT_MS));
  const pollWaitMs = Math.max(1000, Number(options.pollWaitMs || DEFAULT_POLL_WAIT_MS));

  const queue = [];
  const pending = new Map();
  const pollWaiters = [];
  let bridge = null;

  function bridgeStatus() {
    const ageMs = bridge?.lastSeen ? Math.max(0, now() - bridge.lastSeen) : null;
    return {
      connected: Boolean(bridge && ageMs !== null && ageMs < 60000),
      last_seen_at: bridge?.lastSeen ? new Date(bridge.lastSeen).toISOString() : null,
      age_ms: ageMs,
      client: bridge?.client || null,
      adapter: bridge?.adapter || null,
      vehicle: bridge?.vehicle || null,
      queue_depth: queue.length,
      pending_count: pending.size
    };
  }

  function hello(info = {}) {
    bridge = {
      lastSeen: now(),
      client: info.client || null,
      adapter: info.adapter || null,
      vehicle: info.vehicle || null
    };
    return bridgeStatus();
  }

  function touch(info = null) {
    if (!bridge) bridge = { lastSeen: now(), client: null, adapter: null, vehicle: null };
    bridge.lastSeen = now();
    if (info?.client !== undefined) bridge.client = info.client;
    if (info?.adapter !== undefined) bridge.adapter = info.adapter;
    if (info?.vehicle !== undefined) bridge.vehicle = info.vehicle;
  }

  function dispatchToPoller() {
    while (queue.length && pollWaiters.length) {
      const command = queue.shift();
      const waiter = pollWaiters.shift();
      clearTimeout(waiter.timer);
      waiter.resolve(command);
    }
  }

  async function poll(waitMs = pollWaitMs) {
    touch();
    if (queue.length) return queue.shift();
    const timeoutMs = Math.max(1000, Math.min(30000, Number(waitMs || pollWaitMs)));
    return new Promise((resolve) => {
      const waiter = { resolve, timer: null };
      waiter.timer = setTimeout(() => {
        const index = pollWaiters.indexOf(waiter);
        if (index >= 0) pollWaiters.splice(index, 1);
        resolve(null);
      }, timeoutMs);
      pollWaiters.push(waiter);
    });
  }

  function request(method, args = {}, opts = {}) {
    const timeoutMs = Math.max(1000, Math.min(120000, Number(opts.timeoutMs || requestTimeoutMs)));
    const status = bridgeStatus();
    if (!status.connected) {
      const error = new Error("obd_bridge_offline");
      error.code = "obd_bridge_offline";
      throw error;
    }

    const id = crypto.randomUUID();
    const command = {
      id,
      method: String(method),
      args: args && typeof args === "object" ? args : {},
      created_at: new Date(now()).toISOString()
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        const error = new Error("obd_bridge_timeout");
        error.code = "obd_bridge_timeout";
        reject(error);
      }, timeoutMs);

      pending.set(id, { resolve, reject, timer, method: command.method, createdAt: now() });
      queue.push(command);
      dispatchToPoller();
    });
  }

  function reply(payload = {}) {
    touch(payload.bridge || null);
    const id = String(payload.id || "");
    const slot = pending.get(id);
    if (!slot) {
      const error = new Error("unknown_or_expired_command");
      error.code = "unknown_or_expired_command";
      throw error;
    }

    clearTimeout(slot.timer);
    pending.delete(id);

    if (payload.ok === false) {
      const error = new Error(sanitizeError(payload.error || "bridge_command_failed"));
      error.code = "bridge_command_failed";
      slot.reject(error);
      return { accepted: true, id, ok: false };
    }

    slot.resolve(payload.data ?? null);
    return { accepted: true, id, ok: true };
  }

  function disconnect() {
    bridge = null;
    while (pollWaiters.length) {
      const waiter = pollWaiters.shift();
      clearTimeout(waiter.timer);
      waiter.resolve(null);
    }
    return bridgeStatus();
  }

  return { bridgeStatus, hello, poll, request, reply, disconnect, touch };
}

function createClearActionStore(options = {}) {
  const now = options.now || (() => Date.now());
  const ttlMs = Math.max(10000, Number(options.ttlMs || DEFAULT_ACTION_TTL_MS));
  const actions = new Map();

  function cleanup() {
    for (const [id, action] of actions) {
      if (action.expiresAt <= now() || action.state !== "pending") {
        if (action.expiresAt + ttlMs <= now()) actions.delete(id);
      }
    }
  }

  function prepare(preflight) {
    cleanup();
    const actionId = crypto.randomUUID();
    const token = crypto.randomBytes(24).toString("base64url");
    const action = {
      id: actionId,
      tokenHash: sha256(token),
      state: "pending",
      createdAt: now(),
      expiresAt: now() + ttlMs,
      preflight
    };
    actions.set(actionId, action);
    return {
      action_id: actionId,
      confirm_token: token,
      expires_at: new Date(action.expiresAt).toISOString(),
      preflight
    };
  }

  function consume(actionId, confirmToken, confirmed) {
    cleanup();
    const action = actions.get(String(actionId || ""));
    if (!action) throw new Error("clear_action_not_found");
    if (action.state !== "pending") throw new Error("clear_action_not_pending");
    if (action.expiresAt <= now()) {
      action.state = "expired";
      throw new Error("clear_action_expired");
    }
    if (confirmed !== true) throw new Error("explicit_confirmation_required");
    if (!validSecret(confirmToken, action.tokenHash)) throw new Error("clear_confirmation_mismatch");
    action.state = "executing";
    return action;
  }

  function finish(actionId, state, result = null) {
    const action = actions.get(String(actionId || ""));
    if (action) {
      action.state = state;
      action.result = result;
      action.finishedAt = now();
    }
  }

  return { prepare, consume, finish };
}

const OBD_MCP_TOOLS = [
  {
    name: "obd_bridge_status",
    description: "Проверить, подключён ли iPhone OBD Bridge и доступен ли автомобиль.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: "obd_identify_vehicle",
    description: "Определить подключённый автомобиль: VIN, протокол OBD, данные адаптера и доступные ЭБУ/возможности.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: "obd_scan_all",
    description: "Выполнить универсальную диагностическую проверку: идентификация, сохранённые/ожидающие DTC, readiness и ключевые live-параметры.",
    inputSchema: {
      type: "object",
      properties: {
        include_live: { type: "boolean", default: true },
        include_freeze_frame: { type: "boolean", default: true }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  },
  {
    name: "obd_read_dtcs",
    description: "Прочитать диагностические коды неисправностей. Ничего не стирает.",
    inputSchema: {
      type: "object",
      properties: {
        scope: { type: "string", enum: ["stored", "pending", "permanent", "all"], default: "all" }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: "obd_read_freeze_frame",
    description: "Прочитать стоп-кадр, сохранённый ЭБУ при возникновении DTC.",
    inputSchema: {
      type: "object",
      properties: {
        frame_index: { type: "integer", minimum: 0, maximum: 10, default: 0 }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: "obd_list_supported_pids",
    description: "Получить список поддерживаемых автомобилем стандартных OBD-II PID.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: "obd_read_live_data",
    description: "Прочитать текущие параметры автомобиля. Передай имена PID, например RPM, SPEED, COOLANT_TEMP, MAF, INTAKE_PRESSURE, CONTROL_MODULE_VOLTAGE.",
    inputSchema: {
      type: "object",
      properties: {
        pids: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 64 }
      },
      required: ["pids"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  },
  {
    name: "obd_read_readiness",
    description: "Прочитать readiness monitors перед техосмотром и перед стиранием DTC.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: "obd_prepare_clear_dtcs",
    description: "Подготовить стирание DTC: сначала прочитать текущие ошибки и readiness. Само стирание не выполняется.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  },
  {
    name: "obd_clear_dtcs",
    description: "Стереть DTC только после отдельного явного подтверждения пользователя и успешного obd_prepare_clear_dtcs. Сбрасывает readiness и может удалить freeze-frame.",
    inputSchema: {
      type: "object",
      properties: {
        action_id: { type: "string" },
        confirm_token: { type: "string" },
        confirmed: { type: "boolean", const: true }
      },
      required: ["action_id", "confirm_token", "confirmed"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }
  }
];

function createObdMcp(options = {}) {
  const relay = options.relay || createObdRelayManager(options);
  const clearActions = options.clearActions || createClearActionStore(options);

  async function callTool(name, args = {}) {
    if (name === "obd_bridge_status") return relay.bridgeStatus();
    if (name === "obd_identify_vehicle") return relay.request("identify_vehicle", {});
    if (name === "obd_scan_all") return relay.request("scan_all", args);
    if (name === "obd_read_dtcs") return relay.request("read_dtcs", args);
    if (name === "obd_read_freeze_frame") return relay.request("read_freeze_frame", args);
    if (name === "obd_list_supported_pids") return relay.request("list_supported_pids", {});
    if (name === "obd_read_live_data") return relay.request("read_live_data", args);
    if (name === "obd_read_readiness") return relay.request("read_readiness", {});

    if (name === "obd_prepare_clear_dtcs") {
      const preflight = await relay.request("prepare_clear_dtcs", {});
      return clearActions.prepare(preflight);
    }

    if (name === "obd_clear_dtcs") {
      const action = clearActions.consume(args.action_id, args.confirm_token, args.confirmed);
      try {
        const result = await relay.request("clear_dtcs", { preflight: action.preflight });
        clearActions.finish(args.action_id, "executed", result);
        return { state: "executed", result };
      } catch (error) {
        clearActions.finish(args.action_id, "unknown", { error: sanitizeError(error) });
        throw error;
      }
    }

    throw new Error("unknown_obd_tool");
  }

  return { relay, tools: OBD_MCP_TOOLS, callTool };
}

function registerObdRoutes(app, options = {}) {
  if (!app) throw new Error("express_app_required");

  const mcpKeySha256 = String(options.mcpKeySha256 || process.env.OBD_MCP_KEY_SHA256 || "").trim().toLowerCase();
  const bridgeKeySha256 = String(options.bridgeKeySha256 || process.env.OBD_BRIDGE_KEY_SHA256 || "").trim().toLowerCase();
  const mcp = options.mcp || createObdMcp(options);

  function validMcpKey(value) {
    return validSecret(value, mcpKeySha256);
  }

  function validBridgeKey(value) {
    return validSecret(value, bridgeKeySha256);
  }

  app.post("/api/obd-bridge/hello/:bridgeKey", (req, res) => {
    if (!validBridgeKey(req.params.bridgeKey)) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true, bridge: mcp.relay.hello(req.body || {}) });
  });

  app.get("/api/obd-bridge/poll/:bridgeKey", async (req, res, next) => {
    if (!validBridgeKey(req.params.bridgeKey)) return res.status(404).json({ error: "not_found" });
    try {
      const command = await mcp.relay.poll(req.query?.wait);
      if (!command) return res.status(204).end();
      return res.json({ ok: true, command });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/obd-bridge/result/:bridgeKey", (req, res, next) => {
    if (!validBridgeKey(req.params.bridgeKey)) return res.status(404).json({ error: "not_found" });
    try {
      return res.json({ ok: true, result: mcp.relay.reply(req.body || {}) });
    } catch (error) {
      if (error?.code === "unknown_or_expired_command") return res.status(409).json({ error: error.code });
      return next(error);
    }
  });

  app.post("/api/obd-bridge/disconnect/:bridgeKey", (req, res) => {
    if (!validBridgeKey(req.params.bridgeKey)) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true, bridge: mcp.relay.disconnect() });
  });

  app.all("/mcp/obd/:accessKey", async (req, res) => {
    if (!validMcpKey(req.params.accessKey)) return res.status(404).json({ error: "not_found" });

    if (req.method === "GET") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "post_required" });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).end();
    }

    const rpc = req.body || {};
    const id = rpc.id ?? null;

    try {
      if (rpc.method === "initialize") {
        const requested = rpc.params?.protocolVersion;
        const protocolVersion = ["2025-03-26", "2025-06-18", "2025-11-25"].includes(requested)
          ? requested
          : "2025-06-18";
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: "KORREST OBD AI", version: "0.1.0" },
            instructions: "Universal OBD-II diagnostics bridge. Identify the connected vehicle automatically. Reads may run immediately. Never claim a fault is repaired merely because a DTC was cleared. Before clearing DTCs, always call obd_prepare_clear_dtcs, explain what will be erased and that readiness resets, then wait for explicit user confirmation in a later chat message before obd_clear_dtcs."
          }
        });
      }

      if (rpc.method === "notifications/initialized") return res.status(204).end();
      if (rpc.method === "ping") return res.json({ jsonrpc: "2.0", id, result: {} });
      if (rpc.method === "tools/list") {
        return res.json({ jsonrpc: "2.0", id, result: { tools: mcp.tools } });
      }

      if (rpc.method === "tools/call") {
        const name = String(rpc.params?.name || "");
        const args = rpc.params?.arguments || {};
        try {
          const data = await mcp.callTool(name, args);
          return res.json({ jsonrpc: "2.0", id, result: makeToolResult(data, false) });
        } catch (error) {
          return res.json({
            jsonrpc: "2.0",
            id,
            result: makeToolResult({
              error: String(error?.code || sanitizeError(error))
            }, true)
          });
        }
      }

      return res.status(200).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: "Method not found" }
      });
    } catch (error) {
      return res.status(200).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: "Internal error" }
      });
    }
  });

  return mcp;
}

module.exports = {
  OBD_MCP_TOOLS,
  createClearActionStore,
  createObdMcp,
  createObdRelayManager,
  makeToolResult,
  registerObdRoutes,
  sanitizeError,
  sha256,
  validSecret
};
