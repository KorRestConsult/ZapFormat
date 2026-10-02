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
const { FapiError, createFapiClient } = require("./fapi");
const { selectFapiNodes, uniqueOemRows } = require("./fapi-fitment");
const { createOfferTokenCodec } = require("./offer-token");
const { customerPrice } = require("./pricing");
const { verifyGitHubActionsToken } = require("./github-oidc");
const { interpretSearch, researchPartCandidates, normalizeVehicle } = require("./ai-search");
const { publicBootstrapJwk, installEncryptedOpenAIKey, installTimewebAIToken, installSmsRuToken, installFapiToken } = require("./secret-bootstrap");
const {
  SmsDeliveryError,
  createOtpCode,
  otpHash,
  otpMatches,
  createSmsRuSender,
  maskPhone
} = require("./auth-otp");
const {
  ABCP_CARBASE_CAPABILITIES,
  catalogCoverageForIntent,
  compactText,
  createAbcpCarbaseProvider,
  resolveVehicleCatalog,
  selectVerifiedArticles,
  vehicleSpecsForIntent
} = require("./vehicle-catalog");
const {
  resolveSupplierCheckout,
  normalizeSupplierOrders,
  supplierOrderNumber,
  supplierOrderStatus,
  supplierOrderStatusCode,
  supplierOrderPositions,
  supplierPositionStatus,
  supplierPositionStatusCode,
  positionKey,
  internalItemStatusFromSupply,
  aggregateOrderStatusFromItems
} = require("./supplier-orders");

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
const fapi = createFapiClient();
const vehicleCatalog = createAbcpCarbaseProvider(partGrade);
const offerTokens = createOfferTokenCodec();
const sendVerificationCode = createSmsRuSender();
const OTP_TTL_MINUTES = Math.max(3, Math.min(30, Number(process.env.OTP_TTL_MINUTES || 10)));
const OTP_RESEND_SECONDS = Math.max(30, Math.min(300, Number(process.env.OTP_RESEND_SECONDS || 60)));
const OTP_MAX_ATTEMPTS = 5;

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
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "Authorization"]
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

const aiSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
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

function otpSecret() {
  return String(process.env.AUTH_OTP_SECRET || process.env.INTERNAL_API_TOKEN || "").trim();
}

function validSmsPhone(phone) {
  return /^\+7\d{10}$/.test(String(phone || ""));
}

