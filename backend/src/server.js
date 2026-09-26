require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const { Pool } = require("pg");
const { PartGradeError, createPartGradeClient } = require("./partgrade");
const { customerPrice } = require("./pricing");
const {
  ZapFormatAIError,
  configured: aiConfigured,
  interpretSearch,
  looksLikeArticle,
  looksLikeVin,
  modelName,
  safeVehicleContext
} = require("./ai");

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

const partGrade = createPartGradeClient();

const hasDatabase = Boolean(process.env.DATABASE_URL);
const pool = hasDatabase
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: String(process.env.PGSSL || "false") === "true"
        ? { rejectUnauthorized: false }
        : false
    })
  : null;

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "512kb" }));
app.use(cookieParser());
if (FRONTEND_ORIGINS.length) {
  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (FRONTEND_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"]
  }));
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

const quoteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Math.max(10, Number(process.env.AI_SEARCH_HOURLY_LIMIT || 60)),
  standardHeaders: "draft-8",
  legacyHeaders: false
});

function requireDatabase(_req, res, next) {
  if (!pool) return res.status(503).json({ error: "database_not_configured" });
  next();
}

function requireInternal(req, res, next) {
  const ip = String(req.ip || "").replace("::ffff:", "");
  const direct = ip === "127.0.0.1" || ip === "::1";
  const configured = String(process.env.INTERNAL_API_TOKEN || "");
  const provided = String(req.get("x-zapformat-internal") || "");
  const sameLength = configured && provided && Buffer.byteLength(provided) === Buffer.byteLength(configured);
  if (direct || (sameLength && crypto.timingSafeEqual(
    Buffer.from(provided),
    Buffer.from(configured)
  ))) return next();
  return res.status(404).json({ error: "not_found" });
}

