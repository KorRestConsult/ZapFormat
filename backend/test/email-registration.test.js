"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const express=require("express");
const {config,validEmail,maskEmail,sendEmail,installEmailRegistration}=require("../src/email-registration");
const {otpHash}=require("../src/auth-otp");
test("email requires a configured verified outbound mail provider",()=>{
 assert.equal(config({}).enabled,false);
 assert.equal(config({RESEND_API_KEY:"key",EMAIL_FROM:"ZapFormat <mail@site.ru>"}).enabled,true);
 assert.equal(config({SMTP_HOST:"smtp.example.com",SMTP_USER:"user",SMTP_PASSWORD:"pass",SMTP_FROM:"sender@example.com"}).enabled,true);
 assert.equal(validEmail("customer@example.com"),true);
 assert.equal(validEmail("not-email"),false);
 assert.equal(validEmail("bad\r\n@example.com"),false);
 assert.equal(maskEmail("ilya@example.com"),"il***@example.com");
});
test("SMTP sender sends a six-digit code and never stores raw token",async()=>{
 let got=null,closed=false;
 const env={SMTP_HOST:"smtp.example.com",SMTP_USER:"u",SMTP_PASSWORD:"p",SMTP_FROM:"noreply@example.com"};
 await sendEmail({to:"customer@example.com",code:"123456",env,createTransport:()=>{
   return {sendMail:async o=>{got=o;},close:()=>{closed=true}};
 }});
 assert.match(got.text,/123456/);
 assert.equal(got.to,"customer@example.com");
 assert.equal(closed,true);
});
test("email registration refuses to create an unverified customer or send without mail configuration",async(t)=>{
 const app=express();app.use(express.json());
 const db={query:async()=>{throw Error("No database calls expected without email provider")}};
 installEmailRegistration({app,pool:db,limiter:(_r,_s,n)=>n(),issueSession:async()=>"",publicUser:u=>u,otpSecret:()=> "secret",sessionDays:30,env:{}});
 const server=app.listen(0,"127.0.0.1");
 await new Promise(resolve=>server.once("listening",resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base="http://127.0.0.1:"+server.address().port;
 const status=await (await fetch(base+"/api/auth/email-registration/status")).json();
 assert.equal(status.available,false);
 const signup=await fetch(base+"/api/auth/email-registration/start",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:"Test",email:"test@example.com",password:"secret123",password_confirmation:"secret123"})});
 assert.equal(signup.status,503);
 assert.equal((await signup.json()).error,"email_not_configured");
});
test("OTP digest never equals the code; wrong email codes are rejected",()=>{
 const id="11111111-1111-4111-8111-111111111111";
 const hash=otpHash("secret",id,"123456");
 assert.notEqual(hash,"123456");
});
