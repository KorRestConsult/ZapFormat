// Read-only production readiness check. No registration, order, or supplier writes.
// Run: node tests/live-readiness.mjs
// Exit code 1 means that a real-customer launch remains blocked.
import process from 'node:process';

const site = process.env.ZAPFORMAT_SITE_URL || 'https://korrestconsult.github.io/ZapFormat/';
const api = process.env.ZAPFORMAT_API_URL || 'https://api.168.113.211.246.sslip.io';
const checks = [];

async function probe(name, url, verify) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json, text/html' } });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : null;
    const result = verify(response.status, data);
    checks.push({ name, status: response.status, ...result });
  } catch (error) {
    checks.push({ name, status: 'network-error', ready: false, note: error?.name || 'request_failed' });
  }
}

await probe('public-frontend', site, status => ({ ready: status === 200, note: 'public storefront' }));
await probe('api-and-database', api + '/api/health', (status, data) => ({
  ready: status === 200 && data?.ok === true && data?.db === true,
  note: data?.db === true ? 'database responds' : 'database unavailable'
}));
await probe('admin-api-and-access-guard', api + '/api/admin/overview', (status) => ({
  ready: status === 401,
  note: status === 401 ? 'admin endpoint installed; anonymous access denied' : status === 404 ? 'backend admin code not deployed' : status === 200 ? 'SECURITY: anonymous admin access' : 'unexpected status'
}));
await probe('supplier-connection', api + '/api/supplier/health', (status, data) => ({
  ready: status === 200 && data?.ok === true && data?.configured === true,
  note: data?.ok === true ? 'supplier verified' : 'supplier not verified'
}));
await probe('customer-signup', api + '/api/auth/capabilities', (status, data) => ({
  ready: status === 200 && data?.phone_verification === true && data?.password_recovery === true,
  note: data?.phone_verification === true && data?.password_recovery === true ? 'signup and recovery enabled' : 'signup and/or password recovery disabled'
}));

console.log('ZapFormat production readiness (read-only):');
for (const item of checks) console.log((item.ready ? 'PASS' : 'BLOCK') + ' ' + item.name + ' [' + item.status + '] ' + item.note);
const blocked = checks.filter(x => !x.ready).length;
console.log(blocked ? 'NOT READY FOR CUSTOMER ORDERS: ' + blocked + ' blocker(s).' : 'READINESS PROBES PASS. Run full authenticated checkout and load tests before sales.');
if (blocked) process.exitCode = 1;
