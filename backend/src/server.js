require("dotenv").config();

const crypto = require("node:crypto");
const { Readable } = require("node:stream");
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
const { createOfferTokenCodec } = require("./offer-token");
const { customerPrice } = require("./pricing");

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
const offerTokens = createOfferTokenCodec();

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

const quoteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
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

function normalizeArticle(value) {
  return String(value || "").toUpperCase().replace(/[^A-ZА-Я0-9]/gi, "");
}

function normalizeBrand(value) {
  return String(value || "").trim().toUpperCase();
}

async function searchSupplierOffers(number, brand) {
  try {
    return await partGrade.searchArticles(number, brand);
  } catch (error) {
    if (error instanceof PartGradeError && Number(error.upstreamCode) === 103) {
      return partGrade.searchBatch([{ number, brand }]);
    }
    throw error;
  }
}

function supplierIdentity(row) {
  return {
    supplierCode: row?.supplierCode ?? null,
    itemKey: row?.itemKey ?? null
  };
}

function publicSupplierOffer(row, queryNumber, queryBrand) {
  const price = customerPrice(row?.price);
  if (price === null) return null;

  const rowBrand = row?.brand || queryBrand;
  const rowArticle = row?.number || queryNumber;
  const inferredAnalog =
    normalizeBrand(rowBrand) !== normalizeBrand(queryBrand) ||
    normalizeArticle(rowArticle) !== normalizeArticle(queryNumber);
  const isAnalog = typeof row?.isAnalog === "boolean" ? row.isAnalog : inferredAnalog;
  const identity = supplierIdentity(row);

  const offerToken =
    (identity.supplierCode != null || identity.itemKey != null)
      ? offerTokens.seal({
          v: 1,
          qn: String(queryNumber || "").trim(),
          qb: String(queryBrand || "").trim(),
          n: String(rowArticle || "").trim(),
          b: String(rowBrand || "").trim(),
          s: identity.supplierCode,
          k: identity.itemKey
        })
      : null;

  return {
    brand: rowBrand,
    article: rowArticle,
    article_normalized: row?.numberFix || null,
    description: row?.description || null,
    availability: Number(row?.availability || 0),
    packing: Number(row?.packing || 1),
    delivery_hours: Number(row?.deliveryPeriod || 0),
    delivery_hours_max: Number(row?.deliveryPeriodMax || row?.deliveryPeriod || 0),
    delivery_probability: row?.deliveryProbability ?? null,
    returnable: row?.noReturn ? false : true,
    is_analog: Boolean(isAnalog),
    price,
    currency: "RUB",
    offer_token: offerToken
  };
}

function rowMatchesOfferPayload(row, payload) {
  const supplierCode = row?.supplierCode ?? null;
  const itemKey = row?.itemKey ?? null;

  if (payload.s != null && String(supplierCode) !== String(payload.s)) return false;
  if (payload.k != null && String(itemKey) !== String(payload.k)) return false;

  if (payload.b && normalizeBrand(row?.brand) !== normalizeBrand(payload.b)) return false;
  if (payload.n && normalizeArticle(row?.number) !== normalizeArticle(payload.n)) return false;

  return true;
}