async function createAuthChallenge({
  purpose,
  phone,
  userId = null,
  name = null,
  surname = null,
  passwordHash = null
}) {
  const secret = otpSecret();
  if (!secret) {
    const error = new Error("OTP secret is not configured");
    error.code = "otp_not_configured";
    throw error;
  }

  const recent = await pool.query(
    `SELECT 1
       FROM auth_challenges
      WHERE phone = $1
        AND purpose = $2
        AND consumed_at IS NULL
        AND created_at > now() - ($3::int * interval '1 second')
      LIMIT 1`,
    [phone, purpose, OTP_RESEND_SECONDS]
  );
  if (recent.rowCount) {
    const error = new Error("Verification code was sent recently");
    error.code = "otp_too_soon";
    error.retryAfter = OTP_RESEND_SECONDS;
    throw error;
  }

  await pool.query(
    "DELETE FROM auth_challenges WHERE expires_at < now() - interval '1 day' OR consumed_at < now() - interval '1 day'"
  );

  const id = crypto.randomUUID();
  const code = createOtpCode();
  const codeHash = otpHash(secret, id, code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await pool.query(
    `INSERT INTO auth_challenges
      (id, purpose, phone, user_id, name, surname, password_hash, code_hash, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, purpose, phone, userId, name, surname, passwordHash, codeHash, expiresAt]
  );

  try {
    await sendVerificationCode({ phone, code });
  } catch (error) {
    await pool.query("DELETE FROM auth_challenges WHERE id = $1", [id]).catch(() => {});
    throw error;
  }

  return {
    challenge_id: id,
    masked_phone: maskPhone(phone),
    expires_in: OTP_TTL_MINUTES * 60,
    resend_in: OTP_RESEND_SECONDS
  };
}

function authChallengeError(res, error) {
  if (error?.code === "invalid_phone") {
    return res.status(400).json({ error: "invalid_phone" });
  }
  if (error?.code === "otp_too_soon") {
    return res.status(429).json({ error: "otp_too_soon", retry_after: error.retryAfter || OTP_RESEND_SECONDS });
  }
  if (error?.code === "sms_not_configured" || error?.code === "otp_not_configured") {
    return res.status(503).json({ error: "verification_unavailable" });
  }
  if (error instanceof SmsDeliveryError || error?.code === "sms_send_failed") {
    console.error("[SMS]", error?.details || error?.message || "sms_send_failed");
    return res.status(502).json({ error: "sms_send_failed" });
  }
  return null;
}

function normalizeArticle(value) {
  return String(value || "").toUpperCase().replace(/[^A-ZА-Я0-9]/gi, "");
}

function normalizeBrand(value) {
  return String(value || "").trim().toUpperCase();
}

async function searchSupplierOffers(number, brand, options = {}) {
  try {
    return await partGrade.searchArticles(number, brand, options);
  } catch (error) {
    if (error instanceof PartGradeError && Number(error.upstreamCode) === 103) {
      return partGrade.searchBatch([{ number, brand }]);
    }
    throw error;
  }
}


function supplierBrandRows(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value).filter((row) => row && typeof row === "object");
  return [];
}

async function validateResearchedCandidates(candidates) {
  const result = [];
  const seen = new Set();

  for (const candidate of (Array.isArray(candidates) ? candidates : []).slice(0, 5)) {
    const wantedArticle = String(candidate?.article || "").trim();
    const wantedBrand = String(candidate?.brand || "").trim();
    if (!wantedArticle || !wantedBrand) continue;

    let rows = [];
    try {
      rows = supplierBrandRows(await partGrade.searchBrands(wantedArticle, { useOnlineStocks: true }));
      if (!rows.length) rows = supplierBrandRows(await partGrade.searchTips(wantedArticle));
    } catch (_error) {
      rows = [];
    }

    const articleKey = normalizeArticle(wantedArticle);
    const brandKey = normalizeBrand(wantedBrand);
    const exactArticle = rows.filter((row) =>
      normalizeArticle(row?.number || row?.numberFix || wantedArticle) === articleKey
    );

    let hit = exactArticle.find((row) => normalizeBrand(row?.brand) === brandKey);
    if (!hit) {
      hit = rows.find((row) =>
        normalizeBrand(row?.brand) === brandKey &&
        normalizeArticle(row?.number || row?.numberFix || wantedArticle) === articleKey
      );
    }
    if (!hit && exactArticle.length === 1) hit = exactArticle[0];
    if (!hit) continue;

    const brand = String(hit.brand || wantedBrand).trim();
    const article = String(hit.number || wantedArticle).trim();
    const key = normalizeBrand(brand) + "|" + normalizeArticle(article);
    if (!brand || !article || seen.has(key)) continue;
    seen.add(key);

    result.push({
      brand,
      article,
      description: String(hit.description || candidate.description || "Автозапчасть").trim(),
      fitment_note: String(candidate.fitment_note || "").trim(),
      research_brand: wantedBrand,
      research_article: wantedArticle
    });
  }

  return result;
}


function oneClarificationQuestion(query, vehicle, intent, suggested = "") {
  const v = normalizeVehicle(vehicle);
  const q = String(query || "").toLowerCase();

  if (intent?.category === "clutch" && !/механ|мкпп|автомат|акпп|робот|вариатор/.test(q)) {
    return "Какая коробка передач: механика или автомат?";
  }

  if (["brake_pad","brake_disk","brake_drum"].includes(intent?.category) && intent?.axle === "any") {
    return "Нужны передние или задние?";
  }

  if (!v?.year && !/\b(19|20)\d{2}\b/.test(q)) {
    return "Какой год выпуска автомобиля?";
  }

  if (!v?.engine && !/\b\d[\.,]\d\b/.test(q)) {
    return "Какой двигатель установлен? Например: 1.8 бензин или 2.0 дизель.";
  }

  if (!v?.vin) {
    return "Пришлите VIN автомобиля для точной проверки совместимости.";
  }

  const clean = String(suggested || "").trim();
  if (clean) {
    const first = clean.split(/[?!。]/)[0].trim();
    if (first) return first + "?";
  }

  return "Уточните один параметр автомобиля, которого не хватает для точного подбора.";
}

async function buildResearchSearchResult(query, vehicle, interpreted, intent) {
  const common = {
    ok: true,
    interpreter: interpreted?.mode || "ai",
    ai_configured: Boolean(
      String(process.env.TIMEWEB_AI_TOKEN || "").trim() ||
      String(process.env.OPENAI_API_KEY || "").trim()
    ),
    vehicle: normalizeVehicle(vehicle),
    intent
  };

  try {
    const research = await researchPartCandidates(query, vehicle);
    if (!research) {
      return {
        ...common,
        mode: "clarification",
        question: "Укажите год выпуска и двигатель автомобиля."
      };
    }

    if (research.status === "needs_clarification") {
      return {
        ...common,
        mode: "clarification",
        research_mode: research.source || "web",
        question: oneClarificationQuestion(query, vehicle, intent, research.clarification_question)
      };
    }

    const articles = await validateResearchedCandidates(research.candidates);
    if (articles.length) {
      return {
        ...common,
        mode: "researched_articles",
        research_mode: research.source || "web",
        fitment_status: research.source === "web"
          ? "web_researched_supplier_verified"
          : "model_researched_supplier_verified",
        research_summary: research.summary || "",
        articles
      };
    }

    return {
      ...common,
      mode: "clarification",
      research_mode: research.source || "web",
      question: oneClarificationQuestion(query, vehicle, intent, research.clarification_question)
    };
  } catch (error) {
    console.warn("[AIResearch]", error?.code || error?.message || "failed");
    return {
      ...common,
      mode: "clarification",
      research_mode: "web_failed",
      question: oneClarificationQuestion(query, vehicle, intent)
    };
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


function internalOfferIdentity(token) {
  try {
    const payload = offerTokens.open(token);
    return {
      supplierCode: payload?.s ?? null,
      itemKey: payload?.k ?? null
    };
  } catch (_error) {
    return { supplierCode: null, itemKey: null };
  }
}

function supplierEnvValue(name) {
  const value = String(process.env[name] || "").trim();
  return value || null;
}

function supplierCheckoutOverrides() {
  return {
    paymentMethodId: supplierEnvValue("PARTGRADE_PAYMENT_METHOD_ID"),
    shipmentMethodId: supplierEnvValue("PARTGRADE_SHIPMENT_METHOD_ID"),
    shipmentAddressId: supplierEnvValue("PARTGRADE_SHIPMENT_ADDRESS_ID"),
    shipmentOfficeId: supplierEnvValue("PARTGRADE_SHIPMENT_OFFICE_ID")
  };
}

async function resolveSupplierCheckoutForItems(items) {
  const [paymentMethods, shipmentMethods, shipmentAddresses, shipmentOffices] = await Promise.all([
    partGrade.paymentMethods(),
    partGrade.shipmentMethods(),
    partGrade.shipmentAddresses(),
    partGrade.shipmentOffices().catch(() => [])
  ]);

  const checkout = resolveSupplierCheckout({
    paymentMethods,
    shipmentMethods,
    shipmentAddresses,
    shipmentOffices,
    overrides: supplierCheckoutOverrides()
  });

  const hours = (Array.isArray(items) ? items : [])
    .flatMap((item) => [Number(item?.delivery_hours), Number(item?.delivery_hours_max)])
    .filter((value) => Number.isFinite(value) && value >= 0);

  const explicitDate = supplierEnvValue("PARTGRADE_SHIPMENT_DATE");
  if (explicitDate) {
    checkout.shipmentDate = explicitDate;
    return checkout;
  }

  try {
    const dates = await partGrade.shipmentDates({
      minDeadlineTime: hours.length ? Math.min(...hours) : undefined,
      maxDeadlineTime: hours.length ? Math.max(...hours) : undefined,
      shipmentAddress: checkout.shipmentAddress && checkout.shipmentAddress !== "0"
        ? checkout.shipmentAddress
        : undefined
    });
    const first = Array.isArray(dates) ? dates[0] : null;
    checkout.shipmentDate = first?.date ? String(first.date) : null;
  } catch (_error) {
    checkout.shipmentDate = null;
  }

  return checkout;
}

function supplierClientOrderNumber(orderNumber) {
  return "ZF-" + String(orderNumber);
}

async function markSupplierState(orderId, state, error = null) {
  if (!pool) return;
  await pool.query(
    `UPDATE orders
        SET supplier_state = $2,
            supplier_last_error = $3,
            updated_at = now()
      WHERE id = $1`,
    [orderId, state, error ? String(error).slice(0, 500) : null]
  );
}

async function saveSupplierOrderSnapshots(orderId, snapshots) {
  if (!pool) return { orders: 0, positions: 0 };
  const normalized = Array.isArray(snapshots) ? snapshots : [];
  if (!normalized.length) return { orders: 0, positions: 0 };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const orderMetaResult = await client.query(
      "SELECT user_id, order_number, status FROM orders WHERE id = $1 LIMIT 1",
      [orderId]
    );
    const orderMeta = orderMetaResult.rows[0] || null;

    const itemsResult = await client.query(
      `SELECT id, brand, article, supplier_code, supplier_offer_id, status, supplier_status
         FROM order_items
        WHERE order_id = $1
        ORDER BY created_at ASC`,
      [orderId]
    );
    const itemRows = itemsResult.rows;
    let positionUpdates = 0;

    for (const snapshot of normalized) {
      const number = supplierOrderNumber(snapshot);
      if (!number) continue;

      const status = supplierOrderStatus(snapshot);
      const statusCode = supplierOrderStatusCode(snapshot);
      const previous = await client.query(
        `SELECT supplier_status, supplier_status_code
           FROM supplier_orders
          WHERE order_id = $1 AND provider = 'supplier' AND supplier_order_number = $2
          LIMIT 1`,
        [orderId, number]
      );

      await client.query(
        `INSERT INTO supplier_orders
          (order_id, provider, supplier_order_number, supplier_status, supplier_status_code,
           last_synced_at, created_at, updated_at)
         VALUES ($1,'supplier',$2,$3,$4,now(),now(),now())
         ON CONFLICT (order_id, provider, supplier_order_number)
         DO UPDATE SET supplier_status = EXCLUDED.supplier_status,
                       supplier_status_code = EXCLUDED.supplier_status_code,
                       last_synced_at = now(),
                       updated_at = now()`,
        [orderId, number, status, statusCode]
      );

      const oldStatus = previous.rows[0]?.supplier_status || null;
      const oldCode = previous.rows[0]?.supplier_status_code || null;
      if ((status || statusCode) && (oldStatus !== status || oldCode !== statusCode)) {
        await client.query(
          `INSERT INTO order_status_history
            (order_id, status, source, note, created_at)
           VALUES ($1,'processing','supply',$2,now())`,
          [orderId, "Статус поставки: " + String(status || statusCode)]
        );
        if (orderMeta?.user_id) {
          await addUserNotification(
            client,
            orderMeta.user_id,
            "order_status",
            "supply_status",
            "Заказ #" + String(orderMeta.order_number),
            "Статус поставки: " + String(status || statusCode)
          );
        }
      }

      const used = new Set();
      for (const position of supplierOrderPositions(snapshot)) {
        const key = positionKey(position?.brand, position?.number ?? position?.numberFix);
        const supplierCode = position?.supplierCode == null ? null : String(position.supplierCode);
        const itemKey = position?.itemKey == null ? null : String(position.itemKey);

        let match = itemRows.find((item) => {
          if (used.has(item.id)) return false;
          if (positionKey(item.brand, item.article) !== key) return false;
          if (supplierCode && item.supplier_code && String(item.supplier_code) !== supplierCode) return false;
          if (itemKey && item.supplier_offer_id && String(item.supplier_offer_id) !== itemKey) return false;
          return true;
        });

        if (!match) {
          match = itemRows.find((item) => !used.has(item.id) && positionKey(item.brand, item.article) === key);
        }
        if (!match) continue;

        used.add(match.id);
        const supplyStatus = supplierPositionStatus(position);
        const supplyCode = supplierPositionStatusCode(position);
        const internalStatus = internalItemStatusFromSupply(supplyCode, supplyStatus);
        const positionId = position?.positionId ?? position?.id ?? null;

        await client.query(
          `UPDATE order_items
              SET supplier_order_number = $2,
                  supplier_position_id = $3,
                  supplier_status = $4,
                  status = CASE
                    WHEN status = 'completed' THEN status
                    WHEN $5 = 'completed' THEN 'completed'
                    WHEN status = 'ready' AND $5 = 'processing' THEN status
                    ELSE $5
                  END,
                  received_at = CASE
                    WHEN $5 = 'completed' THEN COALESCE(received_at, now())
                    ELSE received_at
                  END,
                  updated_at = now()
            WHERE id = $1`,
          [
            match.id,
            number,
            positionId == null ? null : String(positionId),
            supplyStatus || supplyCode,
            internalStatus
          ]
        );

        const nextSupplyStatus = supplyStatus || supplyCode || null;
        if (
          orderMeta?.user_id &&
          nextSupplyStatus &&
          String(match.supplier_status || "") !== String(nextSupplyStatus)
        ) {
          await addUserNotification(
            client,
            orderMeta.user_id,
            "item_changes",
            "item_status",
            "Заказ #" + String(orderMeta.order_number) + " · " + String(match.brand || "") + " " + String(match.article || ""),
            "Статус позиции: " + String(nextSupplyStatus)
          );
        }

        positionUpdates += 1;
      }
    }

    const finalItemRows = await client.query(
      "SELECT status FROM order_items WHERE order_id = $1 ORDER BY created_at ASC",
      [orderId]
    );
    const nextOrderStatus = aggregateOrderStatusFromItems(
      finalItemRows.rows.map((row) => row.status),
      orderMeta?.status
    );

    await client.query(
      `UPDATE orders
          SET supplier_state = 'submitted',
              supplier_last_error = NULL,
              supplier_submitted_at = COALESCE(supplier_submitted_at, now()),
              supplier_synced_at = now(),
              status = $2,
              updated_at = now()
        WHERE id = $1`,
      [orderId, nextOrderStatus]
    );

    const previousOrderStatus = String(orderMeta?.status || "").toLowerCase();
    if (
      nextOrderStatus !== previousOrderStatus &&
      ["ready", "completed", "cancelled"].includes(nextOrderStatus)
    ) {
      const notes = {
        ready: "Заказ готов к получению. Оплата наличными при получении",
        completed: "Заказ завершён",
        cancelled: "Заказ отменён"
      };
      await client.query(
        `INSERT INTO order_status_history
          (order_id, status, source, note, created_at)
         VALUES ($1,$2,'supply',$3,now())`,
        [orderId, nextOrderStatus, notes[nextOrderStatus]]
      );
      if (orderMeta?.user_id) {
        await addUserNotification(
          client,
          orderMeta.user_id,
          "order_status",
          "order_status",
          "Заказ #" + String(orderMeta.order_number) + " — " + (
            nextOrderStatus === "ready" ? "готов к получению" :
            nextOrderStatus === "completed" ? "завершён" :
            "отменён"
          ),
          notes[nextOrderStatus]
        );
      }
    }

    await client.query("COMMIT");
    return { orders: normalized.length, positions: positionUpdates };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function findExistingSupplierOrders(clientOrderNumber) {
  const data = await partGrade.orders({ limit: 1000, format: "p" });
  return normalizeSupplierOrders(data).filter(
    (order) => String(order?.clientOrderNumber || "") === String(clientOrderNumber)
  );
}

async function submitSupplierOrder(orderId) {
  if (!pool) return { submitted: false, reason: "database_not_configured" };

  const orderResult = await pool.query(
    `SELECT id, order_number, supplier_state
       FROM orders
      WHERE id = $1
      LIMIT 1`,
    [orderId]
  );
  const order = orderResult.rows[0];
  if (!order) return { submitted: false, reason: "order_not_found" };

  const linked = await pool.query(
    `SELECT supplier_order_number
       FROM supplier_orders
      WHERE order_id = $1
      ORDER BY created_at`,
    [orderId]
  );
  if (linked.rowCount) {
    await syncSupplierOrders({ orderId, force: true });
    return {
      submitted: true,
      recovered: true,
      supplier_orders: linked.rows.map((row) => row.supplier_order_number)
    };
  }

  const itemsResult = await pool.query(
    `SELECT id, article, brand, quantity, comment, supplier_code, supplier_offer_id,
            delivery_days
       FROM order_items
      WHERE order_id = $1
      ORDER BY created_at ASC`,
    [orderId]
  );
  const items = itemsResult.rows;
  if (!items.length) {
    await markSupplierState(orderId, "manual_required", "order_items_missing");
    return { submitted: false, reason: "order_items_missing" };
  }

  if (items.some((item) => !item.supplier_code || !item.supplier_offer_id)) {
    await markSupplierState(orderId, "manual_required", "offer_identity_missing");
    return { submitted: false, reason: "offer_identity_missing" };
  }

  const clientOrderNumber = supplierClientOrderNumber(order.order_number);

  try {
    const existing = await findExistingSupplierOrders(clientOrderNumber);
    if (existing.length) {
      await saveSupplierOrderSnapshots(orderId, existing);
      return {
        submitted: true,
        recovered: true,
        supplier_orders: existing.map(supplierOrderNumber).filter(Boolean)
      };
    }

    const supplierItems = items.map((item) => ({
      number: item.article,
      brand: item.brand,
      supplierCode: item.supplier_code,
      itemKey: item.supplier_offer_id,
      quantity: item.quantity,
      comment: item.comment || undefined,
      delivery_hours: item.delivery_days == null ? undefined : Number(item.delivery_days) * 24,
      delivery_hours_max: item.delivery_days == null ? undefined : Number(item.delivery_days) * 24
    }));

    const checkout = await resolveSupplierCheckoutForItems(supplierItems);
    const response = await partGrade.instantOrder(supplierItems, {
      ...checkout,
      wholeOrderOnly: 1,
      clientOrderNumber,
      comment: "ZapFormat #" + String(order.order_number)
    });

    const snapshots = normalizeSupplierOrders(response);
    if (!snapshots.length) {
      const message = response?.errorMessage || response?.message || "supplier_order_not_created";
      const error = new Error(String(message));
      error.code = "supplier_order_not_created";
      throw error;
    }

    await saveSupplierOrderSnapshots(orderId, snapshots);
    return {
      submitted: true,
      recovered: false,
      supplier_orders: snapshots.map(supplierOrderNumber).filter(Boolean)
    };
  } catch (error) {
    const code = String(error?.code || "");
    const state = code.includes("selection_required")
      ? "configuration_required"
      : "submit_failed";
    await markSupplierState(orderId, state, error?.message || code || "supplier_submit_failed");
    return {
      submitted: false,
      reason: code || "supplier_submit_failed"
    };
  }
}

async function syncSupplierOrders(options = {}) {
  if (!pool) return { orders: 0, snapshots: 0 };

  const values = [];
  const where = ["1=1"];

  if (options.orderId) {
    values.push(options.orderId);
    where.push(`so.order_id = ${values.length}`);
  }
  if (options.userId) {
    values.push(options.userId);
    where.push(`o.user_id = ${values.length}`);
  }
  if (!options.force) {
    where.push("(so.last_synced_at IS NULL OR so.last_synced_at < now() - interval '60 seconds')");
  }

  const rows = await pool.query(
    `SELECT so.order_id, so.supplier_order_number
       FROM supplier_orders so
       JOIN orders o ON o.id = so.order_id
      WHERE ${where.join(" AND ")}
      ORDER BY so.updated_at DESC
      LIMIT 500`,
    values
  );

  if (!rows.rowCount) return { orders: 0, snapshots: 0 };

  const numbers = [...new Set(rows.rows.map((row) => String(row.supplier_order_number)).filter(Boolean))];
  const response = await partGrade.orderList(numbers);
  const snapshots = normalizeSupplierOrders(response);
  const byNumber = new Map(
    snapshots
      .map((snapshot) => [supplierOrderNumber(snapshot), snapshot])
      .filter(([number]) => Boolean(number))
  );

  const byOrder = new Map();
  for (const row of rows.rows) {
    const snapshot = byNumber.get(String(row.supplier_order_number));
    if (!snapshot) continue;
    if (!byOrder.has(row.order_id)) byOrder.set(row.order_id, []);
    byOrder.get(row.order_id).push(snapshot);
  }

  for (const [orderId, orderSnapshots] of byOrder.entries()) {
    await saveSupplierOrderSnapshots(orderId, orderSnapshots);
  }

  return { orders: byOrder.size, snapshots: snapshots.length };
}

async function supplierIntegrationStatus() {
  const results = await Promise.allSettled([
    partGrade.userInfo(),
    partGrade.basketContent(),
    partGrade.paymentMethods(),
    partGrade.shipmentMethods(),
    partGrade.shipmentAddresses(),
    partGrade.orderStatuses(),
    partGrade.orders({ limit: 1 }),
    partGrade.ordersVersion(),
    partGrade.userGarage()
  ]);

  const ok = (index) => results[index]?.status === "fulfilled";
  const count = (index) => {
    const result = results[index];
    if (!result || result.status !== "fulfilled") return null;
    const value = result.value;
    if (Array.isArray(value)) return value.length;
    if (Array.isArray(value?.items)) return value.items.length;
    if (Array.isArray(value?.list)) return value.list.length;
    return value && typeof value === "object" ? Object.keys(value).length : 0;
  };

  return {
    configured: partGrade.configured(),
    user_access: ok(0),
    basket_read: ok(1),
    payment_methods: ok(2),
    shipment_methods: ok(3),
    shipment_addresses: ok(4),
    order_statuses_read: ok(5),
    orders_read: ok(6),
    orders_version_read: ok(7),
    garage_read: ok(8),
    counts: {
      basket: count(1),
      payment_methods: count(2),
      shipment_methods: count(3),
      shipment_addresses: count(4),
      order_statuses: count(5),
      orders_sample: count(6),
      garage: count(8)
    },
    order_creation_wired: true,
    order_creation_permission: "not_mutation_tested"
  };
}

async function addUserNotification(db, userId, setting, type, title, body = null) {
  const columns = {
    order_status: "order_status",
    item_changes: "item_changes",
    returns: "returns"
  };
  const column = columns[setting];
  if (!column || !userId || !title) return false;

  const result = await db.query(
    `INSERT INTO notifications (user_id, type, title, body, created_at)
     SELECT $1,$2,$3,$4,now()
      WHERE NOT EXISTS (
        SELECT 1
          FROM user_notification_settings
         WHERE user_id = $1
           AND ${column} = false
      )
     RETURNING id`,
    [userId, String(type || "info").slice(0, 80), String(title).slice(0, 200), body ? String(body).slice(0, 1000) : null]
  );
  return result.rowCount > 0;
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
  return token;
}

function sessionTokenFromRequest(req) {
  const auth = String(req.get("authorization") || "");
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  if (bearer) return bearer;
  return req.cookies?.[COOKIE_NAME] || null;
}

async function currentUser(req) {
  const token = sessionTokenFromRequest(req);
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

app.post("/api/quote-requests", quoteLimiter, requireUser, async (req, res, next) => {
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
      vehicle_id: String(item?.vehicle_id || "").trim() || null,
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
      const identity = internalOfferIdentity(item.offer_token);
      item.supplier_code = identity.supplierCode;
      item.supplier_offer_id = identity.itemKey;
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

    if (pool && requestUser) {
      const requestedVehicleIds=[...new Set(items.map((item)=>item.vehicle_id).filter(Boolean))];
      if(requestedVehicleIds.length){
        const ownedVehicles=await pool.query(
          "SELECT id::text AS id FROM vehicles WHERE user_id = $1 AND id = ANY($2::uuid[])",
          [requestUser.id, requestedVehicleIds]
        );
        const ownedSet=new Set(ownedVehicles.rows.map((row)=>String(row.id)));
        if(requestedVehicleIds.some((id)=>!ownedSet.has(String(id)))){
          return res.status(400).json({ error: "invalid_vehicle_context" });
        }
      }
    } else {
      items.forEach((item)=>{ item.vehicle_id=null; });
    }

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

        const deliveryResult = await client.query(
          `SELECT id, recipient_name, recipient_phone
             FROM user_addresses
            WHERE user_id = $1
            ORDER BY is_default DESC, updated_at DESC, created_at DESC
            LIMIT 1`,
          [requestUser.id]
        );
        const delivery = deliveryResult.rows[0] || null;
        if (!delivery?.id) {
          await client.query("ROLLBACK");
          return res.status(409).json({ error: "delivery_required" });
        }

        const orderResult = await client.query(
          `INSERT INTO orders
            (user_id, status, total_amount, currency, delivery_address_id,
             recipient_name, recipient_phone, created_at, updated_at)
           VALUES ($1,'new',$2,'RUB',$3,$4,$5,$6,$6)
           RETURNING id, order_number, status, total_amount, currency, created_at`,
          [
            requestUser.id,
            Math.round((totalAmount + Number.EPSILON) * 100) / 100,
            delivery?.id || null,
            name || delivery?.recipient_name || requestUser.name || null,
            phone || delivery?.recipient_phone || requestUser.phone || null,
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
              (order_id, article, brand, description, supplier_code, supplier_offer_id,
               warehouse, delivery_days, quantity, unit_price, vehicle_id, comment, status, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'new',$13,$13)
             RETURNING id`,
            [
              order.id,
              item.article,
              item.brand || "",
              item.description || null,
              item.supplier_code || null,
              item.supplier_offer_id || null,
              "Поставка",
              deliveryDays,
              item.quantity,
              item.quoted_price,
              item.vehicle_id,
              item.comment || null,
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
           VALUES ($1,'new','zapformat','Заказ создан на основании проверенных предложений. Оплата наличными при получении',$2)`,
          [order.id, now]
        );

        await addUserNotification(
          client,
          requestUser.id,
          "order_status",
          "order_created",
          "Заказ #" + String(order.order_number) + " создан",
          "Цена и наличие проверены. Оплата — наличными при получении."
        );

        await client.query(
          `UPDATE orders
              SET supplier_state = 'ready_to_submit', updated_at = now()
            WHERE id = $1`,
          [order.id]
        );

        await client.query("COMMIT");

        if (String(process.env.PARTGRADE_AUTO_ORDER_AFTER_CHECKOUT || "").toLowerCase() === "true") {
          await submitSupplierOrder(order.id).catch((error) => {
            console.error("[SupplySubmit]", error?.message || "supplier_submit_failed");
          });
        }

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
              (request_id, brand, article, description, quantity, comment, quoted_price, needs_confirmation, vehicle_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              requestId,
              item.brand || null,
              item.article,
              item.description || null,
              item.quantity,
              item.comment || null,
              item.quoted_price,
              item.needs_confirmation,
              item.vehicle_id
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

    if (pool && requestUser) {
      await addUserNotification(
        pool,
        requestUser.id,
        "order_status",
        "quote_request_created",
        "Заказ на уточнении",
        "Некоторые позиции требуют подтверждения цены или наличия. Статус обновится в личном кабинете."
      );
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

app.get("/api/integration/status", async (_req, res, next) => {
  try {
    res.json(await supplierIntegrationStatus());
  } catch (error) {
    next(error);
  }
});

app.post("/api/internal/orders/:orderId/status", requireDatabase, requireInternal, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const orderId = String(req.params.orderId || "").trim();
    const target = String(req.body?.status || "").trim().toLowerCase();
    const note = String(req.body?.note || "").trim().slice(0, 500) || null;
    const allowedTargets = new Set(["processing", "ready", "completed", "cancelled"]);

    if (!allowedTargets.has(target)) {
      return res.status(400).json({ error: "invalid_order_status" });
    }

    await client.query("BEGIN");
    const found = await client.query(
      `SELECT id, user_id, order_number, status
         FROM orders
        WHERE id::text = $1 OR order_number::text = $1
        FOR UPDATE
        LIMIT 1`,
      [orderId]
    );

    if (!found.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "order_not_found" });
    }

    const order = found.rows[0];
    const current = String(order.status || "new").toLowerCase();

    const transitions = {
      new: new Set(["processing", "ready", "cancelled"]),
      received: new Set(["processing", "ready", "cancelled"]),
      confirmed: new Set(["processing", "ready", "cancelled"]),
      processing: new Set(["ready", "completed", "cancelled"]),
      ready: new Set(["completed", "cancelled"]),
      completed: new Set(),
      cancelled: new Set()
    };

    if (current !== target && !(transitions[current] || new Set()).has(target)) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "invalid_order_status_transition",
        current_status: current,
        requested_status: target
      });
    }

    if (current !== target) {
      await client.query(
        `UPDATE orders
            SET status = $2, updated_at = now()
          WHERE id = $1`,
        [order.id, target]
      );

      if (target === "ready" || target === "completed" || target === "cancelled") {
        await client.query(
          `UPDATE order_items
              SET status = CASE
                    WHEN status = 'cancelled' THEN status
                    ELSE $2
                  END,
                  received_at = CASE
                    WHEN $2 = 'completed' THEN COALESCE(received_at, now())
                    ELSE received_at
                  END,
                  updated_at = now()
            WHERE order_id = $1`,
          [order.id, target]
        );
      }

      const defaultNotes = {
        processing: "Заказ запущен в работу",
        ready: "Заказ готов к получению",
        completed: "Заказ завершён",
        cancelled: "Заказ отменён"
      };

      await client.query(
        `INSERT INTO order_status_history
          (order_id, status, source, note, created_at)
         VALUES ($1,$2,'zapformat',$3,now())`,
        [order.id, target, note || defaultNotes[target]]
      );

      const notificationBody = {
        processing: "Заказ в работе. Следите за изменениями в личном кабинете.",
        ready: "Заказ готов к получению. Оплата — наличными при получении.",
        completed: "Заказ завершён.",
        cancelled: "Заказ отменён."
      };

      await addUserNotification(
        client,
        order.user_id,
        "order_status",
        "order_status",
        "Заказ #" + String(order.order_number) + " — " + (
          target === "processing" ? "в работе" :
          target === "ready" ? "готов к получению" :
          target === "completed" ? "завершён" :
          "отменён"
        ),
        note || notificationBody[target]
      );
    }

    await client.query("COMMIT");
    res.json({
      ok: true,
      order_id: order.id,
      order_number: order.order_number,
      previous_status: current,
      status: target
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.post("/api/internal/orders/:orderId/supplier-submit", requireInternal, async (req, res, next) => {
  try {
    const result = await submitSupplierOrder(req.params.orderId);
    res.status(result.submitted ? 200 : 409).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/internal/supplier/sync", requireInternal, async (_req, res, next) => {
  try {
    res.json({ ok: true, ...(await syncSupplierOrders({ force: true })) });
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
        provider: "supplier"
      });
    }

    await partGrade.userInfo();
    res.json({
      ok: true,
      configured: true,
      provider: "supplier",
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
      provider: "supplier",
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
    res.json({ source: "supplier", items });
  } catch (error) {
    next(error);
  }
});

app.get("/api/supplier/order-statuses", requireInternal, async (_req, res, next) => {
  try {
    const rows = await partGrade.orderStatuses();
    res.json({ source: "supplier", statuses: Array.isArray(rows) ? rows : [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/supplier/orders", requireInternal, async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 20)));
    const skip = Math.max(0, Number(req.query?.skip || 0));
    const data = await partGrade.orders({ limit, skip });
    res.json({ source: "supplier", data });
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
      source: "supplier",
      payment_methods: paymentMethods,
      shipment_methods: shipmentMethods,
      shipment_addresses: shipmentAddresses
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/search/interpret", aiSearchLimiter, async (req, res, next) => {
  try {
    const query = String(req.body?.query || "").trim().slice(0, 400);
    if (!query) return res.status(400).json({ error: "query_required" });

    const user = pool ? await currentUser(req) : null;
    const requestedVehicleId = String(req.body?.vehicle_id || "").trim();
    let vehicle = null;

    if (pool && user && requestedVehicleId) {
      const vehicleResult = await pool.query(
        `SELECT id, brand, model, generation, year, engine, vin, plate_number,
                current_mileage, is_default
           FROM vehicles
          WHERE id = $1 AND user_id = $2
          LIMIT 1`,
        [requestedVehicleId, user.id]
      );
      vehicle = vehicleResult.rows[0] || null;
    } else if (pool && user) {
      const vehicleResult = await pool.query(
        `SELECT id, brand, model, generation, year, engine, vin, plate_number,
                current_mileage, is_default
           FROM vehicles
          WHERE user_id = $1
          ORDER BY is_default DESC, created_at ASC
          LIMIT 1`,
        [user.id]
      );
      vehicle = vehicleResult.rows[0] || null;
    }

    const result = await interpretSearch(query, vehicle);

    res.json({
      ok: true,
      mode: result.mode,
      model: result.model,
      ai_configured: Boolean(
          String(process.env.TIMEWEB_AI_TOKEN || "").trim() ||
          String(process.env.OPENAI_API_KEY || "").trim()
        ),
      vehicle: normalizeVehicle(vehicle),
      intent: result.intent
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/search/health", (_req, res) => {
  const timewebConfigured = Boolean(String(process.env.TIMEWEB_AI_TOKEN || "").trim());
  const openAIConfigured = Boolean(String(process.env.OPENAI_API_KEY || "").trim());
  res.json({
    ok: true,
    ai_configured: timewebConfigured || openAIConfigured,
    provider: timewebConfigured ? "timeweb_ai_gateway" : (openAIConfigured ? "openai" : "fallback"),
    model: timewebConfigured
      ? String(process.env.TIMEWEB_AI_MODEL || "openai/gpt-5.6-luna")
      : String(process.env.OPENAI_SEARCH_MODEL || "gpt-5.6-luna"),
    openai_configured: openAIConfigured,
    timeweb_gateway_configured: timewebConfigured
  });
});

function publicVehicleCatalogCandidate(candidate) {
  return {
    id: candidate?.id ? String(candidate.id) : null,
    name: candidate?.name || null,
    group_name: candidate?.groupName || null,
    year_from: candidate?.yearFrom || null,
    year_to: candidate?.yearTo || null,
    fuel_type: candidate?.fuelType || null,
    power_hp: candidate?.powerHP || null,
    motor_codes: candidate?.motorCodes || null,
    cylinder_capacity_ccm: candidate?.cylinderCapacityCcm || null
  };
}

function validVin(value) {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(String(value || "").trim().toUpperCase());
}

function publicFapiVehicle(decoded) {
  return {
    vin: decoded?.vin || null,
    confidence: decoded?.confidence || null,
    manufacturer: decoded?.manufacturer || null,
    brand_name: decoded?.brand_name || null,
    model_name: decoded?.model_name || null,
    modification_name: decoded?.modification_name || null,
    model_year: decoded?.model_year || null,
    production_date: decoded?.production_date || null,
    engine_code: decoded?.engine_code || null,
    engine_type: decoded?.engine_type || null,
    fuel_type: decoded?.fuel_type || null,
    displacement_cc: decoded?.displacement_cc || null,
    power_hp: decoded?.power_hp || null,
    transmission: decoded?.transmission || null,
    gearbox_code: decoded?.gearbox_code || null,
    drive_type: decoded?.drive_type || null,
    body_type: decoded?.body_type || null,
    dt_manufacturer_id: decoded?.dt_manufacturer_id || null,
    dt_model_id: decoded?.dt_model_id || null,
    dt_type_id: decoded?.dt_type_id || null
  };
}

async function persistFapiBinding(userId, vehicleId, decoded) {
  if (!pool || !decoded?.dt_type_id) return;
  await pool.query(
    `UPDATE vehicles
        SET catalog_provider = 'fapi_v2',
            catalog_manufacturer_id = $3,
            catalog_model_id = $4,
            catalog_modification_id = $5,
            catalog_modification_name = $6,
            catalog_verified_at = now(),
            updated_at = now()
      WHERE id = $1 AND user_id = $2`,
    [
      vehicleId,
      userId,
      decoded?.dt_manufacturer_id ? String(decoded.dt_manufacturer_id) : null,
      decoded?.dt_model_id ? String(decoded.dt_model_id) : null,
      String(decoded.dt_type_id),
      decoded?.modification_name || null
    ]
  );
}

async function resolveFapiVinFitment(vehicle, intent, query) {
  const vin = String(vehicle?.vin || "").trim().toUpperCase();
  if (!fapi.configured() || !validVin(vin)) return null;
  if (String(intent?.special_category || "none") !== "none") return null;

  const decoded = await fapi.decodeVin(vin);
  const modificationId = Number(decoded?.dt_type_id || 0);
  if (!modificationId) {
    return {
      status: "vin_not_exact",
      decoded: publicFapiVehicle(decoded),
      nodes: [],
      articles: []
    };
  }

  const tree = await fapi.tree(modificationId);
  const nodes = selectFapiNodes(tree, intent, query, 4);
  if (!nodes.length) {
    return {
      status: "part_group_not_found",
      decoded: publicFapiVehicle(decoded),
      nodes: [],
      articles: []
    };
  }

  const chunks = await Promise.all(
    nodes.slice(0, 3).map((node) => fapi.oem(modificationId, node.id))
  );
  const direct = uniqueOemRows(chunks.flat(), 16);
  const preferred = direct.some((row) => !row.fit)
    ? direct.filter((row) => !row.fit)
    : direct;

  const articles = preferred.slice(0, 10).map((row) => ({
    brand: row.brand,
    article: row.article,
    description: row.description || "Оригинальная деталь",
    goods_group_code: String(intent?.category || "oem"),
    goods_group_name: nodes[0]?.name || String(intent?.part_name || "Деталь"),
    fit_axle: null,
    fitment_note: row.fit ? "Каталог: " + String(row.fit) : null,
    source: "fapi_oem"
  }));

  return {
    status: articles.length ? "resolved" : "oem_not_found",
    decoded: publicFapiVehicle(decoded),
    nodes,
    articles
  };
}

function catalogInfoModification(info) {
  return info?.modification && typeof info.modification === "object"
    ? info.modification
    : {};
}

function catalogBindingMatchesVehicle(info, vehicle) {
  const modification = catalogInfoModification(info);
  const catalogBrand = compactText(modification.manufacturerName || modification.manufacturer || "");
  const vehicleBrand = compactText(vehicle?.brand || "");
  const catalogModel = compactText(modification.modelName || modification.model || "");
  const vehicleModel = compactText(vehicle?.model || "");

  if (catalogBrand && vehicleBrand && !(catalogBrand.includes(vehicleBrand) || vehicleBrand.includes(catalogBrand))) {
    return false;
  }
  if (catalogModel && vehicleModel && !(catalogModel.includes(vehicleModel) || vehicleModel.includes(catalogModel))) {
    return false;
  }
  return true;
}

async function persistVehicleCatalogBinding(userId, vehicleId, resolved) {
  if (!pool || !resolved?.modification?.id) return;
  await pool.query(
    `UPDATE vehicles
        SET catalog_provider = 'abcp_carbase',
            catalog_manufacturer_id = $3,
            catalog_model_id = $4,
            catalog_modification_id = $5,
            catalog_modification_name = $6,
            catalog_verified_at = now(),
            updated_at = now()
      WHERE id = $1 AND user_id = $2`,
    [
      vehicleId,
      userId,
      resolved.manufacturer?.id || null,
      resolved.model?.id || null,
      String(resolved.modification.id),
      resolved.modification?.name || null
    ]
  );
}

app.get("/api/catalog/fapi/status", (_req, res) => {
  res.json({
    ok: true,
    provider: "fapi_v2",
    configured: fapi.configured(),
    capabilities: {
      vin_decode: true,
      vehicle_tree: true,
      oem_by_vehicle: true,
      analogs: true,
      live_supplier_offers: true
    }
  });
});

app.get("/api/catalog/vin-decode", requireUser, aiSearchLimiter, async (req, res, next) => {
  try {
    if (!fapi.configured()) return res.status(503).json({ error: "fapi_not_configured" });
    const vin = String(req.query?.vin || "").trim().toUpperCase();
    if (!validVin(vin)) return res.status(400).json({ error: "invalid_vin" });

    const decoded = await fapi.decodeVin(vin);
    return res.json({
      ok: true,
      provider: "fapi_v2",
      exact_catalog_match: Boolean(decoded?.dt_type_id),
      decoded: publicFapiVehicle(decoded)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/catalog/vehicle-catalog/status", aiSearchLimiter, async (_req, res) => {
  try {
    const rows = await vehicleCatalog.manufacturers();
    const manufacturers = Array.isArray(rows)
      ? rows.length
      : (rows && typeof rows === "object" ? Object.keys(rows).length : 0);
    return res.json({
      ok: true,
      available: manufacturers > 0,
      manufacturers,
      capabilities: ABCP_CARBASE_CAPABILITIES
    });
  } catch (error) {
    console.warn("[VehicleCatalog]", error?.code || error?.message || "unavailable");
    return res.json({
      ok: true,
      available: false,
      manufacturers: 0,
      capabilities: ABCP_CARBASE_CAPABILITIES
    });
  }
});

app.post("/api/catalog/ai-search-public", aiSearchLimiter, async (req, res, next) => {
  try {
    const query = String(req.body?.query || "").trim().replace(/\s+/g, " ").slice(0, 400);
    if (!query) return res.status(400).json({ error: "query_required" });

    const suppliedVehicle = req.body?.vehicle && typeof req.body.vehicle === "object"
      ? normalizeVehicle(req.body.vehicle)
      : null;

    const interpreted = await interpretSearch(query, suppliedVehicle);
    const intent = interpreted.intent;

    if (suppliedVehicle && fapi.configured() && validVin(suppliedVehicle.vin)) {
      try {
        const publicFapiFitment = await resolveFapiVinFitment(suppliedVehicle, intent, query);
        if (publicFapiFitment?.status === "resolved" && publicFapiFitment.articles.length) {
          return res.json({
            ok: true,
            mode: "verified_articles",
            interpreter: interpreted.mode,
            ai_configured: Boolean(
              String(process.env.TIMEWEB_AI_TOKEN || "").trim() ||
              String(process.env.OPENAI_API_KEY || "").trim()
            ),
            vehicle: normalizeVehicle({
              ...suppliedVehicle,
              brand: publicFapiFitment.decoded.brand_name || publicFapiFitment.decoded.manufacturer || suppliedVehicle.brand || "",
              model: publicFapiFitment.decoded.model_name || suppliedVehicle.model || "",
              generation: publicFapiFitment.decoded.modification_name || suppliedVehicle.generation || "",
              year: publicFapiFitment.decoded.model_year || suppliedVehicle.year || null,
              engine: [
                publicFapiFitment.decoded.engine_code,
                publicFapiFitment.decoded.displacement_cc ? Math.round(Number(publicFapiFitment.decoded.displacement_cc) / 100) / 10 + " л" : null,
                publicFapiFitment.decoded.fuel_type
              ].filter(Boolean).join(" ")
            }),
            intent,
            fitment_status: "vin_catalog_match",
            vehicle_identity: {
              vin_present: true,
              vin_decoded: true,
              identification_source: "vindec_fapi"
            },
            vin_decode: publicFapiFitment.decoded,
            catalog: {
              provider: "fapi_v2",
              manufacturer: {
                id: publicFapiFitment.decoded.dt_manufacturer_id || null,
                name: publicFapiFitment.decoded.brand_name || publicFapiFitment.decoded.manufacturer || null
              },
              model: {
                id: publicFapiFitment.decoded.dt_model_id || null,
                name: publicFapiFitment.decoded.model_name || null
              },
              modification: {
                id: publicFapiFitment.decoded.dt_type_id || null,
                name: publicFapiFitment.decoded.modification_name || null
              },
              matched_nodes: publicFapiFitment.nodes
            },
            articles: publicFapiFitment.articles
          });
        }
      } catch (error) {
        console.warn("[FapiPublicFitment]", error?.code || error?.message || "failed");
      }
    }

    if (intent?.clarification_needed) {
      return res.json({
        ok: true,
        mode: "clarification",
        interpreter: interpreted.mode,
        ai_configured: Boolean(
          String(process.env.TIMEWEB_AI_TOKEN || "").trim() ||
          String(process.env.OPENAI_API_KEY || "").trim()
        ),
        vehicle: suppliedVehicle,
        intent,
        question: intent.clarification_question || "Уточните деталь."
      });
    }

    return res.json(await buildResearchSearchResult(
      query,
      suppliedVehicle,
      interpreted,
      intent
    ));
  } catch (error) {
    next(error);
  }
});

app.post("/api/catalog/ai-search", requireDatabase, requireUser, aiSearchLimiter, async (req, res, next) => {
  try {
    const query = String(req.body?.query || "").trim().replace(/\s+/g, " ").slice(0, 400);
    if (!query) return res.status(400).json({ error: "query_required" });

    const requestedVehicleId = String(req.body?.vehicle_id || "").trim();
    const vehicleResult = await pool.query(
      `SELECT id, brand, model, generation, year, engine, vin, plate_number,
              current_mileage, is_default, catalog_provider, catalog_manufacturer_id,
              catalog_model_id, catalog_modification_id, catalog_modification_name,
              catalog_verified_at
         FROM vehicles
        WHERE user_id = $1
          AND ($2::text = '' OR id::text = $2)
        ORDER BY CASE WHEN id::text = $2 THEN 0 WHEN is_default THEN 1 ELSE 2 END, created_at ASC
        LIMIT 1`,
      [req.user.id, requestedVehicleId]
    );

    const vehicle = vehicleResult.rows[0] || null;
    const interpreted = await interpretSearch(query, vehicle);
    const intent = interpreted.intent;

    if (!vehicle) {
      return res.json(await buildResearchSearchResult(query, null, interpreted, intent));
    }

    if (intent?.clarification_needed) {
      return res.json({
        ok: true,
        mode: "clarification",
        interpreter: interpreted.mode,
        ai_configured: Boolean(
          String(process.env.TIMEWEB_AI_TOKEN || "").trim() ||
          String(process.env.OPENAI_API_KEY || "").trim()
        ),
        vehicle: normalizeVehicle(vehicle),
        intent,
        question: intent.clarification_question || "Уточните деталь."
      });
    }

    if (fapi.configured() && validVin(vehicle.vin)) {
      try {
        const fapiFitment = await resolveFapiVinFitment(vehicle, intent, query);
        if (fapiFitment?.status === "resolved" && fapiFitment.articles.length) {
          await persistFapiBinding(req.user.id, vehicle.id, fapiFitment.decoded);
          return res.json({
            ok: true,
            mode: "verified_articles",
            interpreter: interpreted.mode,
            ai_configured: Boolean(
              String(process.env.TIMEWEB_AI_TOKEN || "").trim() ||
              String(process.env.OPENAI_API_KEY || "").trim()
            ),
            vehicle: normalizeVehicle(vehicle),
            intent,
            fitment_status: "vin_catalog_match",
            vehicle_identity: {
              vin_present: true,
              vin_decoded: true,
              identification_source: "vindec_fapi"
            },
            vin_decode: fapiFitment.decoded,
            catalog: {
              provider: "fapi_v2",
              manufacturer: {
                id: fapiFitment.decoded.dt_manufacturer_id || null,
                name: fapiFitment.decoded.brand_name || fapiFitment.decoded.manufacturer || vehicle.brand || null
              },
              model: {
                id: fapiFitment.decoded.dt_model_id || null,
                name: fapiFitment.decoded.model_name || vehicle.model || null
              },
              modification: {
                id: fapiFitment.decoded.dt_type_id || null,
                name: fapiFitment.decoded.modification_name || null
              },
              matched_nodes: fapiFitment.nodes
            },
            articles: fapiFitment.articles
          });
        }
      } catch (error) {
        console.warn("[FapiFitment]", error?.code || error?.message || "failed");
      }
    }

    const coverage = catalogCoverageForIntent(intent, vehicleCatalog.capabilities);
    if (!coverage.supported) {
      return res.json(await buildResearchSearchResult(query, vehicle, interpreted, intent));
    }

    let resolved;
    try {
      resolved = await resolveVehicleCatalog(vehicleCatalog, vehicle);
    } catch (error) {
      console.warn("[VehicleCatalogResolve]", error?.code || error?.message || "failed");
      return res.json(await buildResearchSearchResult(query, vehicle, interpreted, intent));
    }

    if (resolved.status === "model_ambiguous" || resolved.status === "manufacturer_not_found" || resolved.status === "modification_not_found") {
      return res.json({
        ok: true,
        mode: "vehicle_needs_details",
        resolver_status: resolved.status,
        interpreter: interpreted.mode,
        ai_configured: Boolean(
          String(process.env.TIMEWEB_AI_TOKEN || "").trim() ||
          String(process.env.OPENAI_API_KEY || "").trim()
        ),
        vehicle: normalizeVehicle(vehicle),
        intent,
        vehicle_identity: {
          vin_present: Boolean(String(vehicle.vin || "").trim()),
          vin_decoded: false,
          identification_source: "garage_facts"
        },
        candidates: (resolved.candidates || []).slice(0, 8).map(publicVehicleCatalogCandidate)
      });
    }

    if (resolved.status === "modification_ambiguous") {
      return res.json({
        ok: true,
        mode: "choose_modification",
        resolver_status: resolved.status,
        interpreter: interpreted.mode,
        ai_configured: Boolean(
          String(process.env.TIMEWEB_AI_TOKEN || "").trim() ||
          String(process.env.OPENAI_API_KEY || "").trim()
        ),
        vehicle: normalizeVehicle(vehicle),
        intent,
        vehicle_identity: {
          vin_present: Boolean(String(vehicle.vin || "").trim()),
          vin_decoded: false,
          identification_source: "garage_facts"
        },
        manufacturer: resolved.manufacturer || null,
        model: resolved.model || null,
        candidates: (resolved.candidates || []).slice(0, 12).map(publicVehicleCatalogCandidate)
      });
    }

    if (resolved.status !== "resolved") {
      return res.json(await buildResearchSearchResult(query, vehicle, interpreted, intent));
    }

    const special = vehicleSpecsForIntent(resolved.info, intent);
    if (special) {
      return res.json({
        ok: true,
        mode: "vehicle_specs",
        interpreter: interpreted.mode,
        ai_configured: Boolean(
          String(process.env.TIMEWEB_AI_TOKEN || "").trim() ||
          String(process.env.OPENAI_API_KEY || "").trim()
        ),
        vehicle: normalizeVehicle(vehicle),
        intent,
        catalog: {
          provider: vehicleCatalog.id,
          manufacturer: resolved.manufacturer || null,
          model: resolved.model || null,
          modification: resolved.modification || null
        },
        fitment_status: "vehicle_catalog_match",
        vehicle_identity: {
          vin_present: Boolean(String(vehicle.vin || "").trim()),
          vin_decoded: false,
          identification_source: resolved.source === "saved" ? "saved_catalog_binding" : "garage_facts"
        },
        specs: special
      });
    }

    const articles = selectVerifiedArticles(resolved.info, intent, query, 10)
      .filter((item) => item.brand && item.article)
      .map((item) => ({
        brand: String(item.brand),
        article: String(item.article),
        description: item.description || item.goods_group_name || "Запчасть",
        goods_group_code: item.goods_group_code || null,
        goods_group_name: item.goods_group_name || null,
        fit_axle: item.fit_axle || null
      }));

    if (!articles.length) {
      return res.json(await buildResearchSearchResult(query, vehicle, interpreted, intent));
    }

    return res.json({
      ok: true,
      mode: "verified_articles",
      interpreter: interpreted.mode,
      ai_configured: Boolean(
          String(process.env.TIMEWEB_AI_TOKEN || "").trim() ||
          String(process.env.OPENAI_API_KEY || "").trim()
        ),
      vehicle: normalizeVehicle(vehicle),
      intent,
      fitment_status: resolved.source === "saved"
        ? "catalog_fitment_confirmed"
        : "vehicle_catalog_match",
      vehicle_identity: {
        vin_present: Boolean(String(vehicle.vin || "").trim()),
        vin_decoded: false,
        identification_source: resolved.source === "saved" ? "saved_catalog_binding" : "garage_facts"
      },
      catalog: {
        provider: vehicleCatalog.id,
        manufacturer: resolved.manufacturer || null,
        model: resolved.model || null,
        modification: resolved.modification || null
      },
      articles
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/garage/vehicles/:vehicleId/vin-decode", requireUser, aiSearchLimiter, async (req, res, next) => {
  try {
    if (!fapi.configured()) return res.status(503).json({ error: "fapi_not_configured" });
    const found = await pool.query(
      `SELECT id, brand, model, generation, year, engine, vin, plate_number
         FROM vehicles
        WHERE id = $1 AND user_id = $2
        LIMIT 1`,
      [req.params.vehicleId, req.user.id]
    );
    const vehicle = found.rows[0];
    if (!vehicle) return res.status(404).json({ error: "vehicle_not_found" });
    const vin = String(vehicle.vin || "").trim().toUpperCase();
    if (!validVin(vin)) return res.status(400).json({ error: "invalid_vin" });

    const decoded = await fapi.decodeVin(vin);
    if (decoded?.dt_type_id) {
      await persistFapiBinding(req.user.id, vehicle.id, decoded);
    }
    return res.json({
      ok: true,
      provider: "fapi_v2",
      decoded: publicFapiVehicle(decoded),
      exact_catalog_match: Boolean(decoded?.dt_type_id)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/garage/vehicles/:vehicleId/catalog-modification", requireUser, aiSearchLimiter, async (req, res, next) => {
  try {
    const modificationId = String(req.body?.modification_id || "").trim();
    if (!modificationId) return res.status(400).json({ error: "modification_required" });

    const owned = await pool.query(
      `SELECT id, brand, model, generation, year, engine, vin, plate_number,
              current_mileage, is_default
         FROM vehicles
        WHERE id = $1 AND user_id = $2
        LIMIT 1`,
      [req.params.vehicleId, req.user.id]
    );
    const vehicle = owned.rows[0];
    if (!vehicle) return res.status(404).json({ error: "vehicle_not_found" });

    const info = await partGrade.carbaseModificationInfo(modificationId);
    if (!catalogBindingMatchesVehicle(info, vehicle)) {
      return res.status(400).json({ error: "catalog_vehicle_mismatch" });
    }

    const modification = catalogInfoModification(info);
    const resolved = {
      manufacturer: {
        id: modification.manufacturerId ? String(modification.manufacturerId) : null,
        name: modification.manufacturerName || vehicle.brand
      },
      model: {
        id: modification.modelId ? String(modification.modelId) : null,
        name: modification.modelName || vehicle.model
      },
      modification: {
        id: modificationId,
        name: modification.modificationName || modification.name || null
      }
    };

    await persistVehicleCatalogBinding(req.user.id, vehicle.id, resolved);
    return res.json({
      ok: true,
      catalog: {
        provider: "abcp_carbase",
        manufacturer: resolved.manufacturer,
        model: resolved.model,
        modification: resolved.modification
      }
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
      source: "live_supplier",
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

app.get("/api/auth/capabilities", (_req, res) => {
  res.json({
    phone_verification: Boolean(String(process.env.SMSRU_API_ID || "").trim()),
    password_recovery: Boolean(String(process.env.SMSRU_API_ID || "").trim()),
    session_days: SESSION_DAYS
  });
});

app.post("/api/auth/register/start", authLimiter, async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim().slice(0, 120);
    const surname = String(req.body?.surname || "").trim().slice(0, 120) || null;
    const phone = normalizePhone(req.body?.phone);
    const password = String(req.body?.password || "");
    const passwordConfirmation = String(req.body?.password_confirmation || "");

    if (!name || !phone) {
      return res.status(400).json({ error: "name_and_identity_required" });
    }
    if (!validSmsPhone(phone)) {
      return res.status(400).json({ error: "invalid_phone" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "password_too_short" });
    }
    if (password !== passwordConfirmation) {
      return res.status(400).json({ error: "passwords_do_not_match" });
    }

    const exists = await pool.query(
      "SELECT id FROM users WHERE phone = $1 LIMIT 1",
      [phone]
    );
    if (exists.rowCount) {
      return res.status(409).json({ error: "user_already_exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const challenge = await createAuthChallenge({
      purpose: "register",
      phone,
      name,
      surname,
      passwordHash
    });

    return res.status(202).json({ ok: true, ...challenge });
  } catch (error) {
    const handled = authChallengeError(res, error);
    if (handled) return handled;
    next(error);
  }
});

app.post("/api/auth/register/verify", authLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const challengeId = String(req.body?.challenge_id || "").trim();
    const code = String(req.body?.code || "").trim();

    if (!challengeId || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "verification_code_required" });
    }

    await client.query("BEGIN");
    const found = await client.query(
      `SELECT *
         FROM auth_challenges
        WHERE id = $1 AND purpose = 'register'
        FOR UPDATE`,
      [challengeId]
    );
    const challenge = found.rows[0];

    if (
      !challenge ||
      challenge.consumed_at ||
      Number(challenge.attempts) >= OTP_MAX_ATTEMPTS ||
      new Date(challenge.expires_at).getTime() <= Date.now()
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "verification_expired" });
    }

    if (!otpMatches(otpSecret(), challenge.id, code, challenge.code_hash)) {
      await client.query(
        "UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = $1",
        [challenge.id]
      );
      await client.query("COMMIT");
      return res.status(400).json({ error: "verification_code_invalid" });
    }

    const exists = await client.query(
      "SELECT id FROM users WHERE phone = $1 LIMIT 1",
      [challenge.phone]
    );
    if (exists.rowCount) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "user_already_exists" });
    }

    const inserted = await client.query(
      `INSERT INTO users
        (name, surname, email, phone, password_hash, phone_verified_at)
       VALUES ($1,$2,NULL,$3,$4,now())
       RETURNING *`,
      [challenge.name, challenge.surname, challenge.phone, challenge.password_hash]
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
    await client.query(
      "UPDATE auth_challenges SET consumed_at = now() WHERE id = $1",
      [challenge.id]
    );

    await client.query("COMMIT");
    const accessToken = await issueSession(req, res, user.id);
    return res.status(201).json({
      user: publicUser(user),
      access_token: accessToken,
      expires_in: SESSION_DAYS * 24 * 60 * 60
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.post("/api/auth/password-reset/start", authLimiter, async (req, res, next) => {
  try {
    const identity = String(req.body?.identity || "").trim();
    if (!identity) {
      return res.status(400).json({ error: "identity_required" });
    }

    const email = identity.includes("@") ? normalizeEmail(identity) : null;
    const phone = identity.includes("@") ? null : normalizePhone(identity);
    const result = await pool.query(
      `SELECT id, phone
         FROM users
        WHERE status = 'active'
          AND (($1::text IS NOT NULL AND lower(email) = $1)
            OR ($2::text IS NOT NULL AND phone = $2))
        LIMIT 1`,
      [email, phone]
    );
    const user = result.rows[0];

    if (!user?.phone || !validSmsPhone(user.phone)) {
      return res.status(202).json({
        ok: true,
        challenge_id: crypto.randomUUID(),
        masked_phone: null,
        expires_in: OTP_TTL_MINUTES * 60,
        resend_in: OTP_RESEND_SECONDS
      });
    }

    const challenge = await createAuthChallenge({
      purpose: "password_reset",
      phone: user.phone,
      userId: user.id
    });
    return res.status(202).json({ ok: true, ...challenge });
  } catch (error) {
    const handled = authChallengeError(res, error);
    if (handled) return handled;
    next(error);
  }
});

app.post("/api/auth/password-reset/verify", authLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const challengeId = String(req.body?.challenge_id || "").trim();
    const code = String(req.body?.code || "").trim();
    const password = String(req.body?.password || "");
    const passwordConfirmation = String(req.body?.password_confirmation || "");

    if (!challengeId || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "verification_code_required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "password_too_short" });
    }
    if (password !== passwordConfirmation) {
      return res.status(400).json({ error: "passwords_do_not_match" });
    }

    await client.query("BEGIN");
    const found = await client.query(
      `SELECT *
         FROM auth_challenges
        WHERE id = $1 AND purpose = 'password_reset'
        FOR UPDATE`,
      [challengeId]
    );
    const challenge = found.rows[0];

    if (
      !challenge ||
      !challenge.user_id ||
      challenge.consumed_at ||
      Number(challenge.attempts) >= OTP_MAX_ATTEMPTS ||
      new Date(challenge.expires_at).getTime() <= Date.now()
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "verification_expired" });
    }

    if (!otpMatches(otpSecret(), challenge.id, code, challenge.code_hash)) {
      await client.query(
        "UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = $1",
        [challenge.id]
      );
      await client.query("COMMIT");
      return res.status(400).json({ error: "verification_code_invalid" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const updated = await client.query(
      `UPDATE users
          SET password_hash = $2,
              phone_verified_at = COALESCE(phone_verified_at, now()),
              updated_at = now()
        WHERE id = $1 AND status = 'active'
        RETURNING *`,
      [challenge.user_id, passwordHash]
    );
    const user = updated.rows[0];
    if (!user) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "verification_expired" });
    }

    await client.query("DELETE FROM user_sessions WHERE user_id = $1", [user.id]);
    await client.query(
      "UPDATE auth_challenges SET consumed_at = now() WHERE id = $1",
      [challenge.id]
    );
    await client.query("COMMIT");

    const accessToken = await issueSession(req, res, user.id);
    return res.json({
      user: publicUser(user),
      access_token: accessToken,
      expires_in: SESSION_DAYS * 24 * 60 * 60
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.post("/api/auth/register", authLimiter, async (_req, res) => {
  return res.status(409).json({
    error: "phone_verification_required",
    start: "/api/auth/register/start",
    verify: "/api/auth/register/verify"
  });
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
    const accessToken = await issueSession(req, res, user.id);
    res.json({
      user: publicUser(user),
      access_token: accessToken,
      expires_in: SESSION_DAYS * 24 * 60 * 60
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", async (req, res, next) => {
  try {
    const token = sessionTokenFromRequest(req);
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

app.get("/api/account/preferences", requireUser, async (req, res, next) => {
  try {
    await pool.query(
      "INSERT INTO user_notification_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
      [req.user.id]
    );

    const [notifications, address] = await Promise.all([
      pool.query(
        `SELECT order_status, item_changes, returns, marketing
           FROM user_notification_settings
          WHERE user_id = $1
          LIMIT 1`,
        [req.user.id]
      ),
      pool.query(
        `SELECT id, city, address, recipient_name, recipient_phone, is_default
           FROM user_addresses
          WHERE user_id = $1
          ORDER BY is_default DESC, updated_at DESC, created_at DESC
          LIMIT 1`,
        [req.user.id]
      )
    ]);

    res.json({
      notifications: notifications.rows[0] || {
        order_status: true,
        item_changes: true,
        returns: true,
        marketing: false
      },
      delivery: address.rows[0] || null
    });
  } catch (error) {
    next(error);
  }
});

app.put("/api/account/notifications", requireUser, async (req, res, next) => {
  try {
    const values = {
      order_status: req.body?.order_status !== false,
      item_changes: req.body?.item_changes !== false,
      returns: req.body?.returns !== false,
      marketing: req.body?.marketing === true
    };

    const result = await pool.query(
      `INSERT INTO user_notification_settings
        (user_id, order_status, item_changes, returns, marketing, updated_at)
       VALUES ($1,$2,$3,$4,$5,now())
       ON CONFLICT (user_id)
       DO UPDATE SET order_status = EXCLUDED.order_status,
                     item_changes = EXCLUDED.item_changes,
                     returns = EXCLUDED.returns,
                     marketing = EXCLUDED.marketing,
                     updated_at = now()
       RETURNING order_status, item_changes, returns, marketing`,
      [
        req.user.id,
        values.order_status,
        values.item_changes,
        values.returns,
        values.marketing
      ]
    );

    res.json({ notifications: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/account/notifications", requireUser, async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 30)));
    const [feed, unread] = await Promise.all([
      pool.query(
        `SELECT id, type, title, body, read_at, created_at
           FROM notifications
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT $2`,
        [req.user.id, limit]
      ),
      pool.query(
        `SELECT count(*)::int AS count
           FROM notifications
          WHERE user_id = $1 AND read_at IS NULL`,
        [req.user.id]
      )
    ]);

    res.json({
      notifications: feed.rows,
      unread_count: Number(unread.rows[0]?.count || 0)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/account/notifications/read", requireUser, async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map((id) => String(id || "").trim()).filter(Boolean).slice(0, 100)
      : [];

    let result;
    if (ids.length) {
      result = await pool.query(
        `UPDATE notifications
            SET read_at = COALESCE(read_at, now())
          WHERE user_id = $1
            AND id = ANY($2::uuid[])
        RETURNING id`,
        [req.user.id, ids]
      );
    } else {
      result = await pool.query(
        `UPDATE notifications
            SET read_at = COALESCE(read_at, now())
          WHERE user_id = $1
            AND read_at IS NULL
        RETURNING id`,
        [req.user.id]
      );
    }

    res.json({ ok: true, updated: result.rowCount });
  } catch (error) {
    next(error);
  }
});

app.put("/api/account/delivery", requireUser, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const city = String(req.body?.city || "").trim().slice(0, 120);
    const address = String(req.body?.address || "").trim().slice(0, 500);
    const recipientName = String(req.body?.recipient_name || req.body?.recipient || "").trim().slice(0, 200) || null;
    const recipientPhone = normalizePhone(req.body?.recipient_phone || req.body?.phone);

    if (!city || !address) {
      return res.status(400).json({ error: "delivery_city_and_address_required" });
    }

    await client.query("BEGIN");
    await client.query(
      "UPDATE user_addresses SET is_default = false, updated_at = now() WHERE user_id = $1",
      [req.user.id]
    );

    const result = await client.query(
      `INSERT INTO user_addresses
        (user_id, label, city, address, recipient_name, recipient_phone, is_default, created_at, updated_at)
       VALUES ($1,'Основное получение',$2,$3,$4,$5,true,now(),now())
       RETURNING id, city, address, recipient_name, recipient_phone, is_default`,
      [req.user.id, city, address, recipientName, recipientPhone]
    );

    await client.query("COMMIT");
    res.json({ delivery: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.get("/api/account/reports", requireUser, async (req, res, next) => {
  try {
    const [orders, returns] = await Promise.all([
      pool.query(
        `SELECT count(*)::int AS orders_count,
                COALESCE(sum(total_amount),0)::numeric(14,2) AS purchases_total,
                COALESCE(avg(total_amount),0)::numeric(14,2) AS average_order
           FROM orders
          WHERE user_id = $1
            AND created_at >= date_trunc('month', now())
            AND status <> 'cancelled'`,
        [req.user.id]
      ),
      pool.query(
        `SELECT count(*)::int AS returns_count
           FROM returns
          WHERE user_id = $1
            AND created_at >= date_trunc('month', now())`,
        [req.user.id]
      )
    ]);

    res.json({
      month: new Date().toISOString().slice(0, 7),
      orders_count: orders.rows[0].orders_count,
      purchases_total: Number(orders.rows[0].purchases_total || 0),
      returns_count: returns.rows[0].returns_count,
      average_order: Number(orders.rows[0].average_order || 0)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/account/returns", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.return_number, r.quantity, r.reason, r.comment, r.status, r.created_at,
              i.brand, i.article, i.description, o.order_number
         FROM returns r
         JOIN order_items i ON i.id = r.order_item_id
         JOIN orders o ON o.id = i.order_id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC
        LIMIT 100`,
      [req.user.id]
    );
    res.json({ returns: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/account/returns", requireUser, async (req, res, next) => {
  try {
    const orderItemId = String(req.body?.order_item_id || "").trim();
    const quantity = Math.max(1, Math.min(999, Math.trunc(Number(req.body?.quantity || 1))));
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    const comment = String(req.body?.comment || "").trim().slice(0, 1000) || null;

    if (!orderItemId || !reason) {
      return res.status(400).json({ error: "return_item_and_reason_required" });
    }

    const item = await pool.query(
      `SELECT i.id, i.quantity, i.status, i.received_at, o.status AS order_status
         FROM order_items i
         JOIN orders o ON o.id = i.order_id
        WHERE i.id = $1 AND o.user_id = $2
        LIMIT 1`,
      [orderItemId, req.user.id]
    );
    if (!item.rowCount) return res.status(404).json({ error: "order_item_not_found" });

    const row = item.rows[0];
    const received = Boolean(row.received_at) || row.status === "completed" || row.order_status === "completed";
    if (!received) return res.status(409).json({ error: "return_available_after_receipt" });

    const returned = await pool.query(
      `SELECT COALESCE(sum(quantity),0)::int AS quantity
         FROM returns
        WHERE user_id = $1
          AND order_item_id = $2
          AND status <> 'rejected'`,
      [req.user.id, orderItemId]
    );
    const alreadyReturned = Number(returned.rows[0]?.quantity || 0);
    const remaining = Math.max(0, Number(row.quantity || 0) - alreadyReturned);

    if (quantity > remaining) {
      return res.status(400).json({
        error: "return_quantity_exceeds_order",
        remaining_quantity: remaining
      });
    }

    const result = await pool.query(
      `INSERT INTO returns
        (user_id, order_item_id, quantity, reason, comment, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'created',now(),now())
       RETURNING id, return_number, quantity, reason, comment, status, created_at`,
      [req.user.id, orderItemId, quantity, reason, comment]
    );

    await addUserNotification(
      pool,
      req.user.id,
      "returns",
      "return_created",
      "Возврат #" + String(result.rows[0].return_number) + " создан",
      reason
    );

    res.status(201).json({ return: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/account/overview", requireUser, async (req, res, next) => {
  try {
    const [orders, vehicles, returns, requests] = await Promise.all([
      pool.query(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE status NOT IN ('completed','cancelled'))::int AS active,
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
        total_orders: orders.rows[0].total,
        quote_requests: requests.rows[0].count,
        vehicles: vehicles.rows[0].count,
        active_returns: returns.rows[0].count
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/cart", requireUser, async (req, res, next) => {
  try {
    const cartResult = await pool.query(
      "SELECT id, updated_at FROM carts WHERE user_id = $1 LIMIT 1",
      [req.user.id]
    );

    if (!cartResult.rowCount) {
      return res.json({ items: [], updated_at: null });
    }

    const cart = cartResult.rows[0];
    const items = await pool.query(
      `SELECT ci.id, ci.client_id, ci.article, ci.brand, ci.description, ci.warehouse, ci.delivery_days,
              ci.quantity, ci.available_quantity, ci.unit_price, ci.comment, ci.selected,
              ci.checked_at, ci.offer_token, ci.vehicle_id, ci.created_at, ci.updated_at,
              v.brand AS vehicle_brand, v.model AS vehicle_model, v.generation AS vehicle_generation,
              v.vin AS vehicle_vin
         FROM cart_items ci
         LEFT JOIN vehicles v ON v.id = ci.vehicle_id AND v.user_id = $2
        WHERE ci.cart_id = $1
        ORDER BY ci.created_at ASC`,
      [cart.id, req.user.id]
    );

    res.json({
      updated_at: cart.updated_at,
      items: items.rows.map((item) => ({
        id: item.id,
        client_id: item.client_id,
        article: item.article,
        brand: item.brand,
        description: item.description,
        warehouse: item.warehouse,
        delivery_days: item.delivery_days,
        quantity: item.quantity,
        available_quantity: item.available_quantity,
        unit_price: Number(item.unit_price),
        comment: item.comment,
        selected: item.selected,
        checked_at: item.checked_at,
        offer_token: item.offer_token,
        vehicle: item.vehicle_id ? {
          id: item.vehicle_id,
          brand: item.vehicle_brand,
          model: item.vehicle_model,
          generation: item.vehicle_generation,
          vin: item.vehicle_vin
        } : null
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.put("/api/cart", requireUser, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const rawItems = Array.isArray(req.body?.items) ? req.body.items.slice(0, 100) : [];
    const items = rawItems.map((item) => {
      const price = Number(item?.unit_price);
      return {
        client_id: String(item?.client_id || "").trim().slice(0, 160) || null,
        article: String(item?.article || "").trim().slice(0, 120),
        brand: String(item?.brand || "").trim().slice(0, 80),
        description: String(item?.description || "").trim().slice(0, 300) || null,
        warehouse: String(item?.warehouse || "").trim().slice(0, 120) || null,
        delivery_days: item?.delivery_days === null || item?.delivery_days === undefined
          ? null
          : Math.max(0, Math.min(365, Math.trunc(Number(item.delivery_days) || 0))),
        quantity: Math.max(1, Math.min(999, Math.trunc(Number(item?.quantity) || 1))),
        available_quantity: item?.available_quantity === null || item?.available_quantity === undefined
          ? null
          : Math.max(0, Math.min(999999, Math.trunc(Number(item.available_quantity) || 0))),
        unit_price: Number.isFinite(price) && price >= 0
          ? Math.round((price + Number.EPSILON) * 100) / 100
          : 0,
        comment: String(item?.comment || "").trim().slice(0, 500) || null,
        selected: item?.selected !== false,
        offer_token: String(item?.offer_token || "").trim().slice(0, 4096) || null,
        vehicle_id: String(item?.vehicle_id || "").trim() || null
      };
    }).filter((item) => item.article && item.brand && item.offer_token);

    await client.query("BEGIN");

    const requestedVehicleIds=[...new Set(items.map((item)=>item.vehicle_id).filter(Boolean))];
    if(requestedVehicleIds.length){
      const ownedVehicles=await client.query(
        "SELECT id::text AS id FROM vehicles WHERE user_id = $1 AND id = ANY($2::uuid[])",
        [req.user.id, requestedVehicleIds]
      );
      const ownedSet=new Set(ownedVehicles.rows.map((row)=>String(row.id)));
      if(requestedVehicleIds.some((id)=>!ownedSet.has(String(id)))){
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "invalid_vehicle_context" });
      }
    }

    const cartResult = await client.query(
      `INSERT INTO carts (user_id, updated_at)
       VALUES ($1, now())
       ON CONFLICT (user_id)
       DO UPDATE SET updated_at = now()
       RETURNING id, updated_at`,
      [req.user.id]
    );
    const cart = cartResult.rows[0];

    await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cart.id]);

    for (const item of items) {
      await client.query(
        `INSERT INTO cart_items
          (cart_id, client_id, article, brand, description, warehouse, delivery_days,
           quantity, available_quantity, unit_price, comment, selected, checked_at,
           offer_token, vehicle_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),$13,$14,now(),now())`,
        [
          cart.id,
          item.client_id,
          item.article,
          item.brand,
          item.description,
          item.warehouse,
          item.delivery_days,
          item.quantity,
          item.available_quantity,
          item.unit_price,
          item.comment,
          item.selected,
          item.offer_token,
          item.vehicle_id
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true, items: items.length, updated_at: cart.updated_at });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.get("/api/account/orders", requireUser, async (req, res, next) => {
  try {
    await syncSupplierOrders({ userId: req.user.id }).catch((error) => {
      console.error("[SupplySync]", error?.message || "supplier_sync_failed");
    });
    const result = await pool.query(
      `SELECT o.id, o.order_number, o.status, o.total_amount, o.currency,
              o.created_at, o.updated_at, o.supplier_state, o.supplier_synced_at,
              count(i.id)::int AS items_count,
              COALESCE(string_agg(DISTINCT concat_ws(' ', i.brand, i.article), ' '),'') AS search_text
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
    const orderLookup = await pool.query(
      `SELECT id
         FROM orders
        WHERE user_id = $1
          AND (id::text = $2 OR order_number::text = $2)
        LIMIT 1`,
      [req.user.id, String(req.params.orderId)]
    );
    if (!orderLookup.rowCount) return res.status(404).json({ error: "order_not_found" });

    await syncSupplierOrders({ orderId: orderLookup.rows[0].id, force: true }).catch((error) => {
      console.error("[SupplySync]", error?.message || "supplier_sync_failed");
    });

    const orderResult = await pool.query(
      `SELECT o.id, o.order_number, o.status, o.total_amount, o.currency, o.comment,
              o.pickup_point_id, o.delivery_address_id, o.recipient_name, o.recipient_phone,
              o.supplier_state, o.supplier_submitted_at, o.supplier_synced_at,
              o.created_at, o.updated_at,
              a.city AS delivery_city, a.address AS delivery_address
         FROM orders o
         LEFT JOIN user_addresses a
           ON a.id = o.delivery_address_id
          AND a.user_id = o.user_id
        WHERE o.id = $1 AND o.user_id = $2
        LIMIT 1`,
      [orderLookup.rows[0].id, req.user.id]
    );
    const order = orderResult.rows[0];
    const [items, history] = await Promise.all([
      pool.query(
        `SELECT i.id, i.brand, i.article, i.description, i.warehouse, i.delivery_days, i.quantity,
                i.unit_price, i.comment, i.status, i.supplier_status, i.expected_at, i.received_at,
                i.vehicle_id, v.brand AS vehicle_brand, v.model AS vehicle_model,
                v.generation AS vehicle_generation, v.vin AS vehicle_vin
           FROM order_items i
           LEFT JOIN vehicles v ON v.id = i.vehicle_id
          WHERE i.order_id = $1
          ORDER BY i.created_at ASC`,
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
              bool_or(i.needs_confirmation) AS needs_confirmation,
              COALESCE(string_agg(DISTINCT concat_ws(' ', i.brand, i.article), ' '),'') AS search_text
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
      `SELECT i.brand, i.article, i.description, i.quantity, i.comment, i.quoted_price, i.needs_confirmation,
              i.vehicle_id, v.brand AS vehicle_brand, v.model AS vehicle_model,
              v.generation AS vehicle_generation, v.vin AS vehicle_vin
         FROM quote_request_items i
         LEFT JOIN vehicles v ON v.id = i.vehicle_id
        WHERE i.request_id = $1
        ORDER BY i.created_at ASC`,
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
              current_mileage, mileage_updated_at, is_default,
              catalog_provider, catalog_manufacturer_id, catalog_model_id,
              catalog_modification_id, catalog_modification_name, catalog_verified_at
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
  const client = await pool.connect();
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

    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT count(*)::int AS count FROM vehicles WHERE user_id = $1",
      [req.user.id]
    );
    const isDefault = existing.rows[0].count === 0 || req.body?.is_default === true;

    if (isDefault) {
      await client.query(
        "UPDATE vehicles SET is_default = false, updated_at = now() WHERE user_id = $1",
        [req.user.id]
      );
    }

    const result = await client.query(
      `INSERT INTO vehicles
        (user_id, brand, model, generation, year, engine, vin, plate_number, current_mileage, mileage_updated_at, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $9::int IS NULL THEN NULL ELSE now() END,$10)
       RETURNING *`,
      [req.user.id, brand, model, generation, year, engine, vin, plate, mileage, isDefault]
    );

    if (mileage !== null && Number.isFinite(mileage)) {
      await client.query(
        `INSERT INTO vehicle_mileage_logs (vehicle_id, user_id, mileage)
         VALUES ($1,$2,$3)`,
        [result.rows[0].id, req.user.id, mileage]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ vehicle: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
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
  const client = await pool.connect();
  try {
    const current = await client.query(
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
    const requestedMileage = req.body?.current_mileage === undefined
      ? vehicle.current_mileage
      : (req.body.current_mileage === null || req.body.current_mileage === "" ? null : Number(req.body.current_mileage));

    if (!brand || !model) return res.status(400).json({ error: "brand_and_model_required" });
    if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      return res.status(400).json({ error: "invalid_vin" });
    }
    if (requestedMileage !== null && (!Number.isInteger(requestedMileage) || requestedMileage < 0)) {
      return res.status(400).json({ error: "invalid_mileage" });
    }

    await client.query("BEGIN");

    if (req.body?.is_default === true) {
      await client.query(
        "UPDATE vehicles SET is_default = false, updated_at = now() WHERE user_id = $1",
        [req.user.id]
      );
    }

    const result = await client.query(
      `UPDATE vehicles
          SET brand = $3,
              model = $4,
              generation = $5,
              year = $6,
              engine = $7,
              vin = $8,
              plate_number = $9,
              current_mileage = $10,
              mileage_updated_at = CASE
                WHEN $10::int IS DISTINCT FROM current_mileage THEN now()
                ELSE mileage_updated_at
              END,
              is_default = CASE WHEN $11::boolean THEN true ELSE is_default END,
              catalog_provider = CASE
                WHEN brand IS DISTINCT FROM $3 OR model IS DISTINCT FROM $4 OR generation IS DISTINCT FROM $5
                  OR year IS DISTINCT FROM $6 OR engine IS DISTINCT FROM $7
                THEN NULL ELSE catalog_provider END,
              catalog_manufacturer_id = CASE
                WHEN brand IS DISTINCT FROM $3 OR model IS DISTINCT FROM $4 OR generation IS DISTINCT FROM $5
                  OR year IS DISTINCT FROM $6 OR engine IS DISTINCT FROM $7
                THEN NULL ELSE catalog_manufacturer_id END,
              catalog_model_id = CASE
                WHEN brand IS DISTINCT FROM $3 OR model IS DISTINCT FROM $4 OR generation IS DISTINCT FROM $5
                  OR year IS DISTINCT FROM $6 OR engine IS DISTINCT FROM $7
                THEN NULL ELSE catalog_model_id END,
              catalog_modification_id = CASE
                WHEN brand IS DISTINCT FROM $3 OR model IS DISTINCT FROM $4 OR generation IS DISTINCT FROM $5
                  OR year IS DISTINCT FROM $6 OR engine IS DISTINCT FROM $7
                THEN NULL ELSE catalog_modification_id END,
              catalog_modification_name = CASE
                WHEN brand IS DISTINCT FROM $3 OR model IS DISTINCT FROM $4 OR generation IS DISTINCT FROM $5
                  OR year IS DISTINCT FROM $6 OR engine IS DISTINCT FROM $7
                THEN NULL ELSE catalog_modification_name END,
              catalog_verified_at = CASE
                WHEN brand IS DISTINCT FROM $3 OR model IS DISTINCT FROM $4 OR generation IS DISTINCT FROM $5
                  OR year IS DISTINCT FROM $6 OR engine IS DISTINCT FROM $7
                THEN NULL ELSE catalog_verified_at END,
              updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
      [
        req.params.vehicleId,
        req.user.id,
        brand,
        model,
        generation,
        year,
        engine,
        vin,
        plate,
        requestedMileage,
        req.body?.is_default === true
      ]
    );

    if (
      requestedMileage !== null &&
      Number(requestedMileage) !== Number(vehicle.current_mileage)
    ) {
      await client.query(
        `INSERT INTO vehicle_mileage_logs (vehicle_id, user_id, mileage)
         VALUES ($1,$2,$3)`,
        [req.params.vehicleId, req.user.id, requestedMileage]
      );
    }

    await client.query("COMMIT");
    res.json({ vehicle: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.post("/api/garage/vehicles/:vehicleId/default", requireUser, async (req, res, next) => {
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

    await client.query(
      "UPDATE vehicles SET is_default = false, updated_at = now() WHERE user_id = $1",
      [req.user.id]
    );
    const result = await client.query(
      `UPDATE vehicles
          SET is_default = true, updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
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


const PARTGRADE_MCP_KEY_SHA256 = "13604cdac48b4536fe42dd31cb69097f1f237efaa99d729e1d8d7d5c17e4ebde";
const PARTGRADE_ACTION_TTL_MS = 10 * 60 * 1000;
const privatePartGrade = require("./partgrade-private");
const partGradeActions = privatePartGrade.createActionStore({
  filename: process.env.PARTGRADE_ACTION_STATE_FILE || "/var/lib/zapformat/partgrade-private/actions.json",
  ttl: PARTGRADE_ACTION_TTL_MS
});
const partGradeSecrets = [process.env.PARTGRADE_API_LOGIN, process.env.PARTGRADE_API_PASSWORD_MD5, String(process.env.PARTGRADE_API_PASSWORD_MD5 || "").toLowerCase()];

function validPartGradeMcpKey(value) {
  const candidate = crypto.createHash("sha256").update(String(value || "")).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(PARTGRADE_MCP_KEY_SHA256));
}

function partGradeMcpToolResult(data, isError = false) {
  return { content: [{ type: "text", text: JSON.stringify(privatePartGrade.redact(data, partGradeSecrets)) }], isError };
}

async function privateBasketSnapshot(payload) {
  const basketId = payload.params.basketId;
  return privatePartGrade.basketSnapshot(await partGrade.rawRequest("basket/content", { basketId }));
}

async function preparePrivatePartGradeAction(action, args) {
  const payload = privatePartGrade.payloadFor(action, args);
  let snapshot = null;
  // basket/order can ignore positionIds unless partial checkout is enabled upstream.
  // Require the whole current returned basket to match the approved selection.
  if (payload.path === "basket/order") {
    snapshot = await privateBasketSnapshot(payload);
    const ids = Object.entries(payload.params).filter(([k]) => /^positionIds\[\d+\]$/.test(k)).map(([,v]) => String(v)).sort();
    const allIds = snapshot.map(row => String(row.positionId)).sort();
    if (!ids.length || JSON.stringify(ids) !== JSON.stringify(allIds)) throw new Error("basket_subset_not_verified_use_isolated_basket_or_instant_order");
  }
  const summary = { action, payload, positions: snapshot || args.items || null };
  return partGradeActions.prepare(payload, summary, snapshot);
}

const PARTGRADE_MCP_TOOLS = [
  {
    name: "partgrade_connection_status",
    description: "Проверить серверную настройку PartGrade без раскрытия учётных данных.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "partgrade_account_info",
    description: "Получить доступную информацию аккаунта PartGrade.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "partgrade_search_brands",
    description: "Найти бренды по артикулу.",
    inputSchema: {
      type: "object",
      properties: { number: { type: "string" } },
      required: ["number"],
      additionalProperties: false
    }
  },
  {
    name: "partgrade_search_parts",
    description: "Получить предложения PartGrade: закупочные цены, остатки, поставщиков и сроки по артикулу и бренду.",
    inputSchema: {
      type: "object",
      properties: {
        number: { type: "string" },
        brand: { type: "string" },
        params: { type: "object", additionalProperties: true }
      },
      required: ["number", "brand"],
      additionalProperties: false
    }
  },
  {
    name: "partgrade_basket_content",
    description: "Получить содержимое корзины PartGrade.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "partgrade_basket_options",
    description: "Получить доступные параметры оформления корзины.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "partgrade_payment_methods",
    description: "Получить способы оплаты PartGrade.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "partgrade_shipment_methods",
    description: "Получить способы доставки PartGrade.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "partgrade_shipment_addresses",
    description: "Получить адреса доставки PartGrade.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "partgrade_shipment_offices",
    description: "Получить пункты самовывоза PartGrade.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "partgrade_shipment_dates",
    description: "Получить доступные даты отгрузки PartGrade.",
    inputSchema: {
      type: "object",
      properties: {
        params: { type: "object", additionalProperties: true }
      },
      additionalProperties: false
    }
  },
  {
    name: "partgrade_order_statuses",
    description: "Получить статусы заказов PartGrade.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "partgrade_orders",
    description: "Получить список заказов PartGrade.",
    inputSchema: {
      type: "object",
      properties: {
        params: { type: "object", additionalProperties: true }
      },
      additionalProperties: false
    }
  },
  {
    name: "partgrade_order_list",
    description: "Получить данные конкретных заказов по номерам.",
    inputSchema: {
      type: "object",
      properties: {
        orderNumbers: { type: "array", items: { type: "string" }, maxItems: 500 }
      },
      required: ["orderNumbers"],
      additionalProperties: false
    }
  },
  {
    name: "partgrade_orders_version",
    description: "Получить версию данных заказов.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "partgrade_read",
    description: "Вызвать документированный read-only метод PartGrade API. Поддерживается POST для поиска без изменения состояния; остальные операции только prepare/execute.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        method: { type: "string", enum: ["GET", "POST"], default: "GET" },
        params: { type: "object", additionalProperties: true }
      },
      required: ["path"],
      additionalProperties: false
    }
  },
  {
    name: "partgrade_prepare_action",
    description: "Подготовить изменение, добавление в корзину, заказ, отмену или произвольный изменяющий запрос без выполнения. Вернуть action_id для последующего подтверждения пользователем.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["basket_add", "basket_order", "instant_order", "cancel_order_position", "raw_request"]
        },
        args: { type: "object", additionalProperties: true }
      },
      required: ["action", "args"],
      additionalProperties: false
    }
  },
  {
    name: "partgrade_execute_approved_action",
    description: "Выполнить ранее подготовленное действие только после явного подтверждения пользователя в чате непосредственно перед вызовом.",
    inputSchema: {
      type: "object",
      properties: {
        action_id: { type: "string" },
        confirmed: { type: "boolean", const: true },
        payload_hash: { type: "string" }
      },
      required: ["action_id", "confirmed", "payload_hash"],
      additionalProperties: false
    }
  },
  {
    name: "partgrade_action_status",
    description: "Проверить состояние ранее подготовленного действия.",
    inputSchema: {
      type: "object",
      properties: { action_id: { type: "string" } },
      required: ["action_id"],
      additionalProperties: false
    }
  }
];

PARTGRADE_MCP_TOOLS.push({
  name: "partgrade_list_methods",
  description: "Список документированных методов PartGrade/ABCP с HTTP-методом и признаком чтения. Права конкретного аккаунта проверяет PartGrade.",
  inputSchema: { type: "object", properties: { filter: { type: "string" }, offset: { type: "integer", minimum: 0 }, limit: { type: "integer", minimum: 1, maximum: 100 } }, additionalProperties: false }
});
for (const tool of PARTGRADE_MCP_TOOLS) {
  const executes = tool.name === "partgrade_execute_approved_action";
  tool.annotations = { readOnlyHint: !executes && tool.name !== "partgrade_prepare_action", destructiveHint: executes, idempotentHint: !executes && tool.name !== "partgrade_prepare_action", openWorldHint: true };
}

async function callPartGradeMcpTool(name, args = {}) {
  privatePartGrade.assertNoCredentials(args);
  if (name === "partgrade_connection_status") {
    return {
      configured: partGrade.configured(),
      upstream: partGrade.baseUrl,
      secrets_exposed: false
    };
  }
  if (name === "partgrade_account_info") return partGrade.userInfo();
  if (name === "partgrade_search_brands") return partGrade.searchBrands(args.number);
  if (name === "partgrade_search_parts") return searchSupplierOffers(args.number, args.brand, args.params || {});
  if (name === "partgrade_basket_content") return partGrade.basketContent();
  if (name === "partgrade_basket_options") return partGrade.basketOptions();
  if (name === "partgrade_payment_methods") return partGrade.paymentMethods();
  if (name === "partgrade_shipment_methods") return partGrade.shipmentMethods();
  if (name === "partgrade_shipment_addresses") return partGrade.shipmentAddresses();
  if (name === "partgrade_shipment_offices") return partGrade.shipmentOffices();
  if (name === "partgrade_shipment_dates") return partGrade.shipmentDates(args.params || {});
  if (name === "partgrade_order_statuses") return partGrade.orderStatuses();
  if (name === "partgrade_orders") return partGrade.orders(args.params || {});
  if (name === "partgrade_order_list") return partGrade.orderList(args.orderNumbers || []);
  if (name === "partgrade_orders_version") return partGrade.ordersVersion();
  if (name === "partgrade_list_methods") {
    const filter = String(args.filter || "").toLowerCase();
    const methods = privatePartGrade.catalog.filter(item => !filter || item.path.toLowerCase().includes(filter));
    return { total: methods.length, methods: methods.slice(Math.max(0, Number(args.offset) || 0), Math.max(0, Number(args.offset) || 0) + Math.min(100, Math.max(1, Number(args.limit) || 50))), permission_note: "Documentation is not account permission; upstream enforces access. No ZapFormat customer API is exposed." };
  }
  if (name === "partgrade_read") {
    const op = privatePartGrade.operation(String(args.method || "GET").toUpperCase(), args.path);
    if (!op.readOnly) throw new Error("mutation_requires_confirmation");
    privatePartGrade.assertNoCredentials(args.params);
    return partGrade.rawRequest(op.path, op.encoding === "json" ? args.params || {} : privatePartGrade.flatten(args.params || {}), { method: op.method, encoding: op.encoding });
  }
  if (name === "partgrade_prepare_action") return preparePrivatePartGradeAction(args.action, args.args || {});
  if (name === "partgrade_action_status") return partGradeActions.status(String(args.action_id || ""));
  if (name === "partgrade_execute_approved_action") {
    return partGradeActions.execute(String(args.action_id || ""), args.confirmed, args.payload_hash,
      payload => partGrade.rawRequest(payload.path, payload.params, { method: payload.method, encoding: payload.encoding }),
      async item => {
        if (item.snapshot && privatePartGrade.digest(await privateBasketSnapshot(item.payload)) !== privatePartGrade.digest(item.snapshot)) throw new Error("basket_changed_prepare_again");
      });
  }
  throw new Error("unknown_partgrade_tool");
}

app.all("/mcp/partgrade/:accessKey", async (req, res) => {
  if (!validPartGradeMcpKey(req.params.accessKey)) {
    return res.status(404).json({ error: "not_found" });
  }

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
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: ["2025-03-26", "2025-06-18", "2025-11-25"].includes(rpc.params?.protocolVersion) ? rpc.params.protocolVersion : "2025-06-18",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "ZapFormat PartGrade Private", version: "1.1.0" },
          instructions: "Private supplier-only PartGrade bridge on the existing ZapFormat server. No ZapFormat customer/session/cart/database/order access. Procurement prices belong to the authenticated owner. Reads run immediately. Before EVERY mutation, basket change, order, cancellation or financial action: call partgrade_prepare_action; show the exact returned payload plus brands/articles/quantities/prices/payment/shipment details; wait for explicit user confirmation in a subsequent chat message; only then call partgrade_execute_approved_action with action_id, the unchanged payload_hash and confirmed:true. General permission is not action confirmation. Never retry a mutation or create a replacement order after timeout/unknown; inspect partgrade_action_status, supplier basket and supplier orders to reconcile. Preserve partial-success responses and check returned orders even when status=0. For basket_order, explicitly select all current returned basket position IDs and show all positions; a subset is refused unless using an isolated basket. Delivery periods in upstream offers are hours, not days. Never disclose supplier login, MD5 or the MCP access key. Use partgrade_list_methods and raw read/prepared requests for other documented, account-permitted operations."
        }
      });
    }

    if (rpc.method === "notifications/initialized") {
      return res.status(204).end();
    }

    if (rpc.method === "ping") {
      return res.json({ jsonrpc: "2.0", id, result: {} });
    }

    if (rpc.method === "tools/list") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: { tools: PARTGRADE_MCP_TOOLS }
      });
    }

    if (rpc.method === "tools/call") {
      const name = String(rpc.params?.name || "");
      const args = rpc.params?.arguments || {};
      try {
        const data = await callPartGradeMcpTool(name, args);
        return res.json({
          jsonrpc: "2.0",
          id,
          result: partGradeMcpToolResult(data, false)
        });
      } catch (error) {
        console.error("[PartGradeMCP]", name, error?.code || error?.message || "tool_failed");
        return res.json({
          jsonrpc: "2.0",
          id,
          result: partGradeMcpToolResult({
            error: String(error?.code || error?.message || "partgrade_tool_failed"),
            status: Number(error?.status || 0) || null,
            upstreamCode: error?.upstreamCode ?? null,
            upstreamMessage: error?.upstreamMessage ?? null
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
    console.error("[PartGradeMCP]", error?.message || "rpc_failed");
    return res.status(200).json({
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: "Internal error" }
    });
  }
});


const TIMEWEB_MCP_UPSTREAM = "https://timeweb.cloud/api/v1/mcp";
const TIMEWEB_PROXY_KEY_SHA256 = "4bd620c416824cd52273b3fc270d2d176833f2da2a8cfe4b4f7392464d9d601b";

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


app.get("/api/search/key-setup/public-key", async (_req, res, next) => {
  try {
    const jwk = await publicBootstrapJwk();
    res.json({ ok: true, public_key_jwk: jwk });
  } catch (error) {
    next(error);
  }
});

const PARTGRADE_CHAT_AUDIENCE = "zapformat-partgrade-chat";
const PARTGRADE_CHAT_REF = "refs/heads/partgrade-chat";

app.post("/api/internal/partgrade-chat", async (req, res) => {
  try {
    const auth = String(req.get("authorization") || "");
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const claims = await verifyGitHubActionsToken(token, {
      audience: PARTGRADE_CHAT_AUDIENCE,
      ref: PARTGRADE_CHAT_REF,
      eventName: "push"
    });

    const requestedSha = String(req.body?.sha || "").trim().toLowerCase();
    if (
      !/^[a-f0-9]{40}$/.test(requestedSha) ||
      requestedSha !== String(claims.sha || "").toLowerCase()
    ) {
      return res.status(400).json({ error: "sha_mismatch" });
    }

    const tool = String(req.body?.tool || "").trim();
    const knownTool = PARTGRADE_MCP_TOOLS.some((item) => item.name === tool);
    if (!knownTool) {
      return res.status(400).json({ error: "unknown_partgrade_tool" });
    }

    if (
      tool === "partgrade_execute_approved_action" &&
      req.body?.approved !== true
    ) {
      return res.status(409).json({ error: "explicit_approval_required" });
    }

    const data = await callPartGradeMcpTool(tool, req.body?.arguments || {});
    return res.json({
      ok: true,
      tool,
      request_sha: requestedSha,
      data: privatePartGrade.redact(data, partGradeSecrets)
    });
  } catch (error) {
    console.error("[PartGradeChat]", error?.code || error?.message || "failed");
    if (error instanceof PartGradeError) {
      return res.status(502).json({
        ok: false,
        error: error.code || "partgrade_error",
        upstreamCode: error.upstreamCode ?? null,
        upstreamMessage: error.upstreamMessage ?? null
      });
    }
    return res.status(401).json({
      ok: false,
      error: String(error?.message || "unauthorized")
    });
  }
});

app.post("/api/internal/openai-key", async (req, res) => {
  try {
    const auth = String(req.get("authorization") || "");
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const claims = await verifyGitHubActionsToken(token);

    const requestedSha = String(req.body?.sha || "").trim().toLowerCase();
    if (!/^[a-f0-9]{40}$/.test(requestedSha) || requestedSha !== String(claims.sha || "").toLowerCase()) {
      return res.status(400).json({ error: "sha_mismatch" });
    }

    const result = await installEncryptedOpenAIKey(req.body);
    return res.status(201).json({ ok: true, configured: result.configured, model: result.model });
  } catch (error) {
    console.error("[AIKeySetup]", error?.message || "setup_failed");
    return res.status(401).json({ error: "unauthorized_or_invalid_payload" });
  }
});

app.post("/api/internal/timeweb-ai-token", async (req, res) => {
  try {
    const auth = String(req.get("authorization") || "");
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const claims = await verifyGitHubActionsToken(token);

    const requestedSha = String(req.body?.sha || "").trim().toLowerCase();
    if (!/^[a-f0-9]{40}$/.test(requestedSha) || requestedSha !== String(claims.sha || "").toLowerCase()) {
      return res.status(400).json({ error: "sha_mismatch" });
    }

    const result = await installTimewebAIToken(req.body);
    return res.status(201).json({
      ok: true,
      configured: result.configured,
      provider: "timeweb_ai_gateway",
      model: result.model
    });
  } catch (error) {
    console.error("[TimewebAISetup]", error?.message || "setup_failed");
    return res.status(401).json({ error: "unauthorized_or_invalid_payload" });
  }
});

app.post("/api/internal/smsru-token", async (req, res) => {
  try {
    const auth = String(req.get("authorization") || "");
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const claims = await verifyGitHubActionsToken(token);

    const requestedSha = String(req.body?.sha || "").trim().toLowerCase();
    if (!/^[a-f0-9]{40}$/.test(requestedSha) || requestedSha !== String(claims.sha || "").toLowerCase()) {
      return res.status(400).json({ error: "sha_mismatch" });
    }

    const result = await installSmsRuToken(req.body);
    return res.status(201).json({
      ok: true,
      configured: result.configured,
      provider: result.provider,
      test: result.test
    });
  } catch (error) {
    console.error("[SmsRuSetup]", error?.message || "setup_failed");
    return res.status(401).json({ error: "unauthorized_or_invalid_payload" });
  }
});

app.post("/api/internal/fapi-token", async (req, res) => {
  try {
    const auth = String(req.get("authorization") || "");
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const claims = await verifyGitHubActionsToken(token);

    const requestedSha = String(req.body?.sha || "").trim().toLowerCase();
    if (!/^[a-f0-9]{40}$/.test(requestedSha) || requestedSha !== String(claims.sha || "").toLowerCase()) {
      return res.status(400).json({ error: "sha_mismatch" });
    }

    const result = await installFapiToken(req.body);
    return res.status(201).json({
      ok: true,
      configured: result.configured,
      provider: result.provider
    });
  } catch (error) {
    console.error("[FapiSetup]", error?.message || "setup_failed");
    return res.status(401).json({ error: "unauthorized_or_invalid_payload" });
  }
});

app.post("/api/internal/fapi-smoke", async (req, res) => {
  try {
    const auth = String(req.get("authorization") || "");
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const claims = await verifyGitHubActionsToken(token);
    const requestedSha = String(req.body?.sha || "").trim().toLowerCase();
    if (!/^[a-f0-9]{40}$/.test(requestedSha) || requestedSha !== String(claims.sha || "").toLowerCase()) {
      return res.status(400).json({ error: "sha_mismatch" });
    }

    const usage = await fapi.usage();
    return res.json({
      ok: true,
      configured: true,
      provider: "fapi_v2",
      account_state: usage?.account?.st || null,
      vin_state: usage?.vin?.st || null
    });
  } catch (error) {
    console.error("[FapiSmoke]", error?.code || error?.message || "smoke_failed");
    return res.status(502).json({ error: "fapi_smoke_failed" });
  }
});

app.post("/api/internal/search-smoke", async (req, res) => {
  try {
    const auth = String(req.get("authorization") || "");
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const claims = await verifyGitHubActionsToken(token);

    const requestedSha = String(req.body?.sha || "").trim().toLowerCase();
    if (!/^[a-f0-9]{40}$/.test(requestedSha) || requestedSha !== String(claims.sha || "").toLowerCase()) {
      return res.status(400).json({ error: "sha_mismatch" });
    }

    const query = String(
      req.body?.query || "передние тормозные колодки Ford Focus II 2006 1.8 бензин"
    ).trim().slice(0, 400);

    const interpreted = await interpretSearch(query, null);
    let research;
    try {
      research = await researchPartCandidates(query, null);
    } catch (error) {
      return res.json({
        ok: true,
        smoke: true,
        deployed_sha: requestedSha,
        ai_configured: Boolean(
          String(process.env.TIMEWEB_AI_TOKEN || "").trim() ||
          String(process.env.OPENAI_API_KEY || "").trim()
        ),
        parser_mode: interpreted.mode,
        parser_error: interpreted.ai_error || null,
        research_mode: "web_failed",
        research_error: String(error?.message || "research_failed").slice(0, 120),
        research_status: Number(error?.status || 0) || null,
        research_detail: String(error?.detail || "").replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 300)
      });
    }

    const articles = await validateResearchedCandidates(research?.candidates || []);
    return res.json({
      ok: true,
      smoke: true,
      deployed_sha: requestedSha,
      ai_configured: Boolean(
          String(process.env.TIMEWEB_AI_TOKEN || "").trim() ||
          String(process.env.OPENAI_API_KEY || "").trim()
        ),
      parser_mode: interpreted.mode,
      parser_error: interpreted.ai_error || null,
      research_mode: research?.source || "web",
      research_status: research?.status || null,
      candidates_found: Array.isArray(research?.candidates) ? research.candidates.length : 0,
      supplier_validated: articles.length,
      mode: articles.length ? "researched_articles" : "clarification"
    });
  } catch (error) {
    console.error("[SearchSmoke]", error?.message || "smoke_failed");
    return res.status(500).json({ error: "search_smoke_failed" });
  }
});

app.post("/api/internal/deploy", async (req, res) => {
  try {
    const auth = String(req.get("authorization") || "");
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const claims = await verifyGitHubActionsToken(token);

    const requestedSha = String(req.body?.sha || "").trim().toLowerCase();
    if (!/^[a-f0-9]{40}$/.test(requestedSha) || requestedSha !== String(claims.sha || "").toLowerCase()) {
      return res.status(400).json({ error: "sha_mismatch" });
    }

    const trigger = {
      sha: requestedSha,
      requested_at: new Date().toISOString(),
      actor: String(claims.actor || ""),
      run_id: String(claims.run_id || "")
    };

    await fs.mkdir("/var/lib/zapformat", { recursive: true });
    await fs.writeFile(
      "/var/lib/zapformat/deploy.trigger",
      JSON.stringify(trigger) + "\n",
      { mode: 0o640 }
    );

    return res.status(202).json({ ok: true, queued: true, sha: requestedSha });
  } catch (error) {
    console.error("[AutoDeploy]", error.message);
    return res.status(401).json({ error: "unauthorized" });
  }
});

app.get("/api/deploy/status", async (_req, res) => {
  try {
    const raw = await fs.readFile("/var/lib/zapformat/deploy-state.json", "utf8");
    return res.json(JSON.parse(raw));
  } catch (error) {
    if (error?.code === "ENOENT") return res.json({ status: "not_configured" });
    return res.status(500).json({ error: "deploy_status_unavailable" });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof FapiError) {
    console.error("[FAPI]", error.code, error.status || "");
    const status = error.code === "fapi_not_configured" ? 503 : (Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 502);
    return res.status(status).json({ error: error.code || "fapi_unavailable" });
  }

  if (error instanceof PartGradeError) {
    console.error("[SupplierAPI]", error.code, error.status || "");
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

  const supplySyncTimer = setInterval(() => {
    syncSupplierOrders().catch((error) => {
      console.error("[SupplySync]", error?.message || "supplier_sync_failed");
    });
  }, 120000);
  supplySyncTimer.unref();
}

start().catch((error) => {
  console.error("Failed to start ZAPFORMAT API", error);
  process.exit(1);
});
