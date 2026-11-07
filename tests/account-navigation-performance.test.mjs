import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const src=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const start=src.indexOf("let accountHydrationPromise=null;");
const end=src.indexOf("\nasync function repeatLiveOrder(",start);
assert.ok(start>0&&end>start);
const code=src.slice(start,end);
const corePaths=["/api/account/overview","/api/account/orders","/api/account/requests","/api/garage"];
const optionalPaths=["/api/account/preferences","/api/account/notifications?limit=30"];

function environment(){
  const calls=[],renders=[],preferences=[],notifications=[],garageCalls=[];
  const ctx={
    sessionUser:{id:"customer-a"},accountDataHydrated:false,accountPreferences:{},
    liveAccountOrders:[],liveAccountRequests:[],console:{warn(){}},
    backendConfigured:()=>true,
    apiRequest:async(path)=>{
      calls.push(path);
      if(path===corePaths[0])return {stats:{total_orders:3}};
      if(path===corePaths[1])return {orders:[{id:1}]};
      if(path===corePaths[2])return {requests:[]};
      if(path===corePaths[3])return {vehicles:[]};
      if(optionalPaths.includes(path))return new Promise(()=>{});
      throw new Error("Unexpected "+path);
    },
    renderLiveAccount:(overview,orders,requests,garage)=>renders.push({overview,orders,requests,garage}),
    hydrateRealGarage:garage=>{garageCalls.push(garage);return new Promise(()=>{});},
    renderAccountSetupChecklist:()=>{},
    renderAccountPreferences:p=>preferences.push(p),
    renderAccountNotifications:n=>notifications.push(n),
    refreshCustomerTelegramStatus:async()=>{}
  };
  vm.createContext(ctx);vm.runInContext(code,ctx);
  return {ctx,calls,renders,preferences,notifications,garageCalls,
    load:opts=>vm.runInContext(opts?"hydrateAccountData("+opts+")":"hydrateAccountData()",ctx)};
}
test("Core account data renders without waiting for optional endpoints or garage detail",async()=>{
  const e=environment();
  await e.load();
  assert.equal(e.renders.length,1);
  assert.equal(e.renders[0].orders.length,1);
  assert.equal(e.ctx.accountDataHydrated,true);
  assert.equal(e.garageCalls.length,1);
  assert.ok(corePaths.every(path=>e.calls.includes(path)));
  assert.ok(optionalPaths.every(path=>e.calls.includes(path)));
});
test("Rapid repeated navigation does not refetch account; explicit refresh does",async()=>{
  const e=environment();
  await e.load();
  const count=e.calls.length;
  await e.load();
  await e.load();
  assert.equal(e.calls.length,count);
  await e.load("{force:true}");
  assert.equal(e.renders.length,2);
  assert.equal(e.calls.filter(path=>path==="/api/account/orders").length,2);
});
test("Switching customer account invalidates cached data",async()=>{
  const e=environment();
  await e.load();
  e.ctx.sessionUser={id:"customer-b"};
  await e.load();
  assert.equal(e.renders.length,2);
  assert.equal(e.calls.filter(path=>path==="/api/account/orders").length,2);
});

test("Account tab switching never invalidates loaded orders merely by navigation",()=>{
  const start=src.indexOf("function showAccountTab(tab){");
  const end=src.indexOf('document.addEventListener("click"',start);
  assert.ok(start>0&&end>start);
  const route=src.slice(start,end);
  assert.doesNotMatch(route,/accountDataHydrated\s*=\s*false/);
  assert.match(route,/hydrateAccountData\(\)/);
  assert.match(src,/const accountPaneCache=new Map\(\)/);
});

test("Explicit status refresh bypasses the short-lived cache",()=>{
  const start=src.indexOf('document.getElementById("accountOrdersRefresh")');
  const end=src.indexOf('document.addEventListener("input"',start);
  assert.ok(start>0&&end>start);
  assert.match(src.slice(start,end),/hydrateAccountData\(\{force:true\}\)/);
});