async function revalidateOfferToken(token, quantity = 1, cache = new Map()) {
  let payload;
  try {
    payload = offerTokens.open(token);
  } catch (_error) {
    return { status: "invalid" };
  }

  const cacheKey = normalizeBrand(payload.qb) + "|" + normalizeArticle(payload.qn);
  let rowsPromise = cache.get(cacheKey);
  if (!rowsPromise) {
    rowsPromise = searchSupplierOffers(payload.qn, payload.qb);
    cache.set(cacheKey, rowsPromise);
  }

  const rows = await rowsPromise;
  const found = (Array.isArray(rows) ? rows : []).find((row) => rowMatchesOfferPayload(row, payload));
  if (!found) return { status: "unavailable" };

  const offer = publicSupplierOffer(found, payload.qn, payload.qb);
  if (!offer) return { status: "unavailable" };

  const requested = Math.max(1, Math.min(999, Number(quantity || 1)));
  return {
    status: offer.availability >= requested ? "ok" : "insufficient",
    requested_quantity: requested,
    ...offer
  };
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
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return res.status(400).json({ error: "phone_required" });
    }
    if (!rawItems.length || rawItems.length > 50) {
      return res.status(400).json({ error: "items_required" });
    }

    const items = rawItems.map((item) => ({
      client_id: String(item?.client_id || "").trim().slice(0, 160),
      brand: String(item?.brand || "").trim().slice(0, 80),
      article: String(item?.article || "").trim().slice(0, 120),
      description: String(item?.description || "").trim().slice(0, 300),
      quantity: Math.max(1, Math.min(999, Number(item?.quantity || 1))),
      comment: String(item?.comment || "").trim().slice(0, 500),
      offer_token: String(item?.offer_token || "").trim().slice(0, 4096),
      expected_price: Number.isFinite(Number(item?.expected_price))
        ? Math.max(0, Math.round(Number(item.expected_price) * 100) / 100)
        : null,
      quoted_price: null,
      needs_confirmation: true
    })).filter((item) => item.article);

    if (!items.length) {
      return res.status(400).json({ error: "items_required" });
    }

    const validationCache = new Map();
    const validation = await Promise.all(items.map(async (item) => {
      if (!item.offer_token) {
        return {
          client_id: item.client_id,
          status: "manual",
          brand: item.brand,
          article: item.article,
          quantity: item.quantity
        };
      }

      const result = await revalidateOfferToken(item.offer_token, item.quantity, validationCache);
      return { client_id: item.client_id, ...result };
    }));

    let cartChanged = false;
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const checked = validation[index];

      if (!item.offer_token) continue;

      if (checked.status !== "ok") {
        cartChanged = true;
        continue;
      }

      if (
        item.expected_price !== null &&
        Math.abs(Number(checked.price) - item.expected_price) > 0.009
      ) {
        cartChanged = true;
      }

      item.brand = checked.brand || item.brand;
      item.article = checked.article || item.article;
      item.description = checked.description || item.description;
      item.quoted_price = checked.price;
      item.needs_confirmation = false;
      item.offer_token = checked.offer_token || item.offer_token;
    }

    if (cartChanged) {
      return res.status(409).json({
        error: "cart_changed",
        items: validation.map((item) => ({
          client_id: item.client_id || "",
          status: item.status,
          brand: item.brand || null,
          article: item.article || null,
          description: item.description || null,
          price: item.price ?? null,
          availability: item.availability ?? 0,
          delivery_hours: item.delivery_hours ?? null,
          offer_token: item.offer_token || null
        }))
      });
    }

    const now = new Date();
    const requestId =
      "Q-" +
      now.toISOString().slice(0, 10).replace(/-/g, "") +
      "-" +
      crypto.randomBytes(3).toString("hex").toUpperCase();

    const requestUser = pool ? await currentUser(req) : null;

    const allConfirmed = items.every(
      (item) => item.needs_confirmation === false && Number.isFinite(Number(item.quoted_price))
    );

    if (pool && requestUser && allConfirmed) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const totalAmount = items.reduce(
          (sum, item) => sum + Number(item.quoted_price) * Number(item.quantity),
          0
        );

        const orderResult = await client.query(
          `INSERT INTO orders
            (user_id, status, total_amount, currency, recipient_name, recipient_phone, created_at, updated_at)
           VALUES ($1,'new',$2,'RUB',$3,$4,$5,$5)
           RETURNING id, order_number, status, total_amount, currency, created_at`,
          [
            requestUser.id,
            Math.round((totalAmount + Number.EPSILON) * 100) / 100,
            name || requestUser.name || null,
            phone,
            now
          ]
        );

        const order = orderResult.rows[0];

        for (let index = 0; index < items.length; index++) {
          const item = items[index];
          const checked = validation[index];
          const deliveryDays = Number.isFinite(Number(checked?.delivery_hours))
            ? Math.max(0, Math.ceil(Number(checked.delivery_hours) / 24))
            : null;

          const orderItem = await client.query(
            `INSERT INTO order_items
              (order_id, article, brand, description, warehouse, delivery_days,
               quantity, unit_price, status, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new',$9,$9)
             RETURNING id`,
            [
              order.id,
              item.article,
              item.brand || "",
              item.description || null,
              "Поставка",
              deliveryDays,
              item.quantity,
              item.quoted_price,
              now
            ]
          );

          await client.query(
            `INSERT INTO order_status_history
              (order_id, order_item_id, status, source, note, created_at)
             VALUES ($1,$2,'new','zapformat','Цена и наличие проверены перед оформлением',$3)`,
            [order.id, orderItem.rows[0].id, now]
          );
        }

        await client.query(
          `INSERT INTO order_status_history
            (order_id, status, source, note, created_at)
           VALUES ($1,'new','zapformat','Заказ создан на основании проверенных предложений',$2)`,
          [order.id, now]
        );

        await client.query("COMMIT");

        return res.status(201).json({
          ok: true,
          kind: "order",
          order_id: order.id,
          order_number: String(order.order_number),
          status: order.status,
          total_amount: Number(order.total_amount),
          currency: order.currency,
          items: items.length
        });
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    }

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
              (request_id, brand, article, description, quantity, comment, quoted_price, needs_confirmation)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              requestId,
              item.brand || null,
              item.article,
              item.description || null,
              item.quantity,
              item.comment || null,
              item.quoted_price,
              item.needs_confirmation
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
      items: items.length
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
      configured: true,
      provider: "PartGrade",
      api_host: new URL(partGrade.baseUrl).hostname
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

