#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const execFileAsync = promisify(execFile);

const API = process.env.ZAPFORMAT_PRINT_API || "https://api.168.113.211.246.sslip.io";
const PRINTER = process.env.ZAPFORMAT_PRINTER || "Samsung_M2020_Series";
const DIR = path.join(os.homedir(), "Library", "Application Support", "ZapFormatPrint");
const CONFIG = path.join(DIR, "config.json");
const LOG = path.join(DIR, "agent.log");

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function log(line) {
  await fsp.mkdir(DIR, { recursive: true });
  await fsp.appendFile(LOG, new Date().toISOString() + " " + line + "\n").catch(() => {});
}
async function api(url, options = {}, token = null) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (token) headers["x-zapformat-print-token"] = token;
  const response = await fetch(API + url, { ...options, headers, signal: AbortSignal.timeout(20000) });
  return response;
}
async function readConfig() {
  return JSON.parse(await fsp.readFile(CONFIG, "utf8"));
}
async function pair(code) {
  const response = await api("/api/print-agent/pair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairing_code: code, name: os.hostname() })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.token) throw new Error(data.error || "pair_failed");
  await fsp.mkdir(DIR, { recursive: true, mode: 0o700 });
  await fsp.writeFile(CONFIG, JSON.stringify({ token: data.token, agent_id: data.agent_id, printer: PRINTER }, null, 2), { mode: 0o600 });
  await fsp.chmod(CONFIG, 0o600);
  console.log("ZapFormat print agent paired.");
}
async function failJob(token, jobId, error) {
  await api("/api/print-agent/jobs/" + encodeURIComponent(jobId) + "/fail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: String(error?.message || error || "print_failed").slice(0, 400) })
  }, token).catch(() => {});
}
async function runOnce() {
  const config = await readConfig();
  const response = await api("/api/print-agent/jobs/next", {}, config.token);
  if (response.status === 204) return false;
  const job = await response.json().catch(() => ({}));
  if (!response.ok || !job.job_id) throw new Error(job.error || "job_fetch_failed");
  const pdfPath = path.join(os.tmpdir(), job.filename || ("ZapFormat-" + job.job_id + ".pdf"));
  try {
    const pdfResponse = await api("/api/print-agent/jobs/" + encodeURIComponent(job.job_id) + "/pdf", { headers: { Accept: "application/pdf" } }, config.token);
    if (!pdfResponse.ok) throw new Error("pdf_download_failed_" + pdfResponse.status);
    await fsp.writeFile(pdfPath, Buffer.from(await pdfResponse.arrayBuffer()), { mode: 0o600 });
    const { stdout } = await execFileAsync("/usr/bin/lp", ["-d", config.printer || PRINTER, "-o", "media=A4", pdfPath]);
    const cupsJob = String(stdout || "").trim().slice(0, 120);
    const done = await api("/api/print-agent/jobs/" + encodeURIComponent(job.job_id) + "/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cups_job_id: cupsJob })
    }, config.token);
    if (!done.ok) throw new Error("job_complete_failed_" + done.status);
    await log("PRINTED ZF-" + job.order_number + " " + cupsJob);
    return true;
  } catch (error) {
    await failJob(config.token, job.job_id, error);
    await log("FAILED " + job.job_id + " " + String(error?.message || error));
    throw error;
  } finally {
    await fsp.unlink(pdfPath).catch(() => {});
  }
}
async function loop() {
  await log("START printer=" + PRINTER);
  for (;;) {
    try {
      const printed = await runOnce();
      if (!printed) await sleep(5000);
    } catch (error) {
      await sleep(10000);
    }
  }
}

(async () => {
  const pairIndex = process.argv.indexOf("--pair");
  if (pairIndex >= 0) {
    const code = String(process.argv[pairIndex + 1] || "").trim();
    if (!code) throw new Error("pairing_code_required");
    await pair(code);
    return;
  }
  if (process.argv.includes("--once")) {
    const printed = await runOnce();
    console.log(printed ? "Printed one job." : "No queued jobs.");
    return;
  }
  await loop();
})().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
