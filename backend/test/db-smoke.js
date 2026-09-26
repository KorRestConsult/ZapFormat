"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const migrations = [
      "001_init.sql",
      "002_garage_owner_app.sql",
      "003_quote_requests.sql",
      "004_customer_workflow.sql",
      "005_vin_requests.sql",
      "006_checkout.sql",
      "007_operator_queue.sql",
      "008_customer_personalization.sql",
      "009_vehicle_specs.sql",
      "010_customer_case_history.sql",
      "011_notification_entities.sql",
      "012_support_center.sql"
    ];

    for (const file of migrations) {
      const sql = await fs.readFile(path.join(__dirname, "..", "db", file), "utf8");
      await client.query(sql);
    }

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ('CI User','ci@example.invalid','not-a-real-password-hash')
       RETURNING id`
    );
    const userId = userResult.rows[0].id;

    await client.query(
      `INSERT INTO saved_parts (user_id, brand, article, description)
       VALUES ($1,'PATRON','PRS3420','first')
       ON CONFLICT (user_id, upper(brand), upper(article))
       DO UPDATE SET description = COALESCE(EXCLUDED.description, saved_parts.description)`,
      [userId]
    );
    await client.query(
      `INSERT INTO saved_parts (user_id, brand, article, description)
       VALUES ($1,'patron','prs3420','updated')
       ON CONFLICT (user_id, upper(brand), upper(article))
       DO UPDATE SET description = COALESCE(EXCLUDED.description, saved_parts.description)`,
      [userId]
    );

    const saved = await client.query(
      "SELECT count(*)::int AS count, max(description) AS description FROM saved_parts WHERE user_id = $1",
      [userId]
    );
    if (saved.rows[0].count !== 1 || saved.rows[0].description !== "updated") {
      throw new Error("saved_parts case-insensitive upsert failed");
    }

    await client.query(
      `INSERT INTO recent_searches
        (user_id, query, query_key, search_type, vehicle_context)
       VALUES ($1,'Передние колодки','передние колодки','smart','{"brand":"Ford"}'::jsonb)
       ON CONFLICT (user_id, query_key)
       DO UPDATE SET use_count = recent_searches.use_count + 1, last_used_at = now()`,
      [userId]
    );
    await client.query(
      `INSERT INTO recent_searches
        (user_id, query, query_key, search_type, vehicle_context)
       VALUES ($1,'передние колодки','передние колодки','smart','{"brand":"Ford"}'::jsonb)
       ON CONFLICT (user_id, query_key)
       DO UPDATE SET use_count = recent_searches.use_count + 1, last_used_at = now()`,
      [userId]
    );

    const recent = await client.query(
      "SELECT use_count FROM recent_searches WHERE user_id = $1 AND query_key = 'передние колодки'",
      [userId]
    );
    if (Number(recent.rows[0]?.use_count) !== 2) {
      throw new Error("recent_searches upsert failed");
    }

    const columns = await client.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_name = 'quote_requests'
          AND column_name IN ('fulfillment_method','payment_method','verified_total','manager_note')`
    );
    if (columns.rowCount !== 4) throw new Error("checkout/operator quote columns are missing");

    const vehicleColumns = await client.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_name = 'vehicles'
          AND column_name IN ('transmission','body_type','tire_front','tire_rear','wheel_size','oil_spec','coolant_spec')`
    );
    if (vehicleColumns.rowCount !== 7) throw new Error("vehicle specification columns are missing");

    await client.query(
      `INSERT INTO customer_case_history
        (user_id, case_type, case_id, status, actor_type, note)
       VALUES ($1,'quote','Q-CI','new','customer','created'),
              ($1,'quote','Q-CI','in_progress','staff','checking')`,
      [userId]
    );
    const history = await client.query(
      `SELECT status, actor_type
         FROM customer_case_history
        WHERE user_id = $1 AND case_type = 'quote' AND case_id = 'Q-CI'
        ORDER BY created_at, id`,
      [userId]
    );
    if (history.rowCount !== 2 || history.rows[1].status !== "in_progress" || history.rows[1].actor_type !== "staff") {
      throw new Error("customer_case_history insert/order failed");
    }

    const notificationColumns = await client.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_name = 'notifications'
          AND column_name IN ('entity_type','entity_id')`
    );
    if (notificationColumns.rowCount !== 2) throw new Error("notification entity columns are missing");

    const support = await client.query(
      `INSERT INTO support_requests (user_id, category, subject)
       VALUES ($1,'order','CI support request')
       RETURNING id, ticket_number, status`,
      [userId]
    );
    await client.query(
      `INSERT INTO support_messages (request_id, actor_type, actor_user_id, message)
       VALUES ($1,'customer',$2,'Need help'),
              ($1,'staff',$2,'Checking')`,
      [support.rows[0].id, userId]
    );
    const supportMessages = await client.query(
      "SELECT actor_type, message FROM support_messages WHERE request_id = $1 ORDER BY id",
      [support.rows[0].id]
    );
    if (!support.rows[0].ticket_number || support.rows[0].status !== "new" || supportMessages.rowCount !== 2) {
      throw new Error("support center migration or messages failed");
    }

    console.log("database migrations and critical upserts: ok");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
