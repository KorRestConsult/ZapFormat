"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {probeResendDelivery}=require("../src/resend-mail");
const {config,sendEmail}=require("../src/email-registration");

test("Resend only activates for an explicitly verified delivery check",async()=>{
  let called;
  const fetchImpl=async(url,init)=>{
    called={url,init};
    return {ok:true,status:200};
  };
  assert.deepEqual(await probeResendDelivery("re_test_dummy",{fetchImpl}),{ready:true,error:null});
  assert.equal(called.url,"https://api.resend.com/emails");
  assert.equal(called.init.headers.Authorization,"Bearer re_test_dummy");
  const body=JSON.parse(called.init.body);
  assert.equal(body.from,"ZapFormat <auth@zapformat.ru>");
  assert.deepEqual(body.to,["delivered@resend.dev"]);
});

test("Resend verification never activates an invalid, unverified or unavailable provider",async()=>{
  for(const [status,error] of [[401,"invalid_key"],[403,"domain_unverified"],[422,"domain_unverified"],[500,"provider_unavailable"]]){
    assert.deepEqual(await probeResendDelivery("re_fake",{fetchImpl:async()=>({ok:false,status})}),{ready:false,error});
  }
  assert.deepEqual(await probeResendDelivery("re_fake",{fetchImpl:async()=>{throw Error("network timeout")}}),{ready:false,error:"provider_unavailable"});
});

test("Unverified Resend key does not enable account registration or send codes",async()=>{
  const unverified={RESEND_API_KEY:"re_fakesecret",EMAIL_FROM:"auth@zapformat.ru",RESEND_READY:"false"};
  assert.equal(config(unverified).enabled,true);
  assert.equal(config(unverified).ready,false);
  await assert.rejects(sendEmail({to:"customer@example.com",code:"123456",env:unverified,fetchImpl:async()=>{throw Error("MUST NOT SEND")}}),/Email is not configured/);
  assert.equal(config({...unverified,RESEND_READY:"true"}).ready,true);
});

test("Owner-only mail routes and email confirmation cannot expose key in status",()=>{
  const source=fs.readFileSync(path.resolve(__dirname,"../src/server.js"),"utf8");
  const admin=fs.readFileSync(path.resolve(__dirname,"../../admin/admin.js"),"utf8");
  assert.match(source,/app.post\("\/api\/admin\/email\/resend\/config"/);
  assert.match(source,/app.post\("\/api\/admin\/email\/resend\/check"/);
  assert.match(source,/req\.user\?\.role!=="owner"/);
  assert.match(admin,/resendSetupForm/);
  assert.match(admin,/https:\/\/resend.com\/domains/);
  assert.doesNotMatch(admin,/gmailSetupForm/);
  assert.match(source,/if \(pool && requestUser && allConfirmed && \(Boolean\(requestUser\.phone_verified_at\) \|\| Boolean\(requestUser\.email_verified_at\) \|\| ownerTestMode\)\)/);
  assert.match(source,/!validSmsPhone\(delivery\?\.recipient_phone\)/);
});
