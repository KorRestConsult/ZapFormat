import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync("index.html","utf8");
const js=readFileSync("app.js","utf8");
const server=readFileSync("backend/src/server.js","utf8");
const email=readFileSync("backend/src/email-registration.js","utf8");
const migration=readFileSync("backend/db/015_service_registration.sql","utf8");
const owner=readFileSync("admin/admin.js","utf8");

test("email registration distinguishes private customers from workshops",()=>{
  assert.equal((html.match(/name="customer_type" value="individual"/g)||[]).length,1);
  assert.equal((html.match(/name="customer_type" value="service"/g)||[]).length,1);
  assert.equal((html.match(/data-service-only hidden/g)||[]).length,1);
  assert.match(html,/data-auth-tab="register"/);
  assert.doesNotMatch(html,/data-auth-tab="email"/);
  assert.match(js,/function updateRegistrationCustomerType/);
  assert.match(js,/input.required=service/);
  assert.match(js,/input.disabled=!service/);
});

test("customer workshop name is validated before phone and email registration",()=>{
  assert.match(server,/serviceName\.length>160/);
  assert.match(server,/service_name_required/);
  assert.match(email,/serviceName\.length>160/);
  assert.match(email,/service_name_required/);
  assert.match(server,/challenge\.service_name\|\|null/);
  assert.match(email,/challenge\.service_name\|\|null/);
  for(const table of ["users","auth_challenges","email_registration_challenges"]){
    assert.ok(migration.includes("ALTER TABLE "+table+" ADD COLUMN IF NOT EXISTS service_name text"));
  }
});

test("owner customer list identifies workshops, and mail signup does not feign readiness",()=>{
  assert.match(owner,/i\.customer_type==="service"/);
  assert.match(owner,/i\.service_name/);
  assert.match(js,/submit\.disabled=!ready/);
  assert.match(js,/Сервер сообщил, что отправка кодов недоступна/);
  assert.match(js,/Связь с сервером нестабильна/);
});

test("customer phone signup is off by default without touching legacy account authentication",()=>{
  assert.match(server,/PHONE_CUSTOMER_SIGNUP_ENABLED !== \"true\"/);
  assert.match(server,/registration_email_only/);
  assert.match(server,/app.post\(\"\/api\/auth\/login\"/);
});

test("Owner email is reusable for two distinct customer profiles without admin access",()=>{
  const scopes=readFileSync("backend/db/017_customer_account_scopes.sql","utf8");
  const init=readFileSync("backend/db/001_init.sql","utf8");
  const deploy=readFileSync("backend/deploy/release-live-catalog.sh","utf8");
  const reset=readFileSync("backend/src/email-password-reset.js","utf8");
  assert.match(scopes,/DROP INDEX IF EXISTS users_email_unique/);
  assert.match(scopes,/lower\(email\), role, customer_type/);
  assert.doesNotMatch(init,/CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique/);
  assert.match(deploy,/017_customer_account_scopes\.sql/);
  assert.match(email,/role='customer' AND customer_type=\$2/);
  assert.match(email,/challenge\.customer_type/);
  assert.match(reset,/customer_type=\$2/);
  assert.match(server,/\$3::text = 'customer' AND role = 'customer' AND customer_type = \$4/);
  assert.match(server,/\$3::text = 'admin' AND role IN/);
  assert.match(owner,/account_scope:"admin"/);
  assert.match(js,/account_scope:"customer"/);
  assert.match(html,/name="login_customer_type"/);
  assert.match(html,/name="reset_customer_type"/);
});
