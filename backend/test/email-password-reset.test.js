"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const express=require("express");
const bcrypt=require("bcryptjs");
const {otpHash}=require("../src/auth-otp");
const {installEmailPasswordReset}=require("../src/email-password-reset");
const {sendEmail}=require("../src/email-registration");

const id="11111111-1111-4111-8111-111111111111";
const userId="22222222-2222-4222-8222-222222222222";
const env={SMTP_HOST:"smtp.example.com",SMTP_USER:"sender@example.com",SMTP_PASSWORD:"fake",EMAIL_FROM:"sender@example.com"};
async function serve(t,pool,options={}){
  const app=express();app.use(express.json());
  installEmailPasswordReset({app,pool,limiter:(_r,_s,n)=>n(),issueSession:async()=> "session-token",publicUser:u=>({id:u.id}),otpSecret:()=> "secret",sessionDays:30,env:options.env||env,sendMail:options.sendMail||(async()=>{})});
  const server=app.listen(0,"127.0.0.1");
  await new Promise(resolve=>server.once("listening",resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  return "http://127.0.0.1:"+server.address().port;
}
const post=(url,body)=>fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});

test("reset cannot send email when SMTP is not connected",async t=>{
  const pool={query:async()=>{throw Error("DB must not be queried")}};
  const base=await serve(t,pool,{env:{}});
  const r=await post(base+"/api/auth/email-password-reset/start",{email:"customer@example.com"});
  assert.equal(r.status,503);assert.equal((await r.json()).error,"email_not_configured");
});

test("unknown email gets generic 202 and no message",async t=>{
  let sent=0;
  const pool={query:async()=>({rowCount:0,rows:[]})};
  const base=await serve(t,pool,{sendMail:async()=>{sent++;}});
  const r=await post(base+"/api/auth/email-password-reset/start",{email:"missing@example.com"});
  assert.equal(r.status,202);
  assert.match((await r.json()).challenge_id,/^[0-9a-f-]{36}$/);
  assert.equal(sent,0);
});

test("verified customer code resets password, revokes sessions and consumes OTP",async t=>{
  const events=[];let hash="";
  const pool={
    connect:async()=>({
      query:async(sql,args=[])=>{
        events.push(sql);
        if(sql.startsWith("SELECT * FROM email_password_reset_challenges"))return {rowCount:1,rows:[{id,user_id:userId,code_hash:otpHash("secret",id,"123456"),attempts:0,expires_at:new Date(Date.now()+600000)}]};
        if(sql.startsWith("SELECT * FROM users"))return {rowCount:1,rows:[{id:userId,name:"Customer",role:"customer",email_verified_at:new Date(),status:"active"}]};
        if(sql.startsWith("UPDATE users SET"))hash=args[1];
        return {rowCount:1,rows:[]};
      },
      release:()=>{events.push("release");}
    })
  };
  const base=await serve(t,pool);
  const wrong=await post(base+"/api/auth/email-password-reset/verify",{challenge_id:id,code:"000000",password:"newPassword99",password_confirmation:"newPassword99"});
  assert.equal(wrong.status,400);
  assert.equal((await wrong.json()).error,"verification_code_invalid");
  assert.ok(!events.some(x=>x.startsWith("UPDATE users SET")));
  events.length=0;
  const correct=await post(base+"/api/auth/email-password-reset/verify",{challenge_id:id,code:"123456",password:"newPassword99",password_confirmation:"newPassword99"});
  assert.equal(correct.status,200);
  assert.equal((await correct.json()).access_token,"session-token");
  assert.equal(await bcrypt.compare("newPassword99",hash),true);
  assert.ok(events.some(x=>x.startsWith("DELETE FROM user_sessions")));
  assert.ok(events.some(x=>x.startsWith("UPDATE email_password_reset_challenges SET consumed_at")));
});

test("recovery email has its own subject and ten-minute code, without sending",async()=>{
  let sent;
  const smtp={SMTP_HOST:"smtp.example.com",SMTP_USER:"sender@example.com",SMTP_PASSWORD:"password",EMAIL_FROM:"sender@example.com"};
  await sendEmail({to:"customer@example.com",code:"123456",purpose:"reset",env:smtp,createTransport:()=>({sendMail:async x=>{sent=x;},close(){}})});
  assert.match(sent.subject,/восстановление/);
  assert.match(sent.text,/123456/);
  assert.match(sent.text,/10 минут/);
});
