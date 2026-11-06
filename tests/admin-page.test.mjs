import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(root,'admin/index.html'),'utf8');
const js=readFileSync(resolve(root,'admin/admin.js'),'utf8');
const css=readFileSync(resolve(root,'admin/admin.css'),'utf8');
const server=readFileSync(resolve(root,'backend/src/server.js'),'utf8');

test('standalone administrative entry has its own login and route assets',()=>{
  for(const id of ['authScreen','loginForm','login','password','authError','appScreen','page','menu','logoutButton']){
    assert.ok(html.includes('id="'+id+'"'),id+' not found');
  }
  assert.match(html,/src="\.\/admin\.js/);
  assert.match(html,/href="\.\/admin\.css/);
  assert.match(html,/noindex,nofollow/);
  assert.ok(!html.includes('id="view-admin"'),'must not reuse customer interface');
});

test('privileged API only runs after owner/admin session validation',()=>{
  assert.match(js,/\["owner","admin","courier"\]\.includes/);
  assert.match(js,/account_scope:"admin"/);
  assert.match(js,/role==="courier"/);
  assert.match(js,/role==="customer"/);
  assert.match(js,/request\("\/api\/auth\/me"\)/);
  assert.match(js,/if\(!authorized\(data\.user\)\)/);
  assert.match(js,/if\(!state\.user\)return/);
  assert.match(js,/if\(!state\.user\|\|!captions\[page\]\)return/);
  assert.match(js,/\/api\/admin\/overview/);
  assert.match(js,/\/api\/admin\/orders/);
  assert.match(js,/\/api\/admin\/pricing/);
  assert.match(js,/if\(kind==="orders"\)\{renderOrders\(\);await openLinkedOrder\(\);\}/);
  assert.match(js,/else if\(kind==="requests"\)renderRequests\(\)/);
  assert.match(js,/openLinkedOrder/);
  assert.match(server,/app\.use\("\/api\/admin", requireDatabase, requireUser, requireAdmin\)/);
});

test('pricing is a real backend read/write with explicit save and guard',()=>{
  assert.match(js,/request\("\/api\/admin\/pricing"\)/);
  assert.match(js,/method:"PUT",body:\{policy:p\}/);
  assert.match(js,/window\.confirm\(/);
  assert.match(js,/state\.savedPricing/);
  assert.match(js,/previewPrice/);
  assert.match(js,/min_markup_rub/);
  assert.match(js,/round_to/);
  assert.match(js,/if\(!state\.savedPricing\|\|state\.busy\)return/);
});

test('screens do not advertise invented revenue or reveal procurement lines to anonymous visitors',()=>{
  assert.ok(!html.includes('85 000'),'demo revenue must not appear');
  assert.ok(!html.includes('Иван П.'),'fake customers must not appear');
  assert.match(js,/Сумма оформленных заказов/);
  assert.match(js,/не равно поступившей оплате/);
  assert.match(js,/Не является чистой прибылью/);
  assert.match(js,/без закупочной цены/);
  assert.match(js,/escape\(i\.recipient_phone/);
  assert.match(js,/escape\(i\.email/);
});

test('layout is responsive',()=>{
  assert.match(css,/@media\(max-width:780px\)/);
  assert.match(css,/@media\(max-width:420px\)/);
  assert.match(css,/overflow-x:auto/);
  assert.match(css,/order-detail/);
});

test('owner order details are only served through protected admin API',()=>{
  assert.ok(server.includes('app.get("/api/admin/orders/:id"'));
  assert.ok(server.includes('purchase_price'));
  assert.ok(server.includes('missing_cost_items'));
  assert.ok(server.includes('delivery_address'));
  assert.ok(server.includes('line_gross_profit'));
  assert.ok(js.includes('aria-expanded'));
  assert.ok(js.includes('escape(order.comment)'));
});

test("owner courier demo is read-only and has no supplier writes",()=>{
  const ui=readFileSync("admin/staff.js","utf8");
  assert.match(ui,/function renderCourierPreview\(api\)/);
  assert.match(ui,/staffCourierPreview/);
  assert.match(ui,/demo_read_only/);
  assert.match(ui,/button\.disabled=true/);
  assert.doesNotMatch(ui.slice(ui.indexOf("async function renderCourierPreview"),ui.indexOf("async function renderApplicant")),/submitSupplierOrder|partgrade\.com/);
});

test("courier-facing login fits mobile screens without removing real registration forms",()=>{
  assert.match(html,/<h2 id=\"authTitle\">Вход<\/h2>/);
  assert.doesNotMatch(html,/<p>Служебный кабинет<\/p>/);
  assert.match(html,/Для владельца и сотрудников ZapFormat/);
  assert.match(css,/@media \(max-width: 780px\)/);
  assert.match(css,/#authScreen \.auth-brand \{/);
  assert.match(css,/#authScreen \.auth-card input \{/);
  assert.match(css,/font-size: 16px; \/\* prevents Safari input focus zoom/);
  assert.match(css,/#authScreen \.form-error:empty/);
  assert.match(css,/@media \(max-width: 780px\) and \(max-height: 670px\)/);
  for(const id of ["loginForm","courierRegisterToggle","courierRegisterForm","courierVerifyForm","courierVerifySubmit"]){
    assert.match(html,new RegExp("id=\""+id+"\""));
  }
});

test("admin login uses approved ZAPFORMAT wordmark without redundant captions",()=>{
  const brandCss=readFileSync(resolve(root,"admin/zf-premium.css"),"utf8");
  assert.ok(html.includes('<span class="zf-wordmark-main">ZAP</span><span class="zf-wordmark-accent">FORMAT</span>'));
  assert.doesNotMatch(html,/>ЗАКРЫТАЯ ПАНЕЛЬ</);
  assert.doesNotMatch(html,/<p>Служебный кабинет<\/p>/);
  assert.match(css,/#authScreen \.auth-brand-copy \{/);
  assert.match(css,/@media \(max-width:360px\)/);
  assert.match(brandCss,/#authScreen \.auth-brand \.auth-brand-copy h1/);
  assert.match(brandCss,/font-weight: 950/);
  assert.match(brandCss,/#authScreen \.zf-wordmark-accent \{ color: #fa8122; \}/);
});

test("owner order view shows separately tracked purchasing, courier and unconfirmed cash stages",()=>{
  assert.match(server,/ca\.status AS courier_delivery_status/);
  assert.match(server,/cu\.name AS courier_name/);
  assert.match(js,/const routeStages=\[/);
  for(const stage of ["Заказ","Закупка","Склад","Курьер","Оплата"]){
    assert.ok(js.includes("[\""+stage+"\""),stage);
  }
  assert.match(js,/Физическая приёмка пока не фиксируется/);
  assert.match(js,/Получение наличных в системе не фиксируется/);
  assert.match(css,/\.order-checkpoints/);
});
