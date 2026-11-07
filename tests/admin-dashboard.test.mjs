import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=path=>readFileSync(resolve(root,path),"utf8");

test("Owner dashboard uses only authenticated, real PostgreSQL metrics",()=>{
  const server=read("backend/src/server.js");
  const endpoint=server.slice(server.indexOf('app.get("/api/admin/dashboard"'),server.indexOf('// Limited, read-only order queue;'));
  assert.ok(endpoint.startsWith('app.get("/api/admin/dashboard"'));
  assert.match(server,/app\.use\("\/api\/admin", requireDatabase, requireUser, requireAdmin\)/);
  assert.match(endpoint,/Europe\/Moscow/);
  assert.match(endpoint,/coalesce\(is_test,false\) = false/);
  assert.match(endpoint,/courier_assignments/);
  assert.match(endpoint,/quote_requests/);
  assert.match(endpoint,/generate_series\(6,0,-1\)/);
  assert.match(endpoint,/cash_received_today: null/);
  assert.match(endpoint,/pickup_scheduled_today: null/);
  assert.doesNotMatch(endpoint,/paid_revenue:.*booked_today/);
});

test("Overview is compact, actionable and labels bookkeeping gaps accurately",()=>{
  const app=read("admin/admin.js");
  const html=read("admin/index.html");
  const css=read("admin/dashboard.css");
  const start=app.indexOf("function renderOverview(dashboard)");
  const end=app.indexOf("function renderOrders()",start);
  const overview=app.slice(start,end);
  assert.ok(start>=0&&end>start);
  for(const label of ["Новые заказы","Выручка сегодня","Забрать сегодня","Доставки в работе",
    "Требует внимания","Заказы · 7 дней","Наличные пока не фиксируются",
    "График забора ещё не ведётся"]){
    assert.ok(overview.includes(label),label);
  }
  assert.match(app,/request\("\/api\/admin\/dashboard"\)/);
  assert.match(overview,/data-open/);
  assert.match(overview,/formatRub\(Number\(d\.booked_today\)\|\|0\)/);
  assert.doesNotMatch(overview,/Последние заказы|Финансовый контроль|appendStaffPreview/);
  assert.match(html,/dashboard\.css\?v=/);
  assert.match(html,/admin\.js\?v=\d{8}-[a-z0-9-]+/);
  assert.match(css,/@media \(max-width: 780px\)/);
  assert.match(css,/grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
});
