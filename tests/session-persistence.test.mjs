import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const frontend=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const backend=readFileSync(new URL('../backend/src/server.js',import.meta.url),'utf8');
const start=frontend.indexOf('let customerSessionRetryTimer=null;');
const end=frontend.indexOf('\nlet accountRefreshBusy=false;',start);
assert.ok(start>=0&&end>start);
const sessionCode=frontend.slice(start,end);
const customer={id:'test-customer',role:'customer',name:'Test'};
const unauthorized=()=>Object.assign(new Error('unauthorized'),{status:401});
const timeout=()=>Object.assign(new Error('request_timeout'),{code:'request_timeout'});
function env(token,request){
  const writes=[],calls=[],timers=[];
  const ctx={
    authToken:token,sessionUser:null,pendingAccountRoute:'garage',
    backendConfigured:()=>true,console:{warn:()=>{}},
    apiRequest:async(path,options)=>{calls.push({path,options});return request(path,options);},
    saveAuthToken(value){writes.push(value);ctx.authToken=value;},
    applySessionUser:()=>{},
    document:{getElementById:()=>null,addEventListener:()=>{},visibilityState:'visible'},
    window:{addEventListener:()=>{}},
    setTimeout(callback,ms){timers.push({callback,ms});return timers.length;},
    clearTimeout:()=>{},
    hydrateCartFromAccount:async()=>{},hydrateAccountData:async()=>{},
    showRoute:()=>{},restoreFromUrl:()=>{}
  };
  vm.createContext(ctx);
  vm.runInContext(sessionCode,ctx);
  return {ctx,calls,writes,timers,run:()=>vm.runInContext('hydrateSession()',ctx)};
}
test('valid bearer survives a site reload',async()=>{
 const x=env('persisted-token',async path=>{
   assert.equal(path,'/api/auth/me');
   return {user:customer};
 });
 assert.equal((await x.run()).role,'customer');
 assert.equal(x.ctx.authToken,'persisted-token');
 assert.deepEqual(x.writes,[]);
});
test('missing bearer restores from protected customer cookie',async()=>{
 const x=env('',async(path,opts)=>{
   assert.equal(path,'/api/auth/customer/restore');
   assert.equal(opts.omitAuthToken,true);
   return {user:customer,access_token:'restored-token'};
 });
 assert.equal((await x.run()).role,'customer');
 assert.deepEqual(x.writes,['restored-token']);
});
test('invalid bearer falls back to valid cookie',async()=>{
 const x=env('stale',async path=>{
   if(path==='/api/auth/me')throw unauthorized();
   return {user:customer,access_token:'restored-token'};
 });
 assert.equal((await x.run()).role,'customer');
 assert.equal(x.ctx.authToken,'restored-token');
 assert.deepEqual(x.calls.map(c=>c.path),['/api/auth/me','/api/auth/customer/restore']);
});
test('temporary outage retains token and schedules retry',async()=>{
 const x=env('valid',async()=>{throw timeout();});
 assert.equal(await x.run(),null);
 assert.equal(x.ctx.authToken,'valid');
 assert.equal(x.timers.length,1);
 assert.deepEqual(x.writes,[]);
});
test('confirmed invalid bearer and cookie require login',async()=>{
 const x=env('invalid',async()=>{throw unauthorized();});
 assert.equal(await x.run(),null);
 assert.deepEqual(x.writes,['']);
});
test('server keeps customer and owner session cookies separate',()=>{
 assert.match(backend,/CUSTOMER_COOKIE_NAME = COOKIE_NAME \+ "_customer"/);
 assert.match(backend,/const cookieName=roleResult\.rows\[0\]\?\.role==="customer" \? CUSTOMER_COOKIE_NAME : COOKIE_NAME/);
 assert.match(backend,/app\.post\("\/api\/auth\/customer\/restore"/);
 assert.match(backend,/if\(!user \|\| user\.role!=="customer"\)/);
 assert.match(backend,/clearMatchingSessionCookies\(req,res,token\)/);
});

