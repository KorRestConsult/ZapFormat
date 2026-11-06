"use strict";

// ZapFormat personnel module. Every write is checked server-side and audited.
const transitions = Object.freeze({
  assigned: ["accepted", "problem"],
  accepted: ["picked_up", "problem"],
  picked_up: ["delivered", "problem"],
  problem: [],
  delivered: [],
  cancelled: []
});

function canMoveDelivery(current, target) {
  return Array.isArray(transitions[current]) && transitions[current].includes(target);
}
const uuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ""));

function installStaffRoutes({ app, pool, requireDatabase, requireUser, addUserNotification }) {
  const owner = (req, res, next) => req.user?.role === "owner" ? next() : res.status(403).json({ error: "owner_only" });
  const courier = (req, res, next) => req.user?.role === "courier" ? next() : res.status(403).json({ error: "courier_only" });
  const staffLog = async (db, actor, action, type, id, orderId = null, details = {}) => {
    await db.query(
      "INSERT INTO staff_activity(actor_id,action,target_type,target_id,order_id,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
      [actor, action, type, id == null ? null : String(id), orderId, JSON.stringify(details)]
    );
  };
  const runTx = async (fn) => {
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const result = await fn(db);
      await db.query("COMMIT");
      return result;
    } catch (err) {
      await db.query("ROLLBACK").catch(() => {});
      throw err;
    } finally { db.release(); }
  };
  const route = (handler) => async (req, res, next) => {
    try { await handler(req, res); } catch (err) { next(err); }
  };

  app.use("/api/staff", requireDatabase, requireUser);
  app.get("/api/staff/application", route(async (req, res) => {
    const result = await pool.query(
      "SELECT requested_role,status,submitted_at,reviewed_at FROM staff_applications WHERE user_id=$1",
      [req.user.id]
    );
    res.json({ application: result.rows[0] || null, role: req.user.role });
  }));
  // Existing OTP-verified customer account applies: no public role escalation.
  app.post("/api/staff/apply", route(async (req, res) => {
    if (req.user.role !== "customer") return res.status(403).json({ error: "customer_account_required" });
    if (!req.user.phone_verified_at) return res.status(403).json({ error: "verified_phone_required" });
    const result = await runTx(async (db) => {
      const applied = await db.query(
        "INSERT INTO staff_applications(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET status='pending',submitted_at=now(),reviewed_at=NULL,reviewed_by=NULL WHERE staff_applications.status='rejected' RETURNING id,status",
        [req.user.id]
      );
      if (applied.rowCount) await staffLog(db, req.user.id, "courier.application", "application", applied.rows[0].id);
      return applied.rows[0] || null;
    });
    if (!result) return res.status(409).json({ error: "application_already_pending" });
    res.status(201).json({ ok: true, application: result });
  }));

  app.use("/api/staff/courier", courier);
  app.get("/api/staff/courier/orders", route(async (req, res) => {
    const result = await pool.query(
      "SELECT ca.id AS assignment_id,ca.status AS delivery_status,ca.assigned_at,ca.updated_at, o.id AS order_id,o.order_number,o.status AS order_status,o.recipient_name,o.recipient_phone,o.comment, a.city AS delivery_city,a.address AS delivery_address, (SELECT coalesce(json_agg(json_build_object('brand',i.brand,'article',i.article,'description',i.description,'quantity',i.quantity) ORDER BY i.created_at), '[]'::json) FROM order_items i WHERE i.order_id=o.id) AS items FROM courier_assignments ca JOIN orders o ON o.id=ca.order_id LEFT JOIN user_addresses a ON a.id=o.delivery_address_id WHERE ca.courier_id=$1 AND ca.status <> 'cancelled' ORDER BY CASE WHEN ca.status='delivered' THEN 1 ELSE 0 END, ca.updated_at DESC LIMIT 100",
      [req.user.id]
    );
    res.json({ orders: result.rows });
  }));
  app.post("/api/staff/courier/assignments/:id/status", route(async (req, res) => {
    const id = String(req.params.id || "");
    const status = String(req.body?.status || "").trim();
    const note = String(req.body?.note || "").trim().slice(0, 300);
    if (!uuid(id)) return res.status(400).json({ error: "invalid_assignment_id" });
    if (!Object.hasOwn(transitions, status)) return res.status(400).json({ error: "invalid_delivery_status" });
    if (status === "problem" && !note) return res.status(400).json({ error: "problem_note_required" });
    const result = await runTx(async (db) => {
      const existing = await db.query(
        "SELECT ca.id,ca.order_id,ca.status FROM courier_assignments ca WHERE ca.id=$1 AND ca.courier_id=$2 FOR UPDATE",
        [id, req.user.id]
      );
      if (!existing.rowCount) return { code: 404, error: "assignment_not_found" };
      const before = existing.rows[0];
      if (!canMoveDelivery(before.status, status)) {
        return { code: 409, error: "invalid_delivery_transition", status: before.status };
      }
      await db.query(
        "UPDATE courier_assignments SET status=$2,updated_at=now(),completed_at=CASE WHEN $2='delivered' THEN now() ELSE NULL END WHERE id=$1",
        [id, status]
      );
      await staffLog(db, req.user.id, "courier." + status, "assignment", id, before.order_id, { from: before.status, note });
      const order = await db.query("SELECT user_id,order_number FROM orders WHERE id=$1 LIMIT 1",[before.order_id]);
      if(order.rowCount && typeof addUserNotification==="function"){
        const labels={
          accepted:"Курьер принял задание",
          picked_up:"Заказ передан курьеру",
          delivered:"Курьер отметил вручение заказа",
          problem:"Возник вопрос по доставке"
        };
        if(labels[status])await addUserNotification(
          db,order.rows[0].user_id,"order_status","courier_status",
          "Заказ #"+order.rows[0].order_number+" · "+labels[status],
          status==="delivered"
            ?"Курьер подтвердил передачу заказа. Если заказ не получен, свяжитесь с ZapFormat."
            :status==="problem"
              ?"Доставка требует уточнения. Мы свяжемся с вами."
              :"Статус курьерской доставки ZapFormat обновлён."
        );
      }
      return { ok: true, status, previous_status: before.status };
    });
    res.status(result.code || 200).json(result);
  }));

  // Owner-only personnel controls; never reachable by manager, courier or customer.
  app.use("/api/admin/staff", requireDatabase, requireUser, owner);
  app.get("/api/admin/staff/overview", route(async (_req, res) => {
    const [applications, couriers, assignments, activity] = await Promise.all([
      pool.query("SELECT s.id,s.user_id,s.status,s.submitted_at,s.reviewed_at,u.name,u.surname,u.phone,u.email FROM staff_applications s JOIN users u ON u.id=s.user_id WHERE s.status='pending' ORDER BY s.submitted_at DESC LIMIT 40"),
      pool.query("SELECT id,name,surname,phone,email,status,last_login_at,created_at FROM users WHERE role='courier' ORDER BY created_at DESC LIMIT 100"),
      pool.query("SELECT ca.id,ca.order_id,ca.courier_id,ca.status,ca.assigned_at,ca.updated_at,o.order_number,o.recipient_name,u.name AS courier_name,u.surname AS courier_surname FROM courier_assignments ca JOIN orders o ON o.id=ca.order_id JOIN users u ON u.id=ca.courier_id ORDER BY ca.updated_at DESC LIMIT 100"),
      pool.query("SELECT sa.id,sa.action,sa.target_type,sa.order_id,sa.details,sa.created_at,u.name,u.surname,u.role,o.order_number FROM staff_activity sa JOIN users u ON u.id=sa.actor_id LEFT JOIN orders o ON o.id=sa.order_id ORDER BY sa.created_at DESC LIMIT 100")
    ]);
    res.json({ applications: applications.rows, couriers: couriers.rows, assignments: assignments.rows, activity: activity.rows });
  }));
  app.get("/api/admin/staff/assignable-orders", route(async (_req, res) => {
    const result = await pool.query(
      "SELECT o.id,o.order_number,o.recipient_name,o.status,ca.courier_id,ca.status AS delivery_status FROM orders o LEFT JOIN courier_assignments ca ON ca.order_id=o.id WHERE o.status IN ('new','received','confirmed','processing','ready') ORDER BY o.created_at DESC LIMIT 80"
    );
    res.json({ orders: result.rows });
  }));
  app.post("/api/admin/staff/applications/:id/decision", route(async (req, res) => {
    const id = String(req.params.id || "");
    const decision = String(req.body?.decision || "");
    if (!uuid(id) || !["approve","reject"].includes(decision)) return res.status(400).json({ error: "invalid_decision" });
    const result = await runTx(async (db) => {
      const found = await db.query(
        "SELECT s.id,s.user_id,s.status,u.role,u.status AS user_status FROM staff_applications s JOIN users u ON u.id=s.user_id WHERE s.id=$1 FOR UPDATE OF s,u",
        [id]
      );
      if (!found.rowCount) return { code: 404, error: "application_not_found" };
      const record = found.rows[0];
      if (record.status !== "pending" || record.role !== "customer" || record.user_status !== "active") {
        return { code: 409, error: "application_not_pending" };
      }
      if (decision === "approve") await db.query("UPDATE users SET role='courier',updated_at=now() WHERE id=$1", [record.user_id]);
      await db.query(
        "UPDATE staff_applications SET status=$2,reviewed_by=$3,reviewed_at=now() WHERE id=$1",
        [id, decision === "approve" ? "approved" : "rejected", req.user.id]
      );
      await staffLog(db, req.user.id, "courier." + (decision === "approve" ? "approved" : "rejected"), "user", record.user_id);
      return { ok: true, status: decision === "approve" ? "approved" : "rejected" };
    });
    res.status(result.code || 200).json(result);
  }));
  app.post("/api/admin/staff/assignments", route(async (req, res) => {
    const orderId = String(req.body?.order_id || "");
    const courierId = String(req.body?.courier_id || "");
    if (!uuid(orderId) || !uuid(courierId)) return res.status(400).json({ error: "invalid_assignment" });
    const result = await runTx(async (db) => {
      const o = await db.query("SELECT id,status FROM orders WHERE id=$1 FOR UPDATE", [orderId]);
      if (!o.rowCount) return { code: 404, error: "order_not_found" };
      if (["completed","cancelled"].includes(o.rows[0].status)) return { code: 409, error: "order_closed" };
      const c = await db.query("SELECT id FROM users WHERE id=$1 AND role='courier' AND status='active' FOR SHARE", [courierId]);
      if (!c.rowCount) return { code: 409, error: "courier_not_available" };
      const result = await db.query(
        "INSERT INTO courier_assignments(order_id,courier_id,assigned_by) VALUES($1,$2,$3) ON CONFLICT(order_id) DO UPDATE SET courier_id=EXCLUDED.courier_id,assigned_by=EXCLUDED.assigned_by,status='assigned',assigned_at=now(),updated_at=now(),completed_at=NULL WHERE courier_assignments.status <> 'delivered' RETURNING id,status",
        [orderId, courierId, req.user.id]
      );
      if (!result.rowCount) return { code: 409, error: "delivery_already_finished" };
      await staffLog(db, req.user.id, "courier.assigned", "assignment", result.rows[0].id, orderId, { courier_id: courierId });
      const order=await db.query("SELECT user_id,order_number FROM orders WHERE id=$1 LIMIT 1",[orderId]);
      if(order.rowCount && typeof addUserNotification==="function"){
        await addUserNotification(db,order.rows[0].user_id,"order_status","courier_status",
          "Заказ #"+order.rows[0].order_number+" · Назначен курьер",
          "Заказ передан в службу доставки ZapFormat. О фактической передаче курьеру сообщим отдельно.");
      }
      return { ok: true, assignment_id: result.rows[0].id };
    });
    res.status(result.code || 201).json(result);
  }));
  app.post("/api/admin/staff/couriers/:id/block", route(async (req, res) => {
    const id = String(req.params.id || "");
    if (!uuid(id)) return res.status(400).json({ error: "invalid_courier_id" });
    const result = await runTx(async (db) => {
      const found = await db.query("SELECT id,status FROM users WHERE id=$1 AND role='courier' FOR UPDATE", [id]);
      if (!found.rowCount) return { code: 404, error: "courier_not_found" };
      if (found.rows[0].status !== "active") return { code: 409, error: "courier_already_disabled" };
      await db.query("UPDATE users SET status='blocked',updated_at=now() WHERE id=$1", [id]);
      await db.query("DELETE FROM user_sessions WHERE user_id=$1", [id]);
      await db.query("UPDATE courier_assignments SET status='cancelled',updated_at=now() WHERE courier_id=$1 AND status NOT IN ('delivered','cancelled')", [id]);
      await staffLog(db, req.user.id, "courier.blocked", "user", id);
      return { ok: true };
    });
    res.status(result.code || 200).json(result);
  }));
}
module.exports = { installStaffRoutes, canMoveDelivery, transitions };