app.get("/api/catalog/offers", async (req, res, next) => {
  try {
    const number = String(req.query?.number || "").trim();
    const brand = String(req.query?.brand || "").trim();

    if (!number || !brand) {
      return res.status(400).json({ error: "article_and_brand_required" });
    }

    const rows = await searchSupplierOffers(number, brand);
    const mapped = (Array.isArray(rows) ? rows : [])
      .map((row) => publicSupplierOffer(row, number, brand))
      .filter(Boolean);

    const sortOffers = (list) => list.sort((a, b) => a.price - b.price || a.delivery_hours - b.delivery_hours);
    const offers = sortOffers(mapped.filter((row) => !row.is_analog));
    const analogs = sortOffers(mapped.filter((row) => row.is_analog));

    res.json({
      source: "PartGrade",
      mode: "articles",
      query: { number, brand },
      offers,
      analogs,
      total: mapped.length
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/catalog/revalidate", async (req, res, next) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
    if (!items.length) {
      return res.status(400).json({ error: "items_required" });
    }

    const cache = new Map();
    const results = await Promise.all(items.map(async (item, index) => {
      const clientId = String(item?.id || index).slice(0, 160);
      const token = String(item?.offer_token || "").trim();
      const quantity = Math.max(1, Math.min(999, Number(item?.quantity || 1)));

      if (!token) {
        return { id: clientId, status: "invalid" };
      }

      const result = await revalidateOfferToken(token, quantity, cache);
      return {
        id: clientId,
        status: result.status,
        brand: result.brand || null,
        article: result.article || null,
        description: result.description || null,
        price: result.price ?? null,
        availability: result.availability ?? 0,
        packing: result.packing ?? 1,
        delivery_hours: result.delivery_hours ?? null,
        delivery_hours_max: result.delivery_hours_max ?? null,
        delivery_probability: result.delivery_probability ?? null,
        returnable: result.returnable ?? null,
        offer_token: result.offer_token || null
      };
    }));

    res.json({ ok: true, items: results });
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

app.get("/api/account/orders", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.order_number, o.status, o.total_amount, o.currency, o.created_at,
              count(i.id)::int AS items_count
         FROM orders o
         LEFT JOIN order_items i ON i.order_id = o.id
        WHERE o.user_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT 100`,
      [req.user.id]
    );
    res.json({ orders: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/account/orders/:orderId", requireUser, async (req, res, next) => {
  try {
    const orderResult = await pool.query(
      `SELECT *
         FROM orders
        WHERE user_id = $1
          AND (id::text = $2 OR order_number::text = $2)
        LIMIT 1`,
      [req.user.id, String(req.params.orderId)]
    );
    if (!orderResult.rowCount) return res.status(404).json({ error: "order_not_found" });

    const order = orderResult.rows[0];
    const [items, history] = await Promise.all([
      pool.query(
        `SELECT id, brand, article, description, warehouse, delivery_days, quantity,
                unit_price, status, supplier_status, expected_at, received_at
           FROM order_items
          WHERE order_id = $1
          ORDER BY created_at ASC`,
        [order.id]
      ),
      pool.query(
        `SELECT status, source, note, created_at
           FROM order_status_history
          WHERE order_id = $1 AND order_item_id IS NULL
          ORDER BY created_at ASC`,
        [order.id]
      )
    ]);

    res.json({
      order,
      items: items.rows,
      history: history.rows
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

    const [plans, measurements, history] = await Promise.all([
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
      )
    ]);

    res.json({
      vehicle,
      maintenance: plans.rows,
      measurements: measurements.rows,
      history: history.rows
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

const TIMEWEB_MCP_UPSTREAM = "https://timeweb.cloud/api/v1/mcp";
const TIMEWEB_PROXY_KEY_SHA256 = "31ff5e9df7dea9e2b529077bea83b6f9a09f9ac78b9997ba65ef85439e3fca3f";

function validTimewebProxyKey(value) {
  const candidate = crypto.createHash("sha256").update(String(value || "")).digest("hex");
  const expected = TIMEWEB_PROXY_KEY_SHA256;
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

function validTimewebRelayBearer(req) {
  const expected = String(process.env.TIMEWEB_RELAY_TOKEN_SHA256 || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expected)) return false;

  const auth = String(req.get("authorization") || "");
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  const candidate = crypto.createHash("sha256").update(token).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

async function proxyTimewebMcp(req, res, next) {
  try {
    const token = String(process.env.TIMEWEB_CLOUD_TOKEN || "").trim();
    if (!token) {
      return res.status(503).json({ error: "timeweb_not_configured" });
    }

    const headers = {
      Authorization: "Bearer " + token,
      Accept: String(req.get("accept") || "application/json, text/event-stream")
    };

    const contentType = req.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;

    for (const name of ["mcp-protocol-version","mcp-session-id","last-event-id"]) {
      const value = req.get(name);
      if (value) headers[name] = value;
    }

    const method = String(req.method || "POST").toUpperCase();
    const options = { method, headers, redirect: "manual" };
    if (!["GET","HEAD"].includes(method)) {
      options.body = req.body === undefined ? undefined : JSON.stringify(req.body);
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    options.signal = controller.signal;

    let upstream;
    try {
      upstream = await fetch(TIMEWEB_MCP_UPSTREAM, options);
    } finally {
      clearTimeout(timeout);
    }

    res.status(upstream.status);
    for (const name of ["content-type","cache-control","mcp-session-id","retry-after"]) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }

    if (!upstream.body) return res.end();
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    if (error?.name === "AbortError") {
      return res.status(504).json({ error: "timeweb_timeout" });
    }
    next(error);
  }
}

app.all("/mcp/timeweb-mobile", async (req, res, next) => {
  if (!validTimewebRelayBearer(req)) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return proxyTimewebMcp(req, res, next);
});

app.all("/mcp/timeweb/:accessKey", async (req, res, next) => {
  if (!validTimewebProxyKey(req.params.accessKey)) {
    return res.status(404).json({ error: "not_found" });
  }
  return proxyTimewebMcp(req, res, next);
});

app.use((error, _req, res, _next) => {
  if (error instanceof PartGradeError) {
    console.error("[PartGrade]", error.code, error.status || "");
    const status = error.code === "partgrade_not_configured" ? 503 : 502;
    return res.status(status).json({ error: "supplier_unavailable" });
  }

  console.error(error);
  if (error?.code === "23505") {
    return res.status(409).json({ error: "conflict" });
  }
  res.status(500).json({ error: "internal_error" });
});

async function start() {
  if (pool) await pool.query("SELECT 1");
  app.listen(PORT, HOST, () => {
    console.log(`ZAPFORMAT API listening on http://${HOST}:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start ZAPFORMAT API", error);
  process.exit(1);
});
