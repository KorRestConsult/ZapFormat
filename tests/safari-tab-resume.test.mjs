import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const src=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const begin=src.indexOf('const VIEW_RESUME_KEY="zapformat-last-view";');
const end=src.indexOf("function showRoute(route){",begin);
assert.ok(begin>0&&end>begin);
const lib=src.slice(begin,end);
const restoreBegin=src.indexOf("function restoreFromUrl(){");
const restoreEnd=src.indexOf('\ndocument.addEventListener("visibilitychange"',restoreBegin);
const restoring=src.slice(restoreBegin,restoreEnd);
function sandbox(){
  const store=new Map(),local=new Map(),actions=[];
  const ctx={
    sessionUser:{id:"a"},sessionStorage:{
      setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)||null,
      removeItem:k=>store.delete(k)},
    localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)},
    location:{search:""},
    URLSearchParams,
    showRoute:route=>actions.push(["route",route]),
    search:(q,opts)=>actions.push(["search",q,opts]),
    renderCartPage:()=>{},
    refreshCartOffers:()=>Promise.resolve(),
    loadSearchResume:()=>({query:"old article",brand:"old brand"}),
    supplierAvailable:false
  };
  vm.createContext(ctx);vm.runInContext(lib+restoring,ctx);
  return {ctx,store,local,actions,
    save:route=>vm.runInContext("rememberVisibleRoute("+JSON.stringify(route)+")",ctx),
    read:()=>vm.runInContext("lastVisibleRoute()",ctx),
    restore:()=>vm.runInContext("restoreFromUrl()",ctx)};
}
test("Safari reload resumes customer garage, not stale article search",()=>{
 const x=sandbox();x.save("garage");x.restore();
 assert.deepEqual(x.actions,[["route","garage"]]);
});
test("Last customer view is scoped to account and cannot cross login",()=>{
 const x=sandbox();x.save("orders");
 x.ctx.sessionUser={id:"b"};assert.equal(x.read(),null);
 x.ctx.sessionUser=null;assert.equal(x.read(),null);
});
test("Last searched article reloads only when search was actually open",()=>{
 const x=sandbox();x.save("search");x.restore();
 assert.equal(x.actions[0][0],"search");
 assert.equal(x.actions[0][1],"old article");
});
test("Explicit URL route overrides a saved view",()=>{
 const x=sandbox();x.save("garage");x.ctx.location.search="?view=cart";
 x.restore();assert.deepEqual(x.actions,[["route","cart"]]);
});
test("Account profile opens the last subtab and route state is recorded",()=>{
 assert.match(src,/if\(route==="profile"\) showAccountTab\(rememberedAccountTab\(\)\)/);
 assert.match(src,/rememberVisibleRoute\(route\);\s*syncMobileNav\(route\);/);
 const x=sandbox();x.local.set("zapformat-account-tab","returns");
 assert.equal(vm.runInContext("rememberedAccountTab()",x.ctx),"returns");
});
