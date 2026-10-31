"use strict";

const { normalizedQuantity, summarizeIntake } = require("./physical-intake");

// All routes inherit the session and owner/admin checks installed at /api/admin.
function registerAdminOrders(app, pool, { addUserNotification }) {
  async function detail(orderId) {
    const header = await pool.query(
      `SELECT o.id, o.order_number, o.status, o.total_amount, o.currency,
              o.recipient_name, o.recipient_phone, o.created_at, o.updated_at,
              o.supplier_state, o.packed_at,
              a.city AS delivery_city, a.address AS delivery_address,
              trim(concat_ws(' ', u.name, u.surname)) AS customer_name,
              u.phone AS customer_phone
         FROM orders o JOIN users u ON u.id = o.user_id
         LEFT JOIN user_addresses a ON a.id = o.delivery_address_id AND a.user_id = o.user_id
        WHERE o.id::text = $1 OR o.order_number::text = $1
        LIMIT 1`, [orderId]
    );
    if (!header.rowCount) return null;
    const order = header.rows[0];
    const items = (await pool.query(
      `SELECT id, brand, article, description, quantity, unit_price, purchase_price,
              status, supplier_status, expected_at, received_quantity, physically_received_at
         FROM order_items WHERE order_id = $1 ORDER BY created_at, id`, [order.id]
    )).rows;
    const knownCost = items.reduce((sum, item) => sum +
      (item.purchase_price == null ? 0 : Number(item.purchase_price) * Number(item.quantity)), 0);
    const missingCosts = items.filter(item => item.purchase_price == null).length;
    const amount = Number(order.total_amount);
    return {
      order,
      items,
      intake: summarizeIntake(items),
      finance: {
        sale_amount: amount,
        known_purchase_amount: knownCost,
        missing_cost_items: missingCosts,
        gross_profit: missingCosts === 0 ? amount - knownCost : null,
        // There is no verified invoice settlement state in the current schema.
        cash_due_supplier: null,
        cash_due_reason: "Способ расчёта и неоплаченный остаток поставщика пока не подтверждены."
      }
    };
  }

  app.get("/api/admin/orders/:orderId", async (req, res, next) => {
    try {
      const result = await detail(String(req.params.orderId || ""));
      if (!result) return res.status(404).json({ error: "order_not_found" });
      res.json(result);
    } catch (error) { next(error); }
  });

  // Absolute received quantity; repeated requests cannot accidentally double-stock an item.
  app.post("/api/admin/orders/:orderId/intake", async (req, res, next) => {
    const orderId = String(req.params.orderId || "");
    const itemId = String(req.body?.item_id || "");
    const quantity = req.body?.received_quantity;
    const note = String(req.body?.note || "").trim().slice(0, 240) || null;
    if (!/^[0-9a-f-]{36}$/i.test(itemId) || !Number.isInteger(quantity)) {
      return res.status(400).json({ error: "invalid_intake_input" });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const orderQuery = await client.query(
        `SELECT id, order_number, status FROM orders
         WHERE id::text=$1 OR order_number::text=$1 FOR UPDATE`, [orderId]
      );
      if (!orderQuery.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "order_not_found" });
      }
      const order = orderQuery.rows[0];
      if (["cancelled", "completed"].includes(order.status)) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "order_is_closed" });
      }
      const row = await client.query(
        `SELECT id, order_id, brand, article, quantity, received_quantity
           FROM order_items WHERE order_id=$1 AND id=$2 FOR UPDATE`, [order.id, itemId]
      );
      if (!row.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "order_item_not_found" });
      }
      const item = row.rows[0];
      try { normalizedQuantity(quantity, Number(item.quantity)); }
      catch (_) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "invalid_received_quantity" });
      }
      const previous = Number(item.received_quantity);
      if (previous !== quantity) {
        await client.query(
          `UPDATE order_items
             SET received_quantity=$2,
                 physically_received_at=CASE WHEN $2=quantity THEN now() ELSE NULL END,
                 updated_at=now()
            WHERE id=$1`, [item.id, quantity]
        );
        await client.query(
          `UPDATE orders
             SET packed_at=NULL, packed_by=NULL,
                 status=CASE WHEN status='ready' THEN 'processing' ELSE status END,
                 updated_at=now()
           WHERE id=$1`, [order.id]
        );
        await client.query(
          `INSERT INTO order_item_intake_history
            (order_item_id, order_id, actor_user_id, previous_quantity, received_quantity, note)
            VALUES ($1,$2,$3,$4,$5,$6)`,
          [item.id, order.id, req.user.id, previous, quantity, note]
        );
        await client.query(
          `INSERT INTO order_status_history (order_id, order_item_id, status, source, note)
            VALUES ($1,$2,'processing','intake',$3)`,
          [order.id, item.id,
            "Фактически принято: " + String(quantity) + " из " + String(item.quantity) +
            " · " + String(item.brand) + " " + String(item.article)]
        );
      }
      await client.query("COMMIT");
      res.json({ ok: true, changed: previous !== quantity, item_id: item.id,
        received_quantity: quantity, ordered_quantity: Number(item.quantity) });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      next(error);
    } finally { client.release(); }
  });

  app.post("/api/admin/orders/:orderId/pack", async (req, res, next) => {
    const orderId = String(req.params.orderId || "");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `SELECT id, user_id, order_number, status, packed_at FROM orders
         WHERE id::text=$1 OR order_number::text=$1 FOR UPDATE`, [orderId]
      );
      if (!result.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "order_not_found" });
      }
      const order = result.rows[0];
      if (["cancelled", "completed"].includes(order.status)) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "order_is_closed" });
      }
      const items = (await client.query(
        `SELECT quantity, received_quantity, status FROM order_items
           WHERE order_id=$1 ORDER BY id FOR UPDATE`, [order.id]
      )).rows;
      const state = summarizeIntake(items);
      if (!state.ready_for_packaging) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "order_not_fully_received", intake: state });
      }
      if (!order.packed_at) {
        await client.query(
          `UPDATE orders SET packed_at=now(), packed_by=$2, status='ready', updated_at=now()
           WHERE id=$1`, [order.id, req.user.id]
        );
        await client.query(
          `UPDATE order_items SET status='ready', updated_at=now() WHERE order_id=$1`,
          [order.id]
        );
        await client.query(
          `INSERT INTO order_status_history (order_id, status, source, note)
           VALUES ($1,'ready','intake','Все детали приняты и комплектование подтверждено')`,
          [order.id]
        );
        await addUserNotification(
          client, order.user_id, "order_status", "order_status",
          "Заказ #" + String(order.order_number) + " — готов",
          "Все позиции получены и заказ укомплектован. Способ передачи согласуйте с магазином."
        );
      }
      await client.query("COMMIT");
      res.json({ ok: true, order_number: order.order_number, status: "ready" });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      next(error);
    } finally { client.release(); }
  });
}

module.exports = { registerAdminOrders };
