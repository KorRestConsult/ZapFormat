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


test('Public mobile first paint cannot be blank while authorization is pending', () => {
  assert.match(html, /<body class="guest-mode auth-route">/, 'public page starts visibly rather than hiding main pending API');
  assert.doesNotMatch(html, /<body[^>]*session-pending/, 'never hide the whole store behind session restoration');
  assert.match(html, /<section class="view active" id="view-auth">/, 'login should remain readable even if JavaScript or authentication fails');
  assert.match(app, /document\.body\.classList\.remove\("session-pending"\)/, 'successful auth can still finalize loading state');
});


test('Guest and signed-in state are explicit, first load does not bounce from auth to search',()=>{
  assert.ok(html.includes('id="sessionEntryButton"'));
  assert.match(html, /<section class="view active" id="view-auth">/);
  assert.match(app, /sessionStorage\.getItem\("zapformat-guest-choice"\)/);
  assert.match(app, /showRoute\(choice==="browse"\?"home":"auth"\)/);
  assert.match(app, /headerStatus\.textContent=sessionUser\?/);
  assert.match(css, /#sessionEntryButton\{display:inline-flex!important/);
});

test('Phone confirmation survives refresh without persisting password and hidden required fields cannot block it',()=>{
  assert.match(app, /function restorePendingRegistration\(\)/);
  assert.match(app, /sessionStorage\.setItem\("zapformat-register-challenge"/);
  assert.match(app, /sessionStorage\.removeItem\("zapformat-register-challenge"\)/);
  assert.match(app, /control\.disabled=node\.hidden/);
  assert.match(html, /Если оператор заблокировал звонок как спам/);
  assert.doesNotMatch(app.slice(app.indexOf('function restorePendingRegistration()'),app.indexOf('function resetRegistrationFlow()')),/sessionStorage\.setItem\("[^"]*",\s*JSON\.stringify\(registrationDraft\)/);
});

test('Mobile forms avoid Safari keyboard autozoom and do not overlap bottom navigation',()=>{
  assert.match(css, /font-size:17px!important/);
  assert.match(css, /body:has\(input:focus\) \.mobile-nav/);
  assert.match(css, /body\.auth-route \.mobile-nav/);
});


test('registration remains tappable even when the capabilities endpoint is slow or offline',()=>{
  assert.match(html, /<button type="button" data-auth-tab="register">Регистрация<\/button>/);
  assert.doesNotMatch(html, /data-auth-tab="register" disabled/);
  const apply = app.slice(app.indexOf('function applyAuthCapabilities()'),app.indexOf('async function hydrateAuthCapabilities()'));
  assert.match(apply, /registerTab\.disabled=false/);
  assert.match(app, /timeoutMs:8000/);
  assert.match(app, /if\(tab==="register" && authCapabilities\.phone_verification===false\)\{\s*setAuthStatus/);
});
test('mobile auth does not autozoom the verification stage and has stable viewport rules',()=>{
  assert.match(html, /name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover"/);
  assert.match(css, /html,body\{scroll-behavior:auto!important\}/);
  assert.match(css, /#view-auth \.auth-form input,\s*#view-auth \.auth-form select\{\s*font-size:18px!important/);
  assert.match(app, /function restoreIosViewportScale\(\)/);
  const register = app.slice(app.indexOf('document.getElementById("registerForm")?.addEventListener'),app.indexOf('document.getElementById("forgotForm")?.addEventListener'));
  assert.doesNotMatch(register, /startAuthCooldown\("register",result\.resend_in\|\|60\);\s*form\.querySelector\('\[name="verification_code"\]'\)\?\.focus\(\);/);
});

test('returning customer does not see a flash of login before session restore',()=>{
  assert.match(html,/document\.documentElement\.classList\.add\("zf-preauth"\)/);
  assert.match(app,/document\.documentElement\.classList\.remove\("zf-preauth"\)/);
  assert.match(css,/html\.zf-preauth #view-home\{display:block!important\}/);
  assert.match(app,/apiRequest\("\/api\/auth\/me",\{timeoutMs:8000\}\)/);
});

test('Lost SMS.RU call response is recovered without another paid provider request',()=>{
  const server=readFileSync(resolve(root,'backend/src/server.js'),'utf8');
  assert.match(server,/app\.post\("\/api\/auth\/register\/recover"/);
  const endpoint=server.slice(server.indexOf('app.post("/api/auth/register/recover"'),server.indexOf('app.post("/api/auth/register/verify"'));
  assert.match(endpoint,/bcrypt\.compare\(password,row\.password_hash\)/);
  assert.doesNotMatch(endpoint,/createAuthChallenge|sendVerificationCall|sendVerificationCode/);
  assert.match(app,/async function recoverAcceptedRegistration\(\)/);
  assert.match(app,/\["request_timeout","network_unavailable","otp_too_soon"\]/);
  assert.match(html,/id="registerRecoverButton"/);
  assert.match(css,/\.auth-recovery-check\[hidden\]\{display:none!important\}/);
});
