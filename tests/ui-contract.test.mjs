import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const app = readFileSync(resolve(root, 'app.js'), 'utf8');
const css = readFileSync(resolve(root, 'styles.css'), 'utf8');

const values = (source, pattern) => Array.from(source.matchAll(pattern), match => match[1]);

test('All HTML IDs are unique (events and route targets remain deterministic)', () => {
  const ids = values(html, /\bid="([^"]+)"/g);
  assert.ok(ids.length > 50, 'expected actual application markup');
  assert.equal(ids.length, new Set(ids).size, 'duplicate HTML ID');
});

test('Every storefront navigation route points to a real view or a deliberate alias', () => {
  const ids = new Set(values(html, /\bid="([^"]+)"/g));
  const aliases = new Set(['garage', 'orders']);
  const routes = new Set(values(html, /\bdata-route="([^"]+)"/g));
  assert.ok(routes.has('home') && routes.has('cart') && routes.has('auth'));
  for (const route of routes) {
    assert.ok(ids.has('view-' + route) || aliases.has(route), 'broken route: ' + route);
  }
  assert.ok(ids.has('view-profile'), 'account view required by aliases');
});

test('Every account navigation tab has a matching pane', () => {
  const ids = new Set(values(html, /\bid="([^"]+)"/g));
  const tabs = new Set(values(html, /\bdata-account-tab="([^"]+)"/g));
  for (const tab of tabs) {
    assert.ok(ids.has('account-' + tab), 'missing customer pane: ' + tab);
  }
  for (const tab of ['orders', 'garage', 'returns', 'reports', 'profile', 'delivery']) {
    assert.ok(tabs.has(tab), 'missing account tab: ' + tab);
  }
});

test('CSS and JavaScript references target tracked root assets', () => {
  for (const asset of ['styles.css', 'config.js', 'app.js']) {
    assert.ok(html.includes('./' + asset), 'missing page asset: ' + asset);
  }
  assert.ok(html.includes('name="viewport"'), 'responsive viewport missing');
  assert.ok(html.includes('lang="ru"'), 'document language missing');
});

test('Guests can browse and view cart, but account sections stay private', () => {
  const start = app.indexOf('function showRoute(route){');
  assert.ok(start >= 0);
  const routeHandler = app.slice(start, start + 1050);
  assert.match(routeHandler, /protectedProductRoute/);
  for (const route of ['home', 'search', 'cart', 'auth']) {
    assert.ok(routeHandler.includes('"' + route + '"'), 'missing public view ' + route);
  }
  assert.match(routeHandler, /!sessionUser/, 'private route guard missing');
  assert.ok(html.includes('auth-guest-link'), 'no way to resume public search from login');
});

test('Checkout distinguishes authenticated orders from guest enquiries', () => {
  const start = app.indexOf('async function checkoutCart(){');
  const end = app.indexOf('document.getElementById("accountOrdersRefresh")',start);
  assert.ok(start>0 && end>start);
  const handler=app.slice(start,end);
  assert.ok(handler.includes('guestQuoteAgree'));
  assert.ok(handler.includes('if(supplierAvailable!==true)'));
  assert.ok(handler.includes('sessionUser ? "/api/quote-requests" : "/api/public/quote-requests"'));
  assert.ok(handler.includes('privacy_consent:true'));
  assert.ok(html.includes('id="guestQuoteAgree"'));
  assert.ok(html.includes('id="guestQuoteWebsite"'));
  assert.ok(handler.includes('if(sessionUser && !accountPreferences?.delivery?.address)'));
});

test('Public enquiry is rate-limited and cannot create a supplier order',()=>{
  const source=readFileSync(resolve(root,'backend/src/server.js'),'utf8');
  const start=source.indexOf('async function submitQuoteRequest(req, res, next)');
  const end=source.indexOf('app.get("/api/integration/status"',start);
  assert.ok(start>0&&end>start);
  const handler=source.slice(start,end);
  assert.ok(handler.includes('guest ? null :'));
  assert.ok(handler.includes('if (pool && requestUser && allConfirmed)'));
  assert.ok(handler.includes('privacy_consent_required'));
  assert.ok(handler.includes('guestQuoteLimiter, requireDatabase'));
  assert.ok(handler.includes('VALUES ($1,$2,$3,$4,\'new\',$6,$5)'));
});

test('Cart refresh cannot claim current prices while supplier is disconnected', () => {
  const start = app.indexOf('async function refreshCartOffers(options={})');
  const end = app.indexOf('function selectedCartItems(){', start);
  assert.ok(start > 0 && end > start);
  const handler = app.slice(start, end);
  const check = handler.indexOf('if(supplierAvailable!==true)');
  const query = handler.indexOf('/api/catalog/revalidate');
  assert.ok(check >= 0 && query > check, 'offline guard must precede supplier refresh');
  assert.match(handler, /цены не подтверждены/);
});

