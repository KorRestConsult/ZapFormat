"use strict";

const token = String(process.env.TIMEWEB_CLOUD_TOKEN || "").trim();
if (!token) {
  console.error("TIMEWEB_CLOUD_TOKEN is not configured.");
  process.exit(2);
}

const url = "https://timeweb.cloud/api/v1/mcp";

async function request(payload, sessionId = null) {
  const headers = {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream"
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error("HTTP " + response.status + ": " + text.slice(0, 1000));
  }

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    const events = text.split(/\r?\n\r?\n/);
    for (const event of events) {
      const line = event.split(/\r?\n/).find((x) => x.startsWith("data:"));
      if (!line) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.id === payload.id || parsed.result || parsed.error) {
          data = parsed;
          break;
        }
      } catch {}
    }
  } else {
    data = text ? JSON.parse(text) : null;
  }

  return {
    data,
    sessionId: response.headers.get("mcp-session-id") || sessionId
  };
}

(async () => {
  const init = await request({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "zapformat-timeweb-probe", version: "1.0.0" }
    }
  });

  if (!init.data?.result) {
    console.error("Unexpected initialize response:", init.data);
    process.exit(3);
  }

  if (init.sessionId) {
    await request({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {}
    }, init.sessionId).catch(() => {});
  }

  const tools = await request({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  }, init.sessionId);

  const list = tools.data?.result?.tools || [];
  console.log("TIMEWEB MCP CONNECTED");
  console.log("server:", init.data?.result?.serverInfo?.name || "Timeweb Cloud");
  console.log("tools:", list.length);
  for (const tool of list.slice(0, 80)) {
    console.log("-", tool.name);
  }
})().catch((error) => {
  console.error("TIMEWEB MCP FAILED");
  console.error(error.message);
  process.exit(1);
});
