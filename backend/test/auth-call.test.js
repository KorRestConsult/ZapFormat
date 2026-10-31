"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {createSmsRuCallSender}=require("../src/auth-call");
test("flash call sends normalized phone and retains the code only on backend",async()=>{
  let destination,values;
  const send=createSmsRuCallSender({apiId:"test-key",fetchImpl:async(u,init)=>{
    destination=u;values=new URLSearchParams(init.body);
    return {ok:true,json:async()=>({status:"OK",code:"1435",call_id:"123",cost:0.4})};
  }});
  const r=await send({phone:"+7 (999) 123-45-67",ip:"198.51.100.3"});
  assert.equal(destination,"https://sms.ru/code/call");
  assert.equal(values.get("phone"),"79991234567");
  assert.equal(values.get("ip"),"198.51.100.3");
  assert.equal(values.get("api_id"),"test-key");
  assert.deepEqual(r,{code:"1435",call_id:"123",cost:0.4});
});
test("flash call refuses invalid numbers before spending money",async()=>{
  let called=false;
  await assert.rejects(createSmsRuCallSender({apiId:"a",fetchImpl:async()=>{called=true}})({phone:"+15551231234"}),{code:"invalid_phone"});
  assert.equal(called,false);
});
test("flash call rejects provider failure and malformed codes",async()=>{
  const send=createSmsRuCallSender({apiId:"a",fetchImpl:async()=>({ok:true,json:async()=>({status:"OK",code:"666666"})})});
  await assert.rejects(send({phone:"+79991234567"}),{code:"sms_send_failed"});
});