test('Touch breakpoints and a non-scrolling mobile navigation exist', () => {
  assert.match(css, /@media\s*\(max-width:900px\)/);
  assert.match(css, /@media\s*\(max-width:600px\)/);
  assert.match(css, /@media\s*\(max-width:370px\)/);
  assert.match(css, /body\s*\{\s*min-width:0!important/);
  assert.ok(html.includes('class="mobile-nav"'));
});

test('management screen is visible only to a server-authorized owner or admin', () => {
  assert.ok(html.includes('id="view-admin"'), 'management view is missing');
  assert.ok(html.includes('id="adminNavButton"') && html.includes('id="adminSidebarButton"'));
  assert.match(app, /function isManagementUser\(\)/);
  assert.match(app, /\["owner","admin"\]\.includes/);
  assert.match(app, /route==="admin" && sessionUser && !isManagementUser\(\)/);
  assert.match(app, /if\(button\) button.hidden=!managementVisible/);
  assert.ok(app.includes('/api/admin/overview'), 'admin endpoint missing');
  assert.ok(app.includes('/api/admin/orders'), 'admin queue endpoint missing');
});


test('Owner order queue paginates without losing the status filter or exposing purchasing actions', () => {
  assert.ok(html.includes('id="adminOrderPagination"'), 'pagination container missing');
  assert.ok(html.includes('id="adminLoadMoreButton"'), 'load-more action missing');
  assert.match(app, /const ADMIN_ORDER_PAGE_SIZE=30/);
  assert.match(app, /async function loadMoreAdminOrders\(\)/);
  assert.match(app, /adminOrderFilterSnapshot/);
  assert.match(app, /"&offset="\+adminOrderOffset/);
  assert.match(app, /renderAdminOrders\(displayed,\{append:true\}\)/);
  assert.match(app, /escapeHtml\(order\.recipient_name/);
  assert.match(css, /\.management-pagination\[hidden\]/);
});


test('administration has read-only requests and customer sections', () => {
  const desk = readFileSync(resolve(root, 'admin-desk.js'), 'utf8');
  const ids = new Set(values(html, /\bid="([^"]+)"/g));
  for (const name of ['adminRequestList', 'adminCustomerList', 'adminCustomerSearch',
    'adminRequestFilter', 'adminRequestsMore', 'adminCustomersMore']) {
    assert.ok(ids.has(name), 'missing admin desk control ' + name);
  }
  assert.ok(html.includes('./admin-desk.js'), 'admin desk script not loaded');
  assert.ok(app.includes('window.hydrateAdminDesk'), 'authorized admin navigation does not hydrate desk');
  assert.match(desk, /isManagementUser\(\)/, 'owner/admin guard absent');
  assert.ok(desk.includes('"/api/admin/"+type'), 'admin-only API prefix missing');
  assert.ok(desk.includes('load("requests")'), 'request loading missing');
  assert.ok(desk.includes('load("customers")'), 'customer loading missing');
  assert.ok(desk.includes('escapeHtml(item.phone||'), 'phone escaping is required');
  assert.ok(desk.includes('escapeHtml(item.email||'), 'customer email escaping is required');
  assert.match(desk, /api\/admin\/pricing/, 'only the pricing editor may write');
  assert.match(desk, /savedPricing/, 'pricing must have an explicit saved snapshot');
  assert.match(desk, /if\(pricingBusy\|\|!savedPricing\|\|!isManagementUser\(\)\)return/, 'pricing writes must require owner/admin session');
  assert.doesNotMatch(desk.slice(desk.indexOf('function requestRow'),desk.indexOf('// Pricing is persisted')),
    /method\s*:\s*["'](?:POST|PATCH|PUT|DELETE)/i, 'requests and customer desk must stay read-only');
  assert.match(css, /\.management-desk-row/, 'desk layout missing');
});

test('pricing controls are role-gated, explicitly saved and have four bands', () => {
  const desk = readFileSync(resolve(root, 'admin-desk.js'), 'utf8');
  for (const id of ['pricing-low','pricing-medium','pricing-high','pricing-premium','pricingMinRub',
    'pricingRounding','pricingSave','pricingDiscard','pricingLivePreview']) {
    assert.ok(html.includes('id="'+id+'"'), 'missing pricing control '+id);
  }
  assert.ok(html.includes('type="range"'), 'pricing must have slider controls');
  assert.ok(desk.includes('method:"PUT"'), 'pricing must save to protected API');
  assert.ok(desk.includes('"/api/admin/pricing"'), 'pricing must use protected endpoint');
});

test('supplier pack minimum is visible and validated in customer cart', () => {
  assert.match(app, /packing:Math.max\(1,Number\(o.packing\|\|1\)\)/);
  assert.match(app, /Минимум поставщика/);
  assert.match(app, /checked.status==="minimum_quantity"/);
});
