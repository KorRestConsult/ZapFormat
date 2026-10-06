const crypto = require("node:crypto");

const DEVICE_TOKEN_SHA256 = "d3d9e1351f265bc051f77b9edbbba03a8c275a966a0ce336becd08109123b7bd";
const MCP_ACCESS_KEY_SHA256 = "22200dcbbefead0c7c8674f152f4f1c9b0c8cb264736a9ac7d0dca6a15e3aa8e";
const ONLINE_WINDOW_MS = 10000;
const MAX_EXCHANGE_BYTES = 65536;
const MAX_QUEUE = 16;

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function secureHexEqual(actual, expected) {
  if (!/^[a-f0-9]{64}$/i.test(String(actual || "")) || !/^[a-f0-9]{64}$/i.test(String(expected || ""))) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function validHex(value) {
  const text = String(value || "").trim().toLowerCase();
  return text.length % 2 === 0 && /^[a-f0-9]*$/.test(text);
}

function installFlipperRelay(app) {
  const queue = [];
  const pending = new Map();
  const device = {
    id: null,
    ip: null,
    lastSeen: 0,
    wifiSsid: null,
    wifiRssi: null,
    rpcReady: false,
    firmware: null
  };

  function online() {
    return Boolean(device.id) && Date.now() - device.lastSeen <= ONLINE_WINDOW_MS;
  }

  function deviceAuthorized(req) {
    const auth = String(req.get("authorization") || "");
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return false;
    return secureHexEqual(sha256(token), DEVICE_TOKEN_SHA256);
  }

  function mcpAuthorized(accessKey) {
    return secureHexEqual(sha256(accessKey), MCP_ACCESS_KEY_SHA256);
  }

  function completePending(id, payload) {
    const item = pending.get(id);
    if (!item) return false;
    pending.delete(id);
    clearTimeout(item.timer);
    item.resolve(payload);
    return true;
  }

  function failPending(id, error) {
    const item = pending.get(id);
    if (!item) return false;
    pending.delete(id);
    clearTimeout(item.timer);
    item.reject(error instanceof Error ? error : new Error(String(error || "relay_failed")));
    return true;
  }

  function queueExchange(txHex, options = {}) {
    if (!online()) {
      const error = new Error("flipper_offline");
      error.code = "flipper_offline";
      throw error;
    }

    const tx = String(txHex || "").trim().toLowerCase();
    if (!validHex(tx) || tx.length / 2 > MAX_EXCHANGE_BYTES) {
      const error = new Error("invalid_tx_hex");
      error.code = "invalid_tx_hex";
      throw error;
    }
    if (queue.length >= MAX_QUEUE) {
      const error = new Error("relay_busy");
      error.code = "relay_busy";
      throw error;
    }

    const timeoutMs = Math.max(500, Math.min(15000, Number(options.timeoutMs || 6000)));
    const collectMs = Math.max(50, Math.min(1500, Number(options.collectMs || 250)));
    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        const idx = queue.findIndex((item) => item.id === id);
        if (idx >= 0) queue.splice(idx, 1);
        const error = new Error("relay_timeout");
        error.code = "relay_timeout";
        reject(error);
      }, timeoutMs);

      pending.set(id, { resolve, reject, timer, createdAt: Date.now() });
      queue.push({ id, tx_hex: tx, collect_ms: collectMs });
    });
  }

  app.post("/api/flipper-relay/device/poll", (req, res) => {
    if (!deviceAuthorized(req)) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const deviceId = String(body.device_id || "").trim().slice(0, 80);
    if (!deviceId) return res.status(400).json({ error: "device_id_required" });

    if (device.id && device.id !== deviceId && online()) {
      return res.status(409).json({ error: "different_device_online" });
    }

    device.id = deviceId;
    device.ip = String(req.ip || "").replace("::ffff:", "");
    device.lastSeen = Date.now();
    device.wifiSsid = body.wifi_ssid == null ? device.wifiSsid : String(body.wifi_ssid).slice(0, 96);
    device.wifiRssi = Number.isFinite(Number(body.wifi_rssi)) ? Number(body.wifi_rssi) : device.wifiRssi;
    device.rpcReady = body.rpc_ready === true;
    device.firmware = body.firmware == null ? device.firmware : String(body.firmware).slice(0, 96);

    const resultId = String(body.result_id || "").trim();
    if (resultId) {
      if (body.error) {
        failPending(resultId, new Error(String(body.error).slice(0, 160)));
      } else {
        const rxHex = String(body.rx_hex || "").trim().toLowerCase();
        if (!validHex(rxHex) || rxHex.length / 2 > MAX_EXCHANGE_BYTES) {
          failPending(resultId, new Error("invalid_rx_hex"));
        } else {
          completePending(resultId, {
            id: resultId,
            rx_hex: rxHex,
            device_id: deviceId,
            rpc_ready: device.rpcReady
          });
        }
      }
    }

    const job = queue.shift() || null;
    return res.json({
      ok: true,
      server_time: new Date().toISOString(),
      job
    });
  });

  const tools = [
    {
      name: "flipper_status",
      description: "Return whether the owner's Flipper bridge is online, its last-seen time, Wi-Fi signal and whether the Flipper Expansion RPC session is ready.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false }
    },
    {
      name: "flipper_rpc_exchange",
      description: "Exchange one raw Flipper protobuf RPC byte sequence with the owner's Flipper through the private relay. Input/output are lowercase hexadecimal bytes. Use only for authorized device-management operations.",
      inputSchema: {
        type: "object",
        properties: {
          tx_hex: { type: "string", description: "Raw protobuf RPC bytes as hexadecimal." },
          timeout_ms: { type: "integer", minimum: 500, maximum: 15000 },
          collect_ms: { type: "integer", minimum: 50, maximum: 1500 }
        },
        required: ["tx_hex"],
        additionalProperties: false
      }
    }
  ];

  function toolResult(data, isError = false) {
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      isError
    };
  }

  app.all("/mcp/flipper/:accessKey", async (req, res) => {
    if (!mcpAuthorized(String(req.params.accessKey || ""))) {
      return res.status(404).json({ error: "not_found" });
    }

    if (req.method === "GET") {
      return res.status(405).json({ error: "post_required" });
    }

    const rpc = req.body && typeof req.body === "object" ? req.body : {};
    const id = rpc.id ?? null;

    if (rpc.method === "initialize") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: String(rpc.params?.protocolVersion || "2025-06-18"),
          capabilities: { tools: {} },
          serverInfo: { name: "KOR Flipper Private", version: "0.1.0" },
          instructions: "Private bridge for the authenticated owner's Flipper Zero. Check flipper_status before RPC exchange. Do not expose access keys or device tokens."
        }
      });
    }

    if (rpc.method === "notifications/initialized") return res.status(204).end();
    if (rpc.method === "ping") return res.json({ jsonrpc: "2.0", id, result: {} });
    if (rpc.method === "tools/list") {
      return res.json({ jsonrpc: "2.0", id, result: { tools } });
    }

    if (rpc.method === "tools/call") {
      const name = String(rpc.params?.name || "");
      const args = rpc.params?.arguments || {};
      try {
        if (name === "flipper_status") {
          return res.json({
            jsonrpc: "2.0",
            id,
            result: toolResult({
              online: online(),
              device_id: device.id,
              last_seen: device.lastSeen ? new Date(device.lastSeen).toISOString() : null,
              wifi_ssid: device.wifiSsid,
              wifi_rssi: device.wifiRssi,
              rpc_ready: device.rpcReady,
              firmware: device.firmware,
              queued: queue.length,
              pending: pending.size
            })
          });
        }

        if (name === "flipper_rpc_exchange") {
          const result = await queueExchange(args.tx_hex, {
            timeoutMs: args.timeout_ms,
            collectMs: args.collect_ms
          });
          return res.json({ jsonrpc: "2.0", id, result: toolResult(result) });
        }

        return res.json({
          jsonrpc: "2.0",
          id,
          result: toolResult({ error: "unknown_tool" }, true)
        });
      } catch (error) {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: toolResult({ error: String(error?.code || error?.message || "flipper_relay_error") }, true)
        });
      }
    }

    return res.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: "Method not found" }
    });
  });

  return {
    status() {
      return {
        online: online(),
        device_id: device.id,
        last_seen: device.lastSeen,
        rpc_ready: device.rpcReady
      };
    }
  };
}

module.exports = { installFlipperRelay };
