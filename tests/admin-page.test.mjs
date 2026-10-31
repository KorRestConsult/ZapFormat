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
  assert.match(html,/admin\/admin\.js/);
  assert.match(html,/admin\/admin\.css/);
  assert.match(html,/noindex,nofollow/);
  assert.ok(!html.includes('id="view-admin"'),'must not reuse customer interface');
});

test('privileged API only runs after owner/admin session validation',()=>{
  assert.match(js,/\["owner","admin"\]\.includes/);
  assert.match(js,/request\("\/api\/auth\/me"\)/);
  assert.match(js,/if\(!authorized\(data\.user\)\)/);
  assert.match(js,/if\(!state\.user\)return/);
  assert.match(js,/if\(!state\.user\|\|!captions\[page\]\)return/);
  assert.match(js,/\/api\/admin\/overview/);
  assert.match(js,/\/api\/admin\/orders/);
  assert.match(js,/\/api\/admin\/pricing/);
  assert.match(js,/\/api\/admin\/customers/);
  assert.match(js,/\/api\/admin\/requests/);
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
});
