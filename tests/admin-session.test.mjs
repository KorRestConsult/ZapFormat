import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import vm from "node:vm";

const source=readFileSync(resolve("admin/admin.js"),"utf8");
const restore=source.match(/  async function restoreSession\(\)\{[\s\S]*?\n  \}/)?.[0];
assert.ok(restore,"restoreSession must be extractable");

async function exercise(response){
  const calls={loggedOut:0,loggedIn:0,disconnected:0};
  const state={token:"",user:null};
  const context={
    state,KEY:"zapformat-admin-access-token",
    localStorage:{getItem:()=> "cached-session-token"},
    restoring:false,retryTimer:null,
    document:{hidden:true},
    clearRetry(){},
    loggedOut(){calls.loggedOut++;state.token="";state.user=null;},
    loggedIn(user){calls.loggedIn++;state.user=user;},
    showConnectionIssue(){calls.disconnected++;},
    authorized(user){return Boolean(user && user.role==="owner");},
    request:async()=>{if(response instanceof Error)throw response;return response;},
    setTimeout:()=>1
  };
  await vm.runInNewContext(restore+"\nrestoreSession()",context);
  return {calls,context,state};
}

test("TLS or network outages preserve owner session for retry",async()=>{
  const result=await exercise(new TypeError("Failed to fetch"));
  assert.equal(result.calls.disconnected,1);
  assert.equal(result.calls.loggedOut,0);
  assert.equal(result.state.token,"cached-session-token");
  assert.equal(result.context.retryTimer,1);
});

test("server-side 401 expires saved login",async()=>{
  const error=new Error("unauthorized");error.status=401;
  const result=await exercise(error);
  assert.equal(result.calls.loggedOut,1);
  assert.equal(result.state.token,"");
  assert.equal(result.calls.disconnected,0);
});

test("a valid owner session restores without entering credentials again",async()=>{
  const result=await exercise({user:{role:"owner",name:"Owner"}});
  assert.equal(result.calls.loggedIn,1);
  assert.equal(result.calls.loggedOut,0);
  assert.equal(result.state.user.role,"owner");
});

test("reconnect UI and connectivity event handlers are wired",()=>{
  const html=readFileSync(resolve("admin/index.html"),"utf8");
  for(const id of ["reconnectButton","changeAccountButton"])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(source,/window\.addEventListener\("online"/);
  assert.match(source,/document\.addEventListener\("visibilitychange"/);
  assert.match(source,/retryTimer=setTimeout/);
});