app.use("/api/auth", requireDatabase);
app.use("/api/account", requireDatabase);
app.use("/api/garage", requireDatabase);
app.use("/api/cart", requireDatabase);
app.use("/api/checkout", requireDatabase);
app.use("/api/orders", requireDatabase);
app.use("/api/returns", requireDatabase);
app.use("/api/vin-requests", requireDatabase);

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
    let db = false;
    let time = new Date().toISOString();

    if (pool) {
      const result = await pool.query("SELECT now() AS now");
      db = true;
      time = result.rows[0].now;
    }

    res.json({
      ok: true,
      service: "zapformat-api",
      db,
      supplier_configured: partGrade.configured(),
      ai_configured: aiConfigured(),
      time
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quote-requests", quoteLimiter, async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim().slice(0, 120);
    const phone = normalizePhone(req.body?.phone);
    const rawItems = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];

    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return res.status(400).json({ error: "phone_required" });
    }
    if (!rawItems.length) return res.status(400).json({ error: "items_required" });

    const verified = await resolveRequestedOffers(
      rawItems.map((item, index) => ({
        client_id: String(item?.client_id || index),
        brand: item?.brand,
        article: item?.article,
        offer_ref: item?.offer_ref,
        quantity: item?.quantity
      }))
    );

    const unavailable = verified.filter((item) =>
      !item.found ||
      Number(item.availability || 0) < Number(item.quantity || 1) ||
      Number(item.quantity || 1) % Math.max(1, Number(item.packing || 1)) !== 0
    );
    if (unavailable.length) {
      return res.status(409).json({
        error: "cart_changed",
        unavailable: unavailable.map((item) => ({
          client_id: item.client_id,
          found: item.found,
          availability: Number(item.availability || 0)
        }))
      });
    }

    const rawById = new Map(
      rawItems.map((item, index) => [String(item?.client_id || index), item])
    );
    const items = verified.map((offer) => {
      const raw = rawById.get(offer.client_id) || {};
      return {
        client_id: offer.client_id,
        brand: offer.brand,
        article: offer.article,
        description: String(raw.description || offer.description || "").trim().slice(0, 300) || null,
        quantity: offer.quantity,
        comment: String(raw.comment || "").trim().slice(0, 500) || null,
        quoted_price: offer.price,
        offer_ref: offer.offer_ref,
        returnable: offer.returnable,
        delivery_hours: offer.delivery_hours,
        availability: offer.availability,
        packing: offer.packing,
        needs_confirmation: false
      };
    });

    const now = new Date();
    const requestId =
      "Q-" +
      now.toISOString().slice(0, 10).replace(/-/g, "") +
      "-" +
      crypto.randomBytes(3).toString("hex").toUpperCase();

    const requestUser = pool ? await currentUser(req) : null;
    const record = {
      id: requestId,
      created_at: now.toISOString(),
      name: name || requestUser?.name || null,
      phone,
      items,
      source: "zapformat-web",
      status: "new"
    };

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO quote_requests (id, user_id, name, phone, status, source, created_at)
           VALUES ($1,$2,$3,$4,'new','zapformat-web',$5)`,
          [requestId, requestUser?.id || null, record.name, phone, now]
        );

        for (const item of items) {
          await client.query(
            `INSERT INTO quote_request_items
              (request_id, brand, article, description, quantity, comment,
               quoted_price, needs_confirmation, offer_ref, returnable,
               delivery_hours, availability, price_checked_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [
              requestId,
              item.brand || null,
              item.article,
              item.description,
              item.quantity,
              item.comment,
              item.quoted_price,
              item.needs_confirmation,
              item.offer_ref,
              item.returnable,
              item.delivery_hours,
              item.availability,
              now
            ]
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    } else {
      const file = process.env.QUOTE_REQUESTS_FILE || "/var/lib/zapformat/quote-requests.jsonl";
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.appendFile(file, JSON.stringify(record) + "\n", { encoding: "utf8", mode: 0o600 });
    }

    res.status(201).json({
      ok: true,
      request_id: requestId,
      status: "received",
      items: items.length,
      checked_at: now.toISOString()
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/supplier/health", async (_req, res, next) => {
  try {
    if (!partGrade.configured()) {
      return res.status(503).json({
        ok: false,
        configured: false,
        provider: "PartGrade"
      });
    }

    await partGrade.userInfo();
    res.json({
      ok: true,
      configured: true
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/supplier/capabilities", requireInternal, async (_req, res, next) => {
  try {
    const [basket, payments, shipments, addresses, statuses, orders] = await Promise.allSettled([
      partGrade.basketContent(),
      partGrade.paymentMethods(),
      partGrade.shipmentMethods(),
      partGrade.shipmentAddresses(),
      partGrade.orderStatuses(),
      partGrade.orders({ limit: 20 })
    ]);

    const count = (result) => {
      if (result.status !== "fulfilled") return null;
      const value = result.value;
      if (Array.isArray(value)) return value.length;
      if (value && Array.isArray(value.items)) return value.items.length;
      return value && typeof value === "object" ? Object.keys(value).length : 0;
    };

    res.json({
      ok: true,
      provider: "PartGrade",
      read_access: {
        basket_content: count(basket),
        payment_methods: count(payments),
        shipment_methods: count(shipments),
        shipment_addresses: count(addresses),
        order_statuses: count(statuses),
        orders: count(orders)
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/supplier/basket", requireInternal, async (_req, res, next) => {
  try {
    const rows = await partGrade.basketContent();
    const items = (Array.isArray(rows) ? rows : []).map((row) => ({
      brand: row.brand ?? null,
      article: row.number ?? row.code ?? null,
      description: row.description ?? null,
      quantity: Number(row.quantity || 0),
      price: row.priceInSiteCurrency ?? row.price ?? null,
      delivery_hours: row.deadline ?? null,
      delivery_hours_max: row.deadlineMax ?? null,
      position_id: row.positionId ?? null,
      status: row.status ?? null
    }));
    res.json({ source: "PartGrade", items });
  } catch (error) {
    next(error);
  }
});

app.get("/api/supplier/order-statuses", requireInternal, async (_req, res, next) => {
  try {
    const rows = await partGrade.orderStatuses();
    res.json({ source: "PartGrade", statuses: Array.isArray(rows) ? rows : [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/supplier/orders", requireInternal, async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 20)));
    const skip = Math.max(0, Number(req.query?.skip || 0));
    const data = await partGrade.orders({ limit, skip });
    res.json({ source: "PartGrade", data });
  } catch (error) {
    next(error);
  }
});

app.get("/api/supplier/checkout-options", requireInternal, async (_req, res, next) => {
  try {
    const [paymentMethods, shipmentMethods, shipmentAddresses] = await Promise.all([
      partGrade.paymentMethods(),
      partGrade.shipmentMethods(),
      partGrade.shipmentAddresses()
    ]);
    res.json({
      source: "PartGrade",
      payment_methods: paymentMethods,
      shipment_methods: shipmentMethods,
      shipment_addresses: shipmentAddresses
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/catalog/brands", async (req, res, next) => {
  try {
    const number = String(req.query?.number || "").trim();
    if (!number) return res.status(400).json({ error: "article_required" });

    let rows = await partGrade.searchBrands(number, { useOnlineStocks: true });
    let normalizedRows = Array.isArray(rows)
      ? rows
      : (rows && typeof rows === "object" ? Object.values(rows) : []);

    if (!normalizedRows.length) {
      try {
        rows = await partGrade.searchTips(number);
        normalizedRows = Array.isArray(rows)
          ? rows
          : (rows && typeof rows === "object" ? Object.values(rows) : []);
      } catch (_error) {
        normalizedRows = [];
      }
    }

    const seen = new Set();
    const brands = normalizedRows
      .filter((row) => row && typeof row === "object")
      .map((row) => ({
        brand: row.brand || null,
        article: row.number || number,
        article_normalized: row.numberFix || null,
        description: row.description || null,
        available: Boolean(row.availability)
      }))
      .filter((row) => {
        const key = [row.brand, row.article, row.description].map((x) => String(x || "").trim().toUpperCase()).join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    res.json({ query: { number }, brands });
  } catch (error) {
    next(error);
  }
});

function publicSearchTipCandidates(value) {
  const seen = new Set();
  return normalizeSupplierRows(value)
    .filter((row) => row && typeof row === "object")
    .map((row) => ({
      brand: row.brand || null,
      article: row.number || row.code || null,
      description: row.description || null
    }))
    .filter((row) => row.article)
    .filter((row) => {
      const key = [row.brand, row.article].map((x) => String(x || "").trim().toUpperCase()).join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function supplierCandidatesForTerms(terms) {
  const candidates = [];
  const seen = new Set();

  for (const term of [...new Set(terms)].slice(0, 4)) {
    try {
      const rows = publicSearchTipCandidates(await partGrade.searchTips(term));
      for (const row of rows) {
        const key = [row.brand, row.article].map((x) => String(x || "").trim().toUpperCase()).join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(row);
        if (candidates.length >= 20) return candidates;
      }
    } catch (_error) {
      // AI search must stay usable even when supplier tips do not support a natural-language term.
    }
  }

  return candidates;
}

app.post("/api/ai/search", aiLimiter, async (req, res, next) => {
  try {
    const query = String(req.body?.query || "").trim().slice(0, 500);
    const vehicle = safeVehicleContext(req.body?.vehicle);

    if (!query) return res.status(400).json({ error: "search_query_required" });

    if (looksLikeVin(query)) {
      return res.json({
        ai: false,
        mode: "vin",
        query,
        vehicle,
        intent: {
          kind: "vin",
          article: "",
          normalized_query: query.toUpperCase(),
          part_name: "",
          position: "",
          search_terms: [],
          assistant_text: "VIN распознан. ZapFormat не будет придумывать совместимость: выберите автомобиль в гараже и укажите нужную деталь.",
          needs_article: true,
          confidence: 1
        },
        candidates: []
      });
    }

    if (looksLikeArticle(query)) {
      return res.json({
        ai: false,
        mode: "article",
        query,
        vehicle,
        intent: {
          kind: "article",
          article: query,
          normalized_query: query,
          part_name: "",
          position: "",
          search_terms: [],
          assistant_text: "",
          needs_article: false,
          confidence: 1
        },
        candidates: []
      });
    }

    if (!aiConfigured()) {
      return res.status(503).json({ error: "ai_not_configured" });
    }

    const intent = await interpretSearch({ query, vehicle });

    if (intent.article) {
      return res.json({
        ai: true,
        mode: "article",
        query,
        vehicle,
        intent,
        candidates: []
      });
    }

    const terms = [
      intent.part_name,
      intent.normalized_query,
      ...intent.search_terms
    ].map((x) => String(x || "").trim()).filter(Boolean);

    const candidates = await supplierCandidatesForTerms(terms);

    res.json({
      ai: true,
      mode: candidates.length ? "candidates" : intent.kind,
      query,
      vehicle,
      intent,
      candidates
    });
  } catch (error) {
    next(error);
  }
});

function normalizeSupplierRows(value) {
  if (Array.isArray(value)) return value;
  return value && typeof value === "object" ? Object.values(value) : [];
}

function supplierOfferRef(row, fallback = {}) {
  const parts = [
    row?.brand ?? fallback.brand ?? "",
    row?.number ?? fallback.number ?? "",
    row?.supplierCode ?? row?.supplier ?? "",
    row?.itemKey ?? row?.itemId ?? row?.id ?? "",
    row?.warehouse ?? row?.warehouseCode ?? "",
    row?.packing ?? ""
  ];
  return crypto.createHash("sha256").update(parts.map((x) => String(x)).join("|")).digest("hex").slice(0, 24);
}

function publicSupplierOffer(row, fallback = {}) {
  const price = customerPrice(row?.price);
  if (price === null) return null;
  return {
    offer_ref: supplierOfferRef(row, fallback),
    brand: row?.brand || fallback.brand || null,
    article: row?.number || fallback.number || null,
    article_normalized: row?.numberFix || null,
    description: row?.description || null,
    availability: Number(row?.availability || 0),
    packing: Math.max(1, Number(row?.packing || 1)),
    delivery_hours: Number(row?.deliveryPeriod || 0),
    delivery_hours_max: Number(row?.deliveryPeriodMax || row?.deliveryPeriod || 0),
    delivery_probability: row?.deliveryProbability ?? null,
    returnable: row?.noReturn ? false : true,
    price,
    currency: "RUB"
  };
}

async function supplierRowsForOffer(number, brand) {
  try {
    const rows = await partGrade.searchArticles(number, brand);
    return { mode: "articles", rows: normalizeSupplierRows(rows) };
  } catch (error) {
    if (error instanceof PartGradeError && Number(error.upstreamCode) === 103) {
      const rows = await partGrade.searchBatch([{ number, brand }]);
      return { mode: "batch", rows: normalizeSupplierRows(rows) };
    }
    throw error;
  }
}

async function resolveRequestedOffers(requested = []) {
  const groups = new Map();
  const normalized = [];

  for (const [index, item] of requested.entries()) {
    const article = String(item?.article || "").trim();
    const brand = String(item?.brand || "").trim();
    const offerRef = String(item?.offer_ref || "").trim();
    const clientId = String(item?.client_id || index).slice(0, 160);
    const quantity = Math.max(1, Math.min(999, Number(item?.quantity || 1)));

    if (!article || !brand || !offerRef) {
      normalized.push({ client_id: clientId, found: false, reason: "invalid_item" });
      continue;
    }

    const key = (brand + "|" + article).toUpperCase();
    if (!groups.has(key)) groups.set(key, { article, brand, items: [] });
    groups.get(key).items.push({ clientId, offerRef, quantity });
  }

  const output = [...normalized];

  for (const group of groups.values()) {
    const supplier = await supplierRowsForOffer(group.article, group.brand);
    const offers = supplier.rows
      .map((row) => publicSupplierOffer(row, { number: group.article, brand: group.brand }))
      .filter(Boolean);
    const byRef = new Map(offers.map((offer) => [offer.offer_ref, offer]));

    for (const item of group.items) {
      const match = byRef.get(item.offerRef);
      output.push(match
        ? {
            client_id: item.clientId,
            found: true,
            quantity: item.quantity,
            ...match
          }
        : {
            client_id: item.clientId,
            found: false,
            quantity: item.quantity,
            offer_ref: item.offerRef,
            reason: "offer_missing"
          });
    }
  }

  return output;
}

app.get("/api/catalog/offers", async (req, res, next) => {
  try {
    const number = String(req.query?.number || "").trim();
    const brand = String(req.query?.brand || "").trim();

    if (!number || !brand) {
      return res.status(400).json({ error: "article_and_brand_required" });
    }

    const supplier = await supplierRowsForOffer(number, brand);
    const offers = supplier.rows
      .map((row) => publicSupplierOffer(row, { number, brand }))
      .filter(Boolean)
      .sort((a, b) => a.price - b.price || a.delivery_hours - b.delivery_hours);

    res.json({
      query: { number, brand },
      offers
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/catalog/recheck", async (req, res, next) => {
  try {
    const requested = Array.isArray(req.body?.items) ? req.body.items.slice(0, 30) : [];
    if (!requested.length) return res.status(400).json({ error: "items_required" });

    const items = await resolveRequestedOffers(requested);
    res.json({ checked_at: new Date().toISOString(), items });
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

app.post("/api/auth/logout-others", requireUser, async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    const currentHash = token ? tokenHash(token) : "";
    const result = await pool.query(
      `DELETE FROM user_sessions
        WHERE user_id = $1
          AND token_hash <> $2
        RETURNING id`,
      [req.user.id, currentHash]
    );
    res.json({ revoked: result.rowCount });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/account/password", requireUser, authLimiter, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.current_password || "");
    const newPassword = String(req.body?.new_password || "");
    if (!currentPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "invalid_password_change" });
    }

    const userResult = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1 LIMIT 1",
      [req.user.id]
    );
    const hash = userResult.rows[0]?.password_hash;
    if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
      return res.status(401).json({ error: "invalid_current_password" });
    }

    const nextHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      "UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1",
      [req.user.id, nextHash]
    );

    const token = req.cookies?.[COOKIE_NAME];
    const currentHash = token ? tokenHash(token) : "";
    await pool.query(
      `DELETE FROM user_sessions
        WHERE user_id = $1
          AND token_hash <> $2`,
      [req.user.id, currentHash]
    );

    res.status(204).end();
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
    const [orders, vehicles, returns, requests] = await Promise.all([
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
      ),
      pool.query(
        "SELECT count(*)::int AS count FROM quote_requests WHERE user_id = $1 AND status NOT IN ('completed','cancelled')",
        [req.user.id]
      )
    ]);

    res.json({
      user: publicUser(req.user),
      stats: {
        active_orders: orders.rows[0].active + requests.rows[0].count,
        ready_orders: orders.rows[0].ready,
        quote_requests: requests.rows[0].count,
        vehicles: vehicles.rows[0].count,
        active_returns: returns.rows[0].count
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/account/requests", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT q.id, q.status, q.name, q.phone, q.created_at,
              count(i.id)::int AS items_count,
              COALESCE(sum(CASE WHEN i.quoted_price IS NULL THEN 0 ELSE i.quoted_price * i.quantity END),0)::numeric(14,2) AS quoted_total,
              bool_or(i.needs_confirmation) AS needs_confirmation
         FROM quote_requests q
         LEFT JOIN quote_request_items i ON i.request_id = q.id
        WHERE q.user_id = $1
        GROUP BY q.id
        ORDER BY q.created_at DESC
        LIMIT 100`,
      [req.user.id]
    );
    res.json({ requests: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/account/requests/:requestId", requireUser, async (req, res, next) => {
  try {
    const request = await pool.query(
      `SELECT * FROM quote_requests WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [req.params.requestId, req.user.id]
    );
    if (!request.rowCount) return res.status(404).json({ error: "request_not_found" });

    const items = await pool.query(
      `SELECT brand, article, description, quantity, comment, quoted_price, needs_confirmation
         FROM quote_request_items
        WHERE request_id = $1
        ORDER BY created_at ASC`,
      [req.params.requestId]
    );
    res.json({ request: request.rows[0], items: items.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/account/quote-requests", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
          q.id,
          q.status,
          q.fulfillment_method,
          q.payment_method,
          q.verified_total,
          q.created_at,
          q.updated_at,
          count(i.id)::int AS item_count,
          COALESCE(sum(i.quoted_price * i.quantity), 0) AS quoted_total
       FROM quote_requests q
       LEFT JOIN quote_request_items i ON i.request_id = q.id
       WHERE q.user_id = $1
       GROUP BY q.id
       ORDER BY q.created_at DESC
       LIMIT 100`,
      [req.user.id]
    );

    res.json({
      requests: result.rows.map((row) => ({
        id: row.id,
        status: row.status,
        fulfillment_method: row.fulfillment_method,
        payment_method: row.payment_method,
        verified_total: row.verified_total === null ? null : Number(row.verified_total),
        item_count: row.item_count,
        quoted_total: Number(row.quoted_total || 0),
        created_at: row.created_at,
        updated_at: row.updated_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/account/quote-requests/:requestId", requireUser, async (req, res, next) => {
  try {
    const requestResult = await pool.query(
      `SELECT id, status, name, phone, fulfillment_method, pickup_point_id,
              delivery_address_id, recipient_name, recipient_phone, payment_method,
              customer_comment, verified_total, delivery_fee, vehicle_id,
              created_at, updated_at
         FROM quote_requests
        WHERE id = $1 AND user_id = $2
        LIMIT 1`,
      [req.params.requestId, req.user.id]
    );
    const request = requestResult.rows[0];
    if (!request) return res.status(404).json({ error: "quote_request_not_found" });

    const itemsResult = await pool.query(
      `SELECT id, brand, article, description, quantity, comment,
              quoted_price, needs_confirmation, created_at
         FROM quote_request_items
        WHERE request_id = $1
        ORDER BY created_at, id`,
      [request.id]
    );

    res.json({
      request,
      items: itemsResult.rows.map((row) => ({
        ...row,
        quoted_price: row.quoted_price === null ? null : Number(row.quoted_price)
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/account/notifications", requireUser, async (req, res, next) => {
  try {
    await pool.query(
      "INSERT INTO user_notification_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
      [req.user.id]
    );
    const result = await pool.query(
      `SELECT order_status, item_changes, returns, marketing, updated_at
         FROM user_notification_settings
        WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ settings: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/account/notifications", requireUser, async (req, res, next) => {
  try {
    const keys = ["order_status", "item_changes", "returns", "marketing"];
    const current = await pool.query(
      `SELECT order_status, item_changes, returns, marketing
         FROM user_notification_settings
        WHERE user_id = $1`,
      [req.user.id]
    );
    const value = current.rows[0] || {
      order_status: true,
      item_changes: true,
      returns: true,
      marketing: false
    };
    for (const key of keys) {
      if (req.body?.[key] !== undefined) value[key] = Boolean(req.body[key]);
    }
    const result = await pool.query(
      `INSERT INTO user_notification_settings
        (user_id, order_status, item_changes, returns, marketing, updated_at)
       VALUES ($1,$2,$3,$4,$5,now())
       ON CONFLICT (user_id) DO UPDATE SET
         order_status = EXCLUDED.order_status,
         item_changes = EXCLUDED.item_changes,
         returns = EXCLUDED.returns,
         marketing = EXCLUDED.marketing,
         updated_at = now()
       RETURNING order_status, item_changes, returns, marketing, updated_at`,
      [
        req.user.id,
        value.order_status,
        value.item_changes,
        value.returns,
        value.marketing
      ]
    );
    res.json({ settings: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/account/addresses", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, label, city, address, recipient_name, recipient_phone,
              is_default, created_at, updated_at
         FROM user_addresses
        WHERE user_id = $1
        ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );
    res.json({ addresses: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/account/addresses", requireUser, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const city = String(req.body?.city || "").trim();
    const address = String(req.body?.address || "").trim();
    const label = String(req.body?.label || "").trim() || null;
    const recipientName = String(req.body?.recipient_name || "").trim() || null;
    const recipientPhone = normalizePhone(req.body?.recipient_phone);
    const isDefault = Boolean(req.body?.is_default);

    if (!city || !address) return res.status(400).json({ error: "city_and_address_required" });

    await client.query("BEGIN");
    if (isDefault) {
      await client.query("UPDATE user_addresses SET is_default = false WHERE user_id = $1", [req.user.id]);
    }
    const result = await client.query(
      `INSERT INTO user_addresses
        (user_id, label, city, address, recipient_name, recipient_phone, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [req.user.id, label, city, address, recipientName, recipientPhone, isDefault]
    );
    await client.query("COMMIT");
    res.status(201).json({ address: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.patch("/api/account/addresses/:addressId", requireUser, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const current = await client.query(
      "SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2 LIMIT 1",
      [req.params.addressId, req.user.id]
    );
    const row = current.rows[0];
    if (!row) return res.status(404).json({ error: "address_not_found" });

    const city = req.body?.city === undefined ? row.city : String(req.body.city || "").trim();
    const address = req.body?.address === undefined ? row.address : String(req.body.address || "").trim();
    const label = req.body?.label === undefined ? row.label : String(req.body.label || "").trim() || null;
    const recipientName = req.body?.recipient_name === undefined
      ? row.recipient_name
      : String(req.body.recipient_name || "").trim() || null;
    const recipientPhone = req.body?.recipient_phone === undefined
      ? row.recipient_phone
      : normalizePhone(req.body.recipient_phone);
    const isDefault = req.body?.is_default === undefined ? row.is_default : Boolean(req.body.is_default);

    if (!city || !address) return res.status(400).json({ error: "city_and_address_required" });

    await client.query("BEGIN");
    if (isDefault) {
      await client.query(
        "UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND id <> $2",
        [req.user.id, req.params.addressId]
      );
    }
    const result = await client.query(
      `UPDATE user_addresses
          SET label = $3, city = $4, address = $5, recipient_name = $6,
              recipient_phone = $7, is_default = $8, updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
      [req.params.addressId, req.user.id, label, city, address, recipientName, recipientPhone, isDefault]
    );
    await client.query("COMMIT");
    res.json({ address: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.delete("/api/account/addresses/:addressId", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.addressId, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "address_not_found" });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

function checkoutPaymentMethods() {
  return [{
    code: "after_confirmation",
    label: "После подтверждения",
    description: "Сначала ZapFormat повторно проверяет цену и наличие. Оплата подключается после подтверждения заявки.",
    online: false
  }];
}

function checkoutFulfillmentMethods({ hasAddresses, hasPickupPoints }) {
  const methods = [];
  if (hasPickupPoints) {
    methods.push({
      code: "pickup",
      label: "Самовывоз",
      description: "Выберите доступный пункт выдачи.",
      ready: true
    });
  }
  methods.push({
    code: "delivery",
    label: "Доставка",
    description: hasAddresses
      ? "Используйте сохранённый адрес. Стоимость и точный способ доставки подтверждаются отдельно."
      : "Добавьте адрес получения. Стоимость и точный способ доставки подтверждаются отдельно.",
    ready: hasAddresses
  });
  methods.push({
    code: "confirmation",
    label: "Согласовать получение",
    description: "Менеджер согласует способ получения после проверки товаров.",
    ready: true
  });
  return methods;
}

async function checkoutOptionsForUser(user) {
  const [addressesResult, pickupResult, vehiclesResult] = await Promise.all([
    pool.query(
      `SELECT id, label, city, address, recipient_name, recipient_phone, is_default
         FROM user_addresses
        WHERE user_id = $1
        ORDER BY is_default DESC, created_at DESC`,
      [user.id]
    ),
    pool.query(
      `SELECT id, code, city, name, address
         FROM pickup_points
        WHERE is_active = true
        ORDER BY city, name`
    ),
    pool.query(
      `SELECT id, brand, model, generation, year, engine, vin, is_default
         FROM vehicles
        WHERE user_id = $1
        ORDER BY is_default DESC, created_at ASC`,
      [user.id]
    )
  ]);

  const addresses = addressesResult.rows;
  const pickupPoints = pickupResult.rows;
  const vehicles = vehiclesResult.rows;

  return {
    customer: publicUser(user),
    addresses,
    pickup_points: pickupPoints,
    vehicles,
    fulfillment_methods: checkoutFulfillmentMethods({
      hasAddresses: addresses.length > 0,
      hasPickupPoints: pickupPoints.length > 0
    }),
    payment_methods: checkoutPaymentMethods(),
    online_payment_enabled: false,
    logistics_pricing_enabled: false
  };
}

async function verifyCheckoutItems(rawItems) {
  if (!rawItems.length) {
    const error = new Error("items_required");
    error.code = "items_required";
    throw error;
  }

  const verified = await resolveRequestedOffers(
    rawItems.map((item, index) => ({
      client_id: String(item?.client_id || index),
      brand: item?.brand,
      article: item?.article,
      offer_ref: item?.offer_ref,
      quantity: item?.quantity
    }))
  );

  const unavailable = verified.filter((item) =>
    !item.found ||
    Number(item.availability || 0) < Number(item.quantity || 1) ||
    Number(item.quantity || 1) % Math.max(1, Number(item.packing || 1)) !== 0
  );

  if (unavailable.length) {
    const error = new Error("cart_changed");
    error.code = "cart_changed";
    error.items = verified;
    throw error;
  }

  const rawById = new Map(
    rawItems.map((item, index) => [String(item?.client_id || index), item])
  );

  return verified.map((offer) => {
    const raw = rawById.get(offer.client_id) || {};
    return {
      client_id: offer.client_id,
      brand: offer.brand,
      article: offer.article,
      description: String(raw.description || offer.description || "").trim().slice(0, 300) || null,
      quantity: Number(offer.quantity || 1),
      comment: String(raw.comment || "").trim().slice(0, 500) || null,
      quoted_price: Number(offer.price || 0),
      offer_ref: offer.offer_ref,
      returnable: offer.returnable,
      delivery_hours: offer.delivery_hours,
      availability: Number(offer.availability || 0),
      packing: Math.max(1, Number(offer.packing || 1)),
      needs_confirmation: false
    };
  });
}

async function userCartId(userId, client = pool) {
  const result = await client.query(
    `INSERT INTO carts (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = carts.updated_at
     RETURNING id`,
    [userId]
  );
  return result.rows[0].id;
}

app.get("/api/cart", requireUser, async (req, res, next) => {
  try {
    const cartId = await userCartId(req.user.id);
    const result = await pool.query(
      `SELECT id, article, brand, description, delivery_days, delivery_hours, quantity,
              available_quantity, unit_price, offer_ref, delivery_hours_max, packing,
              returnable, price_checked_at, created_at, updated_at
         FROM cart_items
        WHERE cart_id = $1
        ORDER BY created_at, id`,
      [cartId]
    );
    res.json({
      items: result.rows.map((row) => ({
        id: row.id,
        article: row.article,
        brand: row.brand,
        description: row.description,
        delivery_hours: Number(row.delivery_hours ?? (Number(row.delivery_days || 0) * 24)),
        delivery_hours_max: Number(row.delivery_hours_max || 0),
        quantity: row.quantity,
        availability: Number(row.available_quantity || 0),
        price: Number(row.unit_price || 0),
        offer_ref: row.offer_ref,
        packing: Math.max(1, Number(row.packing || 1)),
        returnable: row.returnable,
        checked_at: row.price_checked_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.put("/api/cart", requireUser, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const requested = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
    if (!requested.length) {
      const cartId = await userCartId(req.user.id, client);
      await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);
      return res.json({ items: [], checked_at: new Date().toISOString() });
    }

    const verified = await resolveRequestedOffers(
      requested.map((item, index) => ({
        client_id: String(item?.client_id || index),
        brand: item?.brand,
        article: item?.article,
        offer_ref: item?.offer_ref,
        quantity: item?.quantity
      }))
    );
    const unavailable = verified.filter((item) =>
      !item.found ||
      Number(item.availability || 0) < Number(item.quantity || 1) ||
      Number(item.quantity || 1) % Math.max(1, Number(item.packing || 1)) !== 0
    );
    if (unavailable.length) {
      return res.status(409).json({ error: "cart_changed", items: verified });
    }

    const now = new Date();
    await client.query("BEGIN");
    const cartId = await userCartId(req.user.id, client);
    await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);

    for (const item of verified) {
      await client.query(
        `INSERT INTO cart_items
          (cart_id, article, brand, description, delivery_days, delivery_hours, quantity,
           available_quantity, unit_price, offer_ref, delivery_hours_max, packing,
           returnable, price_checked_at, checked_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)`,
        [
          cartId,
          item.article,
          item.brand,
          item.description,
          Math.max(0, Math.ceil(Number(item.delivery_hours || 0) / 24)),
          item.delivery_hours,
          item.quantity,
          item.availability,
          item.price,
          item.offer_ref,
          item.delivery_hours_max,
          Math.max(1, Number(item.packing || 1)),
          item.returnable,
          now
        ]
      );
    }

    await client.query("UPDATE carts SET updated_at = now() WHERE id = $1", [cartId]);
    await client.query("COMMIT");

    res.json({
      checked_at: now.toISOString(),
      items: verified.map((item) => ({
        client_id: item.client_id,
        article: item.article,
        brand: item.brand,
        description: item.description,
        quantity: item.quantity,
        availability: item.availability,
        price: item.price,
        offer_ref: item.offer_ref,
        delivery_hours: item.delivery_hours,
        delivery_hours_max: item.delivery_hours_max,
        packing: Math.max(1, Number(item.packing || 1)),
        returnable: item.returnable
      }))
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.get("/api/checkout/options", requireUser, async (req, res, next) => {
  try {
    res.json(await checkoutOptionsForUser(req.user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/checkout/submit", requireUser, quoteLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const rawItems = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
    const fulfillmentMethod = String(req.body?.fulfillment_method || "confirmation");
    const paymentMethod = String(req.body?.payment_method || "after_confirmation");
    const deliveryAddressId = req.body?.delivery_address_id ? String(req.body.delivery_address_id) : null;
    const pickupPointId = req.body?.pickup_point_id ? String(req.body.pickup_point_id) : null;
    const vehicleId = req.body?.vehicle_id ? String(req.body.vehicle_id) : null;
    const customerComment = String(req.body?.comment || "").trim().slice(0, 1200) || null;
    const recipientName = String(req.body?.recipient_name || req.user.name || "").trim().slice(0, 160);
    const recipientPhone = normalizePhone(req.body?.recipient_phone || req.user.phone);

    if (!["delivery", "pickup", "confirmation"].includes(fulfillmentMethod)) {
      return res.status(400).json({ error: "invalid_fulfillment_method" });
    }
    if (paymentMethod !== "after_confirmation") {
      return res.status(400).json({ error: "payment_method_unavailable" });
    }
    if (!recipientName) return res.status(400).json({ error: "recipient_name_required" });
    if (!recipientPhone || recipientPhone.replace(/\D/g, "").length < 10) {
      return res.status(400).json({ error: "recipient_phone_required" });
    }

    let deliveryAddress = null;
    let pickupPoint = null;
    let vehicle = null;

    if (fulfillmentMethod === "delivery") {
      if (!deliveryAddressId) return res.status(400).json({ error: "delivery_address_required" });
      const result = await pool.query(
        `SELECT id, city, address, recipient_name, recipient_phone
           FROM user_addresses
          WHERE id = $1 AND user_id = $2
          LIMIT 1`,
        [deliveryAddressId, req.user.id]
      );
      deliveryAddress = result.rows[0] || null;
      if (!deliveryAddress) return res.status(404).json({ error: "delivery_address_not_found" });
    }

    if (fulfillmentMethod === "pickup") {
      if (!pickupPointId) return res.status(400).json({ error: "pickup_point_required" });
      const result = await pool.query(
        `SELECT id, code, city, name, address
           FROM pickup_points
          WHERE id = $1 AND is_active = true
          LIMIT 1`,
        [pickupPointId]
      );
      pickupPoint = result.rows[0] || null;
      if (!pickupPoint) return res.status(404).json({ error: "pickup_point_not_found" });
    }

    if (vehicleId) {
      const result = await pool.query(
        `SELECT id, brand, model, generation, year, engine, vin
           FROM vehicles
          WHERE id = $1 AND user_id = $2
          LIMIT 1`,
        [vehicleId, req.user.id]
      );
      vehicle = result.rows[0] || null;
      if (!vehicle) return res.status(404).json({ error: "vehicle_not_found" });
    }

    const items = await verifyCheckoutItems(rawItems);
    const verifiedTotal = Number(
      items.reduce((sum, item) => sum + item.quoted_price * item.quantity, 0).toFixed(2)
    );
    const now = new Date();
    const requestId =
      "Q-" +
      now.toISOString().slice(0, 10).replace(/-/g, "") +
      "-" +
      crypto.randomBytes(3).toString("hex").toUpperCase();

    await client.query("BEGIN");
    await client.query(
      `INSERT INTO quote_requests
        (id, user_id, name, phone, status, source, created_at,
         fulfillment_method, pickup_point_id, delivery_address_id,
         recipient_name, recipient_phone, payment_method, customer_comment,
         verified_total, delivery_fee, vehicle_id, checkout_version)
       VALUES
        ($1,$2,$3,$4,'new','zapformat-checkout',$5,
         $6,$7,$8,$9,$10,$11,$12,$13,NULL,$14,1)`,
      [
        requestId,
        req.user.id,
        [req.user.name, req.user.surname].filter(Boolean).join(" "),
        recipientPhone,
        now,
        fulfillmentMethod,
        pickupPoint?.id || null,
        deliveryAddress?.id || null,
        recipientName,
        recipientPhone,
        paymentMethod,
        customerComment,
        verifiedTotal,
        vehicle?.id || null
      ]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO quote_request_items
          (request_id, brand, article, description, quantity, comment,
           quoted_price, needs_confirmation, offer_ref, returnable,
           delivery_hours, availability, price_checked_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          requestId,
          item.brand,
          item.article,
          item.description,
          item.quantity,
          item.comment,
          item.quoted_price,
          item.needs_confirmation,
          item.offer_ref,
          item.returnable,
          item.delivery_hours,
          item.availability,
          now
        ]
      );
    }

    const cartResult = await client.query("SELECT id FROM carts WHERE user_id = $1 LIMIT 1", [req.user.id]);
    if (cartResult.rowCount) {
      await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cartResult.rows[0].id]);
      await client.query("UPDATE carts SET updated_at = now() WHERE id = $1", [cartResult.rows[0].id]);
    }

    await client.query(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES ($1,'checkout','Заявка принята',$2)`,
      [req.user.id, "Заявка " + requestId + " создана после повторной проверки цены и наличия."]
    );

    await client.query("COMMIT");

    res.status(201).json({
      ok: true,
      request_id: requestId,
      status: "new",
      verified_total: verifiedTotal,
      delivery_fee: null,
      fulfillment_method: fulfillmentMethod,
      payment_method: paymentMethod,
      pickup_point: pickupPoint,
      delivery_address: deliveryAddress,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            generation: vehicle.generation,
            year: vehicle.year,
            engine: vehicle.engine
          }
        : null,
      items: items.length,
      checked_at: now.toISOString(),
      next_step: "confirmation"
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error?.code === "items_required") {
      return res.status(400).json({ error: "items_required" });
    }
    if (error?.code === "cart_changed") {
      return res.status(409).json({ error: "cart_changed", items: error.items || [] });
    }
    next(error);
  } finally {
    client.release();
  }
});

app.get("/api/orders", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
          o.id,
          o.order_number,
          o.status,
          o.total_amount,
          o.currency,
          o.comment,
          o.created_at,
          o.updated_at,
          count(oi.id)::int AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT 100`,
      [req.user.id]
    );

    res.json({
      orders: result.rows.map((row) => ({
        id: row.id,
        order_number: row.order_number,
        status: row.status,
        total_amount: Number(row.total_amount || 0),
        currency: row.currency,
        comment: row.comment,
        item_count: row.item_count,
        created_at: row.created_at,
        updated_at: row.updated_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/orders/:orderId", requireUser, async (req, res, next) => {
  try {
    const orderResult = await pool.query(
      `SELECT id, order_number, status, total_amount, currency, comment,
              recipient_name, recipient_phone, created_at, updated_at
         FROM orders
        WHERE id = $1 AND user_id = $2
        LIMIT 1`,
      [req.params.orderId, req.user.id]
    );
    const order = orderResult.rows[0];
    if (!order) return res.status(404).json({ error: "order_not_found" });

    const [itemsResult, historyResult] = await Promise.all([
      pool.query(
        `SELECT id, article, brand, description, warehouse, delivery_days,
                quantity, unit_price, returnable, status, supplier_status, expected_at,
                received_at, created_at, updated_at
           FROM order_items
          WHERE order_id = $1
          ORDER BY created_at, id`,
        [order.id]
      ),
      pool.query(
        `SELECT id, order_id, order_item_id, status, source, note, created_at
           FROM order_status_history
          WHERE order_id = $1
             OR order_item_id IN (SELECT id FROM order_items WHERE order_id = $1)
          ORDER BY created_at`,
        [order.id]
      )
    ]);

    res.json({
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: Number(order.total_amount || 0),
        currency: order.currency,
        comment: order.comment,
        recipient_name: order.recipient_name,
        recipient_phone: order.recipient_phone,
        created_at: order.created_at,
        updated_at: order.updated_at
      },
      items: itemsResult.rows.map((row) => ({
        ...row,
        unit_price: Number(row.unit_price || 0)
      })),
      history: historyResult.rows
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/returns", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
          r.id,
          r.return_number,
          r.quantity,
          r.reason,
          r.comment,
          r.status,
          r.created_at,
          r.updated_at,
          oi.article,
          oi.brand,
          oi.description,
          oi.unit_price,
          o.order_number
       FROM returns r
       JOIN order_items oi ON oi.id = r.order_item_id
       JOIN orders o ON o.id = oi.order_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json({
      returns: result.rows.map((row) => ({
        ...row,
        unit_price: Number(row.unit_price || 0)
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/returns", requireUser, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const orderItemId = String(req.body?.order_item_id || "");
    const quantity = Math.max(1, Math.min(999, Number(req.body?.quantity || 1)));
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    const comment = String(req.body?.comment || "").trim().slice(0, 1000) || null;

    if (!orderItemId || !reason || !Number.isInteger(quantity)) {
      return res.status(400).json({ error: "return_data_required" });
    }

    await client.query("BEGIN");
    const itemResult = await client.query(
      `SELECT oi.id, oi.quantity, oi.returnable, oi.status, o.id AS order_id
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE oi.id = $1 AND o.user_id = $2
        FOR UPDATE`,
      [orderItemId, req.user.id]
    );
    const item = itemResult.rows[0];
    if (!item) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "order_item_not_found" });
    }
    if (item.returnable === false) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "item_not_returnable" });
    }

    const usedResult = await client.query(
      `SELECT COALESCE(sum(quantity),0)::int AS used
         FROM returns
        WHERE order_item_id = $1
          AND status NOT IN ('rejected','cancelled')`,
      [orderItemId]
    );
    const remaining = Number(item.quantity || 0) - Number(usedResult.rows[0]?.used || 0);
    if (quantity > remaining) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "return_quantity_exceeded", remaining });
    }

    const result = await client.query(
      `INSERT INTO returns (user_id, order_item_id, quantity, reason, comment)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [req.user.id, orderItemId, quantity, reason, comment]
    );

    await client.query(
      `INSERT INTO order_status_history (order_id, order_item_id, status, source, note)
       VALUES ($1,$2,'return_created','zapformat',$3)`,
      [item.order_id, orderItemId, "Запрос на возврат создан"]
    );

    await client.query("COMMIT");
    res.status(201).json({ return: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.get("/api/internal/vin-requests", requireInternal, requireDatabase, async (req, res, next) => {
  try {
    const status = String(req.query?.status || "").trim();
    const limit = Math.max(1, Math.min(200, Number(req.query?.limit || 100)));
    const params = [];
    let where = "";
    if (status) {
      params.push(status);
      where = "WHERE vr.status = $1";
    }
    params.push(limit);
    const limitParam = "$" + params.length;

    const result = await pool.query(
      `SELECT
          vr.id, vr.user_id, vr.vehicle_id, vr.vin, vr.request_text,
          vr.status, vr.manager_note, vr.created_at, vr.updated_at,
          v.brand, v.model, v.generation, v.year, v.engine,
          u.name AS user_name, u.phone AS user_phone, u.email AS user_email
       FROM vin_requests vr
       LEFT JOIN vehicles v ON v.id = vr.vehicle_id
       JOIN users u ON u.id = vr.user_id
       ${where}
       ORDER BY
         CASE vr.status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
         vr.created_at ASC
       LIMIT ${limitParam}`,
      params
    );
    res.json({ requests: result.rows });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/internal/vin-requests/:requestId", requireInternal, requireDatabase, async (req, res, next) => {
  try {
    const allowed = new Set(["new", "in_progress", "answered", "closed", "cancelled"]);
    const status = req.body?.status === undefined ? null : String(req.body.status);
    const managerNote = req.body?.manager_note === undefined
      ? undefined
      : String(req.body.manager_note || "").trim().slice(0, 3000) || null;

    if (status !== null && !allowed.has(status)) {
      return res.status(400).json({ error: "invalid_vin_request_status" });
    }

    const current = await pool.query(
      "SELECT status, manager_note FROM vin_requests WHERE id = $1 LIMIT 1",
      [req.params.requestId]
    );
    if (!current.rowCount) return res.status(404).json({ error: "vin_request_not_found" });

    const result = await pool.query(
      `UPDATE vin_requests
          SET status = $2,
              manager_note = $3,
              updated_at = now()
        WHERE id = $1
        RETURNING *`,
      [
        req.params.requestId,
        status ?? current.rows[0].status,
        managerNote === undefined ? current.rows[0].manager_note : managerNote
      ]
    );
    res.json({ request: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/vin-requests", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
          vr.id,
          vr.vehicle_id,
          vr.vin,
          vr.request_text,
          vr.status,
          vr.manager_note,
          vr.created_at,
          vr.updated_at,
          v.brand,
          v.model,
          v.generation,
          v.year,
          v.engine
       FROM vin_requests vr
       LEFT JOIN vehicles v ON v.id = vr.vehicle_id
       WHERE vr.user_id = $1
       ORDER BY vr.created_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json({ requests: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/vin-requests", requireUser, async (req, res, next) => {
  try {
    const vehicleId = req.body?.vehicle_id ? String(req.body.vehicle_id) : null;
    const requestText = String(req.body?.request_text || "").trim().slice(0, 1200);

    if (!requestText) {
      return res.status(400).json({ error: "request_text_required" });
    }

    let vehicle = null;
    if (vehicleId) {
      const vehicleResult = await pool.query(
        `SELECT id, brand, model, generation, year, engine, vin
           FROM vehicles
          WHERE id = $1 AND user_id = $2
          LIMIT 1`,
        [vehicleId, req.user.id]
      );
      vehicle = vehicleResult.rows[0] || null;
      if (!vehicle) return res.status(404).json({ error: "vehicle_not_found" });
    }

    const vin = String(req.body?.vin || vehicle?.vin || "").trim().toUpperCase() || null;
    if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      return res.status(400).json({ error: "invalid_vin" });
    }

    if (!vin) {
      return res.status(400).json({ error: "vin_required" });
    }

    const result = await pool.query(
      `INSERT INTO vin_requests (user_id, vehicle_id, vin, request_text)
       VALUES ($1,$2,$3,$4)
       RETURNING id, vehicle_id, vin, request_text, status, created_at, updated_at`,
      [req.user.id, vehicle?.id || null, vin, requestText]
    );

    res.status(201).json({
      request: {
        ...result.rows[0],
        vehicle: vehicle
          ? {
              brand: vehicle.brand,
              model: vehicle.model,
              generation: vehicle.generation,
              year: vehicle.year,
              engine: vehicle.engine
            }
          : null
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/vin-requests/:requestId", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
          vr.id,
          vr.vehicle_id,
          vr.vin,
          vr.request_text,
          vr.status,
          vr.manager_note,
          vr.created_at,
          vr.updated_at,
          v.brand,
          v.model,
          v.generation,
          v.year,
          v.engine
       FROM vin_requests vr
       LEFT JOIN vehicles v ON v.id = vr.vehicle_id
       WHERE vr.id = $1 AND vr.user_id = $2
       LIMIT 1`,
      [req.params.requestId, req.user.id]
    );
    const request = result.rows[0];
    if (!request) return res.status(404).json({ error: "vin_request_not_found" });
    res.json({ request });
  } catch (error) {
    next(error);
  }
});

app.get("/api/garage", requireUser, async (req, res, next) => {
  try {
    const vehicles = await pool.query(
      `SELECT id, brand, model, generation, year, engine, vin, plate_number,
              current_mileage, mileage_updated_at, is_default
         FROM vehicles
        WHERE user_id = $1
        ORDER BY is_default DESC, created_at ASC`,
      [req.user.id]
    );
    res.json({ vehicles: vehicles.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/garage/vehicles", requireUser, async (req, res, next) => {
  try {
    const brand = String(req.body?.brand || "").trim();
    const model = String(req.body?.model || "").trim();
    const generation = String(req.body?.generation || "").trim() || null;
    const engine = String(req.body?.engine || "").trim() || null;
    const vin = String(req.body?.vin || "").trim().toUpperCase() || null;
    const plate = String(req.body?.plate_number || "").trim().toUpperCase() || null;
    const year = req.body?.year ? Number(req.body.year) : null;
    const mileage = req.body?.current_mileage ? Number(req.body.current_mileage) : null;

    if (!brand || !model) {
      return res.status(400).json({ error: "brand_and_model_required" });
    }

    const result = await pool.query(
      `INSERT INTO vehicles
        (user_id, brand, model, generation, year, engine, vin, plate_number, current_mileage, mileage_updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $9::int IS NULL THEN NULL ELSE now() END)
       RETURNING *`,
      [req.user.id, brand, model, generation, year, engine, vin, plate, mileage]
    );

    if (mileage !== null && Number.isFinite(mileage)) {
      await pool.query(
        `INSERT INTO vehicle_mileage_logs (vehicle_id, user_id, mileage)
         VALUES ($1,$2,$3)`,
        [result.rows[0].id, req.user.id, mileage]
      );
    }

    res.status(201).json({ vehicle: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/garage/vehicles/:vehicleId", requireUser, async (req, res, next) => {
  try {
    const vehicleResult = await pool.query(
      `SELECT * FROM vehicles WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [req.params.vehicleId, req.user.id]
    );
    const vehicle = vehicleResult.rows[0];
    if (!vehicle) return res.status(404).json({ error: "vehicle_not_found" });

    const [plans, measurements, history, reminders] = await Promise.all([
      pool.query(
        `SELECT * FROM vehicle_maintenance_plans
          WHERE vehicle_id = $1 AND user_id = $2 AND is_active = true
          ORDER BY next_service_mileage NULLS LAST, next_service_at NULLS LAST, created_at`,
        [vehicle.id, req.user.id]
      ),
      pool.query(
        `SELECT * FROM vehicle_measurements
          WHERE vehicle_id = $1 AND user_id = $2
          ORDER BY measured_at DESC LIMIT 100`,
        [vehicle.id, req.user.id]
      ),
      pool.query(
        `SELECT * FROM vehicle_maintenance_records
          WHERE vehicle_id = $1 AND user_id = $2
          ORDER BY service_date DESC, created_at DESC LIMIT 100`,
        [vehicle.id, req.user.id]
      ),
      pool.query(
        `SELECT * FROM vehicle_reminders
          WHERE vehicle_id = $1 AND user_id = $2
          ORDER BY is_done, due_at NULLS LAST, due_mileage NULLS LAST, created_at`,
        [vehicle.id, req.user.id]
      )
    ]);

    res.json({
      vehicle,
      maintenance: plans.rows,
      measurements: measurements.rows,
      history: history.rows,
      reminders: reminders.rows
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/garage/vehicles/:vehicleId", requireUser, async (req, res, next) => {
  try {
    const current = await pool.query(
      "SELECT * FROM vehicles WHERE id = $1 AND user_id = $2 LIMIT 1",
      [req.params.vehicleId, req.user.id]
    );
    const vehicle = current.rows[0];
    if (!vehicle) return res.status(404).json({ error: "vehicle_not_found" });

    const brand = req.body?.brand === undefined ? vehicle.brand : String(req.body.brand || "").trim();
    const model = req.body?.model === undefined ? vehicle.model : String(req.body.model || "").trim();
    const generation = req.body?.generation === undefined ? vehicle.generation : String(req.body.generation || "").trim() || null;
    const engine = req.body?.engine === undefined ? vehicle.engine : String(req.body.engine || "").trim() || null;
    const plate = req.body?.plate_number === undefined ? vehicle.plate_number : String(req.body.plate_number || "").trim().toUpperCase() || null;
    const vin = req.body?.vin === undefined ? vehicle.vin : String(req.body.vin || "").trim().toUpperCase() || null;
    const year = req.body?.year === undefined ? vehicle.year : (req.body.year ? Number(req.body.year) : null);

    if (!brand || !model) return res.status(400).json({ error: "brand_and_model_required" });
    if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      return res.status(400).json({ error: "invalid_vin" });
    }

    const result = await pool.query(
      `UPDATE vehicles
          SET brand = $3,
              model = $4,
              generation = $5,
              year = $6,
              engine = $7,
              vin = $8,
              plate_number = $9,
              updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
      [req.params.vehicleId, req.user.id, brand, model, generation, year, engine, vin, plate]
    );

    res.json({ vehicle: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/garage/vehicles/:vehicleId/default", requireUser, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const owned = await client.query(
      "SELECT id FROM vehicles WHERE id = $1 AND user_id = $2 LIMIT 1",
      [req.params.vehicleId, req.user.id]
    );
    if (!owned.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "vehicle_not_found" });
    }
    await client.query("UPDATE vehicles SET is_default = false WHERE user_id = $1", [req.user.id]);
    const result = await client.query(
      "UPDATE vehicles SET is_default = true, updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING *",
      [req.params.vehicleId, req.user.id]
    );
    await client.query("COMMIT");
    res.json({ vehicle: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.post("/api/garage/vehicles/:vehicleId/reminders", requireUser, async (req, res, next) => {
  try {
    const owned = await pool.query(
      "SELECT id FROM vehicles WHERE id = $1 AND user_id = $2 LIMIT 1",
      [req.params.vehicleId, req.user.id]
    );
    if (!owned.rowCount) return res.status(404).json({ error: "vehicle_not_found" });

    const title = String(req.body?.title || "").trim();
    const reminderType = String(req.body?.reminder_type || "service").trim() || "service";
    const dueMileage = req.body?.due_mileage === "" || req.body?.due_mileage == null
      ? null
      : Number(req.body.due_mileage);

    if (!title) return res.status(400).json({ error: "reminder_title_required" });
    if (dueMileage !== null && (!Number.isInteger(dueMileage) || dueMileage < 0)) {
      return res.status(400).json({ error: "invalid_due_mileage" });
    }

    const result = await pool.query(
      `INSERT INTO vehicle_reminders
        (vehicle_id, user_id, reminder_type, title, due_mileage, due_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        req.params.vehicleId,
        req.user.id,
        reminderType,
        title,
        dueMileage,
        req.body?.due_at || null
      ]
    );
    res.status(201).json({ reminder: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/garage/vehicles/:vehicleId/reminders/:reminderId", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE vehicle_reminders
          SET is_done = COALESCE($4::boolean, is_done),
              updated_at = now()
        WHERE id = $1 AND vehicle_id = $2 AND user_id = $3
        RETURNING *`,
      [
        req.params.reminderId,
        req.params.vehicleId,
        req.user.id,
        req.body?.is_done === undefined ? null : Boolean(req.body.is_done)
      ]
    );
    if (!result.rowCount) return res.status(404).json({ error: "reminder_not_found" });
    res.json({ reminder: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/garage/vehicles/:vehicleId/reminders/:reminderId", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM vehicle_reminders WHERE id = $1 AND vehicle_id = $2 AND user_id = $3 RETURNING id",
      [req.params.reminderId, req.params.vehicleId, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "reminder_not_found" });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.patch("/api/garage/vehicles/:vehicleId/mileage", requireUser, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const mileage = Number(req.body?.mileage);
    if (!Number.isInteger(mileage) || mileage < 0) {
      return res.status(400).json({ error: "invalid_mileage" });
    }

    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE vehicles
          SET current_mileage = $3, mileage_updated_at = now(), updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
      [req.params.vehicleId, req.user.id, mileage]
    );
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "vehicle_not_found" });
    }

    await client.query(
      `INSERT INTO vehicle_mileage_logs (vehicle_id, user_id, mileage)
       VALUES ($1,$2,$3)`,
      [req.params.vehicleId, req.user.id, mileage]
    );
    await client.query("COMMIT");
    res.json({ vehicle: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.post("/api/garage/vehicles/:vehicleId/measurements", requireUser, async (req, res, next) => {
  try {
    const owned = await pool.query(
      "SELECT id FROM vehicles WHERE id = $1 AND user_id = $2 LIMIT 1",
      [req.params.vehicleId, req.user.id]
    );
    if (!owned.rowCount) return res.status(404).json({ error: "vehicle_not_found" });

    const type = String(req.body?.measurement_type || "").trim();
    const unit = String(req.body?.unit || "").trim() || null;
    const note = String(req.body?.note || "").trim() || null;
    const rawValue = req.body?.value;
    const numericValue = rawValue === "" || rawValue === null || rawValue === undefined ? null : Number(rawValue);
    const valueText = numericValue === null || Number.isNaN(numericValue) ? String(rawValue || "").trim() || null : null;

    if (!type || (numericValue === null && !valueText)) {
      return res.status(400).json({ error: "measurement_required" });
    }

    const result = await pool.query(
      `INSERT INTO vehicle_measurements
        (vehicle_id, user_id, measurement_type, value, value_text, unit, note, measured_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz, now()))
       RETURNING *`,
      [
        req.params.vehicleId,
        req.user.id,
        type,
        numericValue !== null && !Number.isNaN(numericValue) ? numericValue : null,
        valueText,
        unit,
        note,
        req.body?.measured_at || null
      ]
    );
    res.status(201).json({ measurement: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.post("/api/garage/vehicles/:vehicleId/plans", requireUser, async (req, res, next) => {
  try {
    const owned = await pool.query(
      "SELECT id FROM vehicles WHERE id = $1 AND user_id = $2 LIMIT 1",
      [req.params.vehicleId, req.user.id]
    );
    if (!owned.rowCount) return res.status(404).json({ error: "vehicle_not_found" });

    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ error: "maintenance_title_required" });

    const intervalKm = req.body?.interval_km === "" || req.body?.interval_km == null
      ? null
      : Number(req.body.interval_km);
    const intervalMonths = req.body?.interval_months === "" || req.body?.interval_months == null
      ? null
      : Number(req.body.interval_months);
    const nextMileage = req.body?.next_service_mileage === "" || req.body?.next_service_mileage == null
      ? null
      : Number(req.body.next_service_mileage);

    if (
      (intervalKm !== null && (!Number.isInteger(intervalKm) || intervalKm <= 0)) ||
      (intervalMonths !== null && (!Number.isInteger(intervalMonths) || intervalMonths <= 0)) ||
      (nextMileage !== null && (!Number.isInteger(nextMileage) || nextMileage < 0))
    ) {
      return res.status(400).json({ error: "invalid_maintenance_plan" });
    }

    const result = await pool.query(
      `INSERT INTO vehicle_maintenance_plans
        (vehicle_id, user_id, code, title, interval_km, interval_months,
         next_service_mileage, next_service_at, part_search_query)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        req.params.vehicleId,
        req.user.id,
        String(req.body?.code || "").trim() || null,
        title,
        intervalKm,
        intervalMonths,
        nextMileage,
        req.body?.next_service_at || null,
        String(req.body?.part_search_query || "").trim() || null
      ]
    );

    res.status(201).json({ plan: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/garage/vehicles/:vehicleId/plans/:planId", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      `DELETE FROM vehicle_maintenance_plans
        WHERE id = $1 AND vehicle_id = $2 AND user_id = $3
        RETURNING id`,
      [req.params.planId, req.params.vehicleId, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "maintenance_plan_not_found" });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post("/api/garage/vehicles/:vehicleId/maintenance", requireUser, async (req, res, next) => {
  try {
    const owned = await pool.query(
      "SELECT id FROM vehicles WHERE id = $1 AND user_id = $2 LIMIT 1",
      [req.params.vehicleId, req.user.id]
    );
    if (!owned.rowCount) return res.status(404).json({ error: "vehicle_not_found" });

    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ error: "maintenance_title_required" });

    const result = await pool.query(
      `INSERT INTO vehicle_maintenance_records
        (vehicle_id, user_id, mileage, service_date, title, note, cost_amount)
       VALUES ($1,$2,$3,COALESCE($4::date,CURRENT_DATE),$5,$6,$7)
       RETURNING *`,
      [
        req.params.vehicleId,
        req.user.id,
        req.body?.mileage ? Number(req.body.mileage) : null,
        req.body?.service_date || null,
        title,
        String(req.body?.note || "").trim() || null,
        req.body?.cost_amount ? Number(req.body.cost_amount) : null
      ]
    );
    res.status(201).json({ record: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/garage/vehicles/:vehicleId", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM vehicles WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.vehicleId, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "vehicle_not_found" });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof ZapFormatAIError) {
    console.error("[ZapFormat AI]", error.code, error.status || "");
    const status = error.code === "ai_not_configured"
      ? 503
      : error.code === "ai_timeout"
        ? 504
        : (error.status && error.status >= 400 && error.status < 500 ? 400 : 502);
    return res.status(status).json({
      error: error.code === "ai_not_configured" ? "ai_not_configured" : "ai_unavailable"
    });
  }

  if (error instanceof PartGradeError) {
    console.error("[PartGrade]", error.code, error.status || "");
    const status = error.code === "partgrade_not_configured" ? 503 : 502;
    return res.status(status).json({ error: "supplier_unavailable" });
  }

  console.error(error);
  if (error?.code === "23505") {
    return res.status(409).json({ error: "conflict" });
  }
  if (error?.code === "offer_unavailable") {
    return res.status(409).json({ error: "cart_changed" });
  }
  res.status(500).json({ error: "internal_error" });
});

async function start() {
  if (pool) await pool.query("SELECT 1");
  app.listen(PORT, HOST, () => {
    console.log(`ZAPFORMAT API listening on http://${HOST}:${PORT}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Failed to start ZAPFORMAT API", error);
    process.exit(1);
  });
}

module.exports = {
  app,
  normalizeSupplierRows,
  supplierOfferRef,
  publicSupplierOffer,
  publicSearchTipCandidates,
  supplierCandidatesForTerms
};
