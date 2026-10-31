"use strict";

// Run only in a trusted server TTY with DATABASE_URL configured.
// This script creates the first owner directly in PostgreSQL.
// It has no HTTP route, shared password, or client-facing registration.
require("dotenv").config();
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

function parseArgs(args) {
  const allowed = new Set(["name", "surname", "email", "phone"]);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = String(args[i] || "").replace(/^--/, "");
    if (!allowed.has(key) || !args[i].startsWith("--") || !args[i + 1] ||
        String(args[i + 1]).startsWith("--") || out[key]) {
      throw new Error("Invalid arguments. Use --name NAME --email EMAIL [--phone +7...] [--surname SURNAME]");
    }
    out[key] = args[i + 1].trim();
  }
  if (!out.name || !out.email) throw new Error("Owner name and email are required");
  out.email = out.email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email) || out.email.length > 254) {
    throw new Error("Invalid owner email");
  }
  if (out.phone) {
    const raw = out.phone.replace(/[\s()\-]/g, "");
    out.phone = raw.startsWith("8") && raw.length === 11 ? "+7" + raw.slice(1)
      : raw.startsWith("7") && raw.length === 11 ? "+" + raw : raw;
    if (!/^\+7\d{10}$/.test(out.phone)) throw new Error("Phone must be in +7XXXXXXXXXX format");
  }
  if (out.name.length > 120 || (out.surname || "").length > 120) throw new Error("Name is too long");
  return out;
}

async function provisionOwner(db, input, password) {
  const client = await db.connect();
  let committed = false;
  try {
    await client.query("BEGIN");
    // Serializes two simultaneous operator invocations.
    await client.query("SELECT pg_advisory_xact_lock(91423, 20261031)");
    const owners = await client.query("SELECT id FROM users WHERE role = 'owner' LIMIT 1");
    if (owners.rowCount) throw new Error("owner_already_exists");
    const collisions = await client.query(
      "SELECT id FROM users WHERE lower(email) = $1 OR ($2::text IS NOT NULL AND phone = $2) LIMIT 1",
      [input.email, input.phone || null]
    );
    if (collisions.rowCount) throw new Error("identity_already_registered");
    const passwordHash = await bcrypt.hash(password, 12);
    const created = await client.query(
      `INSERT INTO users (name, surname, email, phone, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5, 'owner', 'active') RETURNING id, email, role`,
      [input.name, input.surname || null, input.email, input.phone || null, passwordHash]
    );
    await client.query("COMMIT");
    committed = true;
    return created.rows[0];
  } catch (error) {
    if (!committed) await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Provisioning is allowed only in an interactive secure server terminal (TTY)");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  const owner = parseArgs(process.argv.slice(2));
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false
  });
  try {
    // Generate the credential on the server; never put it into source, environment,
    // command-line arguments, transcripts or API responses.
    const oneTimePassword = crypto.randomBytes(27).toString("base64url");
    const result = await provisionOwner(db, owner, oneTimePassword);
    process.stdout.write("\nOWNER CREATED. Email: " + result.email + "\n");
    process.stdout.write("INITIAL PASSWORD (shown once, store privately): " + oneTimePassword + "\n");
    process.stdout.write("Sign in at /admin/, then change the initial password.\n");
    process.stdout.write("Do not paste this password into chat or commit it to GitHub.\n");
  } finally {
    await db.end();
  }
}
if (require.main === module) {
  main().catch(error => {
    process.stderr.write("Owner provisioning failed: " + error.message + "\n");
    process.exitCode = 1;
  });
}
module.exports = { parseArgs, provisionOwner };
