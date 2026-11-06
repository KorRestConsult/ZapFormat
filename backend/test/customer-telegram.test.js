"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {installCustomerTelegram,codeHash,equalSecret,statusLabel,messageText}=require("../src/customer-telegram");
function fakeApp(){const routes=new Map();return{routes,get(p,...h){routes.set("GET "+p,h.at(-1))},post(p,...h){routes.set("POST "+p,h.at(-1))}}}
const middleware=()=>()=>{};
test("customer Telegram token security, identity and status wording",()=>{
  assert.match(codeHash("one"),/^[a-f0-9]{64}$/);
  assert.notEqual(codeHash("one"),codeHash("two"));
  assert.equal(equalSecret("a","a"),true);
  assert.equal(equalSecret("a","b"),false);
  assert.equal(equalSecret("",""),false);
  assert.equal(statusLabel("completed"),"Вручён клиенту");
  assert.equal(statusLabel("processing"),"В работе");
  assert.match(messageText({title:"Заказ #42",body:"Поставщик подтвердил позицию"}),/Заказ #42/);
});
test("unconfigured bot does not contact Telegram, rejects webhook without secret",async()=>{
  let calls=0;const app=fakeApp();
  const bot=installCustomerTelegram({app,pool:{query:async()=>({rows:[],rowCount:0})},requireUser:(r,s,n)=>n(),rateLimit:middleware,telegramCall:async()=>{calls++},env:{}});
  assert.equal(await bot.initialize(),false);assert.equal(calls,0);
  assert.ok(app.routes.has("POST /api/account/telegram/connect"));
  let status;
  await app.routes.get("POST /api/telegram/customer/webhook")({get:()=>"",body:{}},{status(n){status=n;return this},json(){return this}});
  assert.equal(status,403);
});
test("configured customer bot uses separate token and secret HTTPS webhook",async()=>{
  const calls=[];const app=fakeApp();
  const bot=installCustomerTelegram({app,pool:{query:async()=>({rows:[],rowCount:0})},requireUser:(r,s,n)=>n(),rateLimit:middleware,
    telegramCall:async(method,payload,token)=>{calls.push({method,payload,token});if(method==="getMe")return{username:"ZapFormatOrdersBot"};return true},
    env:{ZAPFORMAT_CUSTOMER_TELEGRAM_BOT_TOKEN:"123:test",ZAPFORMAT_CUSTOMER_TELEGRAM_WEBHOOK_SECRET:"private_secret"}});
  assert.equal(await bot.initialize(),true);
  assert.equal(calls.length,2);
  assert.equal(calls[0].token,"123:test");
  assert.equal(calls[1].method,"setWebhook");
  assert.equal(calls[1].payload.secret_token,"private_secret");
  assert.equal(calls[1].payload.url,"https://api.zapformat.ru/api/telegram/customer/webhook");
});
test("customer bot status endpoint does not leak chat id or token",async()=>{
  const app=fakeApp();installCustomerTelegram({app,pool:{query:async()=>({rows:[{enabled:true,connected_at:"2026-11-06"}],rowCount:1})},requireUser:(r,s,n)=>n(),rateLimit:middleware,telegramCall:async()=>null,env:{}});
  let data;await app.routes.get("GET /api/account/telegram/status")({user:{id:"test"}},{set(){return this},json(x){data=x;return this}},e=>{throw e});
  assert.equal(data.linked,true);assert.ok(!Object.hasOwn(data,"chat_id"));assert.ok(!Object.hasOwn(data,"token"));
});
