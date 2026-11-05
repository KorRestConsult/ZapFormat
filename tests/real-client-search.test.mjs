import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
const file=readFileSync(resolve('app.js'),'utf8');
const extract=name=>{
  const i=file.indexOf('function '+name+'(');
  assert.ok(i>=0,'missing '+name);
  const j=file.indexOf('\n}',i);
  assert.ok(j>i,'missing closing '+name);
  return file.slice(i,j+2);
};
const ctx=vm.createContext({});
vm.runInContext(['looksLikeArticle','normalizeVin','looksLikeVin','extractArticleCandidate'].map(extract).join('\n'),ctx);
const parse=q=>vm.runInContext('extractArticleCandidate('+JSON.stringify(q)+')',ctx);
test('single Russian part names are not mistaken for supplier articles',()=>{
  for(const q of ['Шаровые','Шаровая','Амортизатор','Фильтр','Ступица']){
    assert.equal(parse(q),null,q);
  }
});
test('real part articles still search by manufacturer',()=>{
  assert.equal(parse('0986AF1111'),'0986AF1111');
  assert.equal(parse('123456'),'123456');
  assert.equal(parse('А123'), 'А123');
});
test('VIN is recognized separately and not sent as article',()=>{
  assert.equal(parse('LSVYL60TXN2171564'),null);
  assert.match(file,/api\/catalog\/vin-browser\?vin/);
  assert.match(file,/timeoutMs:32000/);
});

test("guest VIN context survives to the next parts query",()=>{ assert.match(file,/if\(transientVinVehicle\) return transientVinVehicle;\s*if\(!sessionUser\) return null;/); });

test("VIN clarification never writes to a saved garage vehicle",()=>{
  assert.doesNotMatch(file,/attachVinToCurrentVehicle/);
  assert.match(file,/const exact=garageVehicles.find\(item=>normalizeVin\(item.vin\)===vin\)/);
  assert.match(file,/transientVinVehicle=exact \|\| \{/);
  assert.match(file,/VIN указан, но совместимость деталей ещё не подтверждена/);
});

test("mobile search and verification requests have bounded waits",()=>{
  const sources=(file.match(/timeoutMs:28000/g)||[]).length;
  assert.equal(sources,3);
  assert.match(file,/register\/verify[\s\S]{0,100}timeoutMs:15000/);
  assert.match(file,/register\/start[\s\S]{0,100}timeoutMs:15000/);
});

test("answers to smart-search questions are never treated as part numbers",()=>{
  assert.match(file,/const article=pendingSmartSearchBaseQuery \? null : extractArticleCandidate\(raw\)/);
  assert.match(file,/search\(document.getElementById\(\"searchInput\"\).value,\{newRequest:true\}\)/);
});

test("public manual enquiry form uses its own protected, non-purchase workflow",()=>{
  const html=readFileSync(resolve("index.html"),"utf8");
  const api=readFileSync(resolve("backend/src/server.js"),"utf8");
  for(const id of ["manualLead","manualLeadForm","manualLeadPart","manualLeadVin","manualLeadName","manualLeadPhone","manualLeadConsent","manualLeadSend","manualLeadStatus"]){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(file,/api\/public\/manual-part-request/);
  assert.match(file,/privacy_consent:document\.getElementById\("manualLeadConsent"\)/);
  const start=api.indexOf('app.post("/api/public/manual-part-request"');
  const end=api.indexOf('app.get("/api/integration/status"',start);
  assert.ok(start>=0&&end>start);
  const route=api.slice(start,end);
  assert.match(route,/guestQuoteLimiter, requireDatabase/);
  assert.match(route,/privacy_consent_required/);
  assert.match(route,/validSmsPhone\(phone\)/);
  assert.match(route,/INSERT INTO quote_requests/);
  assert.match(route,/INSERT INTO quote_request_items/);
  assert.match(route,/VALUES\(\$1,'',\$2,1,\$3,true\)/);
  assert.doesNotMatch(route,/submitSupplierOrder|PARTGRADE_AUTO_ORDER|revalidateOfferToken/);
});

test("new search does not carry a stale VIN into a different car",()=>{
  assert.match(file,/if\(options.newRequest\)\{[^\n]*transientVinVehicle=null;/);
});

test("only email registration is visible and sending is disabled without outbound mail",()=>{
  const html=readFileSync(resolve("index.html"),"utf8");
  assert.match(html,/data-auth-tab="register"/);
  assert.doesNotMatch(html,/data-auth-tab="email"/);
  assert.doesNotMatch(html,/id="registerForm"/);
  assert.match(file,/hydrateEmailRegistrationCapability/);
  assert.match(file,/if\(submit&&!submit.dataset.submitting\)submit.disabled=!ready/);
});

test("generic brake discs prompt for car immediately without catalog calls",()=>{
  vm.runInContext(extract("quickVehicleClarification"),ctx);
  const quick=q=>vm.runInContext("quickVehicleClarification("+JSON.stringify(q)+")",ctx);
  for(const q of ["Тормозные диски","Тормозной диск","Шаровые","Тормозные колодки","Масляный фильтр"]){
    assert.match(quick(q),/VIN/);
  }
  assert.equal(quick("BMW X3 2015"),null);
  assert.equal(quick("Тормозные диски BMW 2015"),null);
  assert.match(file,/if\(instantQuestion\)\{[\s\S]{0,410}renderSmartPartSearch/);
  assert.match(file,/data-open-manual-lead/);
});

test("registration recovery distinguishes missing challenge from network timeout without sending new calls",()=>{
  const start=file.indexOf("async function recoverAcceptedRegistration()");
  const end=file.indexOf("document.getElementById(\"registerRecoverButton\")?.addEventListener",start);
  const handler=file.slice(start,end);
  assert.match(handler,/error\?\.code===\"verification_not_found\"/);
  assert.match(handler,/error\?\.code===\"request_timeout\"/);
  assert.match(handler,/новый звонок/i);
  assert.doesNotMatch(handler,/\/api\/auth\/register\/start/);
});

test("large analog catalogs reveal grouped alternatives in bounded batches",()=>{
 assert.match(file,/const ANALOG_GROUP_BATCH=6/);
 assert.match(file,/analogGroups\.slice\(0,analogVisibleGroupLimit\)/);
 assert.match(file,/data-show-analog-groups/);
 assert.match(file,/analogVisibleGroupLimit\+=ANALOG_GROUP_BATCH/);
 assert.match(file,/analogGroupPageKey!==currentKey/);
});
