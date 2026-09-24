require("dotenv").config();

const crypto = require("node:crypto");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const { Pool } = require("pg");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const COOKIE_NAME = process.env.COOKIE_NAME || "zf_session";
const SESSION_DAYS = Math.max(1, Number(process.env.SESSION_DAYS || 30));
const FRONTEND_ORIGINS = String(process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: String(process.env.PGSSL || "false") === "true"
    ? { rejectUnauthorized: false }
    : false
});

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "512kb" }));
app.use(cookieParser());
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (FRONTEND_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"]
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return email || null;
}

function normalizePhone(value) {
  const raw = String(value || "").replace(/[^\d+]/g, "");
  if (!raw) return null;
  if (raw.startsWith("8") && raw.length === 11) return "+7" + raw.slice(1);
  if (raw.startsWith("7") && raw.length === 11) return "+" + raw;
  return raw.startsWith("+") ? raw : "+" + raw;
}

function publicUser(row) {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    surname: row.surname,
    email: row.email,
    phone: row.phone,
    created_at: row.created_at
  };
}

function sessionCookieOptions() {
  const sameSite = String(process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: ["lax", "strict", "none"].includes(sameSite) ? sameSite : "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
  };
  if (process.env.COOKIE_DOMAIN) options.domain = process.env.COOKIE_DOMAIN;
  return options;
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueSession(req, res, userId) {
  const token = createSessionToken();
  const hash = tokenHash(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO user_sessions (user_id, token_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, NULLIF($4, '')::inet, $5)`,
    [
      userId,
      hash,
      String(req.get("user-agent") || "").slice(0, 500),
      String(req.ip || "").replace("::ffff:", ""),
      expiresAt
    ]
  );

  res.cookie(COOKIE_NAME, token, sessionCookieOptions());
}

async function currentUser(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;

  const result = await pool.query(
    `SELECT u.*
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
        AND u.status = 'active'
      LIMIT 1`,
    [tokenHash(token)]
  );

  return result.rows[0] || null;
}

async function requireUser(req, res, next) {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "unauthorized" });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

app.get("/api/health", async (_req, res, next) => {
  try {
    const db = await pool.query("SELECT now() AS now");
    res.json({
      ok: true,
      service: "zapformat-api",
      db: true,
      time: db.rows[0].now
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", authLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const name = String(req.body?.name || "").trim();
    const surname = String(req.body?.surname || "").trim() || null;
    const email = normalizeEmail(req.body?.email);
    const phone = normalizePhone(req.body?.phone);
    const password = String(req.body?.password || "");

    if (!name || (!email && !phone)) {
      return res.status(400).json({ error: "name_and_identity_required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "password_too_short" });
    }

    await client.query("BEGIN");

    const exists = await client.query(
      `SELECT id FROM users
       WHERE ($1::text IS NOT NULL AND lower(email) = $1)
          OR ($2::text IS NOT NULL AND phone = $2)
       LIMIT 1`,
      [email, phone]
    );
    if (exists.rowCount) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "user_already_exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const inserted = await client.query(
      `INSERT INTO users (name, surname, email, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, surname, email, phone, passwordHash]
    );
    const user = inserted.rows[0];

    await client.query(
      "INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
      [user.id]
    );
    await client.query(
      "INSERT INTO user_notification_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
      [user.id]
    );

    await client.query("COMMIT");
    await issueSession(req, res, user.id);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.post("/api/auth/login", authLimiter, async (req, res, next) => {
  try {
    const login = String(req.body?.login || "").trim();
    const password = String(req.body?.password || "");
    const email = login.includes("@") ? normalizeEmail(login) : null;
    const phone = login.includes("@") ? null : normalizePhone(login);

    if (!login || !password) {
      return res.status(400).json({ error: "login_and_password_required" });
    }

    const result = await pool.query(
      `SELECT * FROM users
       WHERE status = 'active'
         AND (($1::text IS NOT NULL AND lower(email) = $1)
           OR ($2::text IS NOT NULL AND phone = $2))
       LIMIT 1`,
      [email, phone]
    );

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    await pool.query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);
    await issueSession(req, res, user.id);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      await pool.query("DELETE FROM user_sessions WHERE token_hash = $1", [tokenHash(token)]);
    }
    res.clearCookie(COOKIE_NAME, sessionCookieOptions());
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "unauthorized" });
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/account/profile", requireUser, async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? req.user.name ?? "").trim();
    const surname = String(req.body?.surname ?? req.user.surname ?? "").trim() || null;
    const email = req.body?.email === undefined ? req.user.email : normalizeEmail(req.body.email);
    const phone = req.body?.phone === undefined ? req.user.phone : normalizePhone(req.body.phone);

    if (!name || (!email && !phone)) {
      return res.status(400).json({ error: "name_and_identity_required" });
    }

    const duplicate = await pool.query(
      `SELECT id FROM users
       WHERE id <> $1
         AND (($2::text IS NOT NULL AND lower(email) = $2)
           OR ($3::text IS NOT NULL AND phone = $3))
       LIMIT 1`,
      [req.user.id, email, phone]
    );
    if (duplicate.rowCount) {
      return res.status(409).json({ error: "user_already_exists" });
    }

    const result = await pool.query(
      `UPDATE users
          SET name = $2,
              surname = $3,
              email = $4,
              phone = $5,
              updated_at = now()
        WHERE id = $1
        RETURNING *`,
      [req.user.id, name, surname, email, phone]
    );

    res.json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/account/overview", requireUser, async (req, res, next) => {
  try {
    const [orders, vehicles, returns] = await Promise.all([
      pool.query(
        `SELECT count(*) FILTER (WHERE status NOT IN ('completed','cancelled'))::int AS active,
                count(*) FILTER (WHERE status = 'ready')::int AS ready
           FROM orders WHERE user_id = $1`,
        [req.user.id]
      ),
      pool.query("SELECT count(*)::int AS count FROM vehicles WHERE user_id = $1", [req.user.id]),
      pool.query(
        "SELECT count(*)::int AS count FROM returns WHERE user_id = $1 AND status NOT IN ('completed','rejected')",
        [req.user.id]
      )
    ]);

    res.json({
      user: publicUser(req.user),
      stats: {
        active_orders: orders.rows[0].active,
        ready_orders: orders.rows[0].ready,
        vehicles: vehicles.rows[0].count,
        active_returns: returns.rows[0].count
      }
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.code === "23505") {
    return res.status(409).json({ error: "conflict" });
  }
  res.status(500).json({ error: "internal_error" });
});

async function start() {
  await pool.query("SELECT 1");
  app.listen(PORT, HOST, () => {
    console.log(`ZAPFORMAT API listening on http://${HOST}:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start ZAPFORMAT API", error);
  process.exit(1);
});
