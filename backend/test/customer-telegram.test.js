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

test("one-time link connects the intended customer, cannot be replayed, /stop revokes",async()=>{
  const app=fakeApp();
  const userId="11111111-1111-4111-8111-111111111111";
  const store={tokenHash:null,chat:null,enabled:false,messages:[]};
  const query=async(sql,args=[])=>{
    const q=sql.replace(/\s+/g," ").trim();
    if(/^(BEGIN|COMMIT|ROLLBACK)$/.test(q))return{rowCount:0,rows:[]};
    if(q.startsWith("DELETE FROM customer_telegram_link_codes WHERE user_id")){store.tokenHash=null;return{rowCount:0,rows:[]}}
    if(q.startsWith("INSERT INTO customer_telegram_link_codes")){store.tokenHash=args[0];return{rowCount:1,rows:[]}}
    if(q.startsWith("DELETE FROM customer_telegram_link_codes WHERE token_hash")){
      const matches=store.tokenHash===args[0];store.tokenHash=null;
      return{rowCount:matches?1:0,rows:matches?[{user_id:userId}]:[]};
    }
    if(q.startsWith("SELECT user_id FROM customer_telegram_links WHERE chat_id=$1 AND user_id<>"))return{rowCount:0,rows:[]};
    if(q.startsWith("INSERT INTO customer_telegram_links")){store.chat=args[1];store.enabled=true;return{rowCount:1,rows:[]}}
    if(q.startsWith("UPDATE customer_telegram_links SET enabled=false")){store.enabled=false;return{rowCount:1,rows:[]}}
    if(q.startsWith("DELETE FROM customer_telegram_links WHERE chat_id=")){
      const wasLinked=store.chat===args[0];
      store.chat=null;store.enabled=false;
      return{rowCount:wasLinked?1:0,rows:wasLinked?[{user_id:userId}]:[]};
    }
    if(q.startsWith("DELETE FROM customer_telegram_deliveries"))return{rowCount:0,rows:[]};
    if(q.startsWith("SELECT user_id FROM customer_telegram_links WHERE chat_id=$1")){
      return{rowCount:store.enabled?1:0,rows:store.enabled?[{user_id:userId}]:[]};
    }
    if(q.startsWith("SELECT order_number,status FROM orders"))return{rowCount:1,rows:[{order_number:143,status:"processing"}]};
    if(q.startsWith("SELECT enabled,connected_at FROM customer_telegram_links"))return{rowCount:store.chat?1:0,rows:store.chat?[{enabled:store.enabled}]:[]};
    if(q.startsWith("SELECT chat_id FROM customer_telegram_links"))return{rowCount:store.enabled?1:0,rows:store.enabled?[{chat_id:store.chat}]:[]};
    throw new Error("unknown test SQL: "+q.slice(0,60));
  };
  const db={query,release(){}};
  const pool={query,connect:async()=>db};
  const secret="ExampleWebhookSecret123456789012345";
  const bot=installCustomerTelegram({app,pool,requireUser:(r,s,n)=>n(),rateLimit:middleware,
    telegramCall:async(method,payload)=>{if(method==="getMe")return{username:"ZapFormatBuyerBot"};if(method==="sendMessage")store.messages.push(payload);return{ok:true}},
    env:{ZAPFORMAT_CUSTOMER_TELEGRAM_BOT_TOKEN:"1234:fakevalid",ZAPFORMAT_CUSTOMER_TELEGRAM_WEBHOOK_SECRET:secret}});
  await bot.initialize();
  const request=async(method,path,body={},head="")=>{
    const out={statusCode:200,payload:null,headers:{},status(n){this.statusCode=n;return this},
      json(v){this.payload=v;return this},set(k,v){this.headers[k]=v;return this}};
    await app.routes.get(method+" "+path)({user:{id:userId},body,get(){return head}},out,e=>{if(e)throw e});
    return out;
  };
  const connect=await request("POST","/api/account/telegram/connect");
  assert.equal(connect.statusCode,200);
  const code=connect.payload.link.split("zf_")[1];
  assert.match(code,/^[A-Za-z0-9_-]{24}$/);
  assert.equal(store.tokenHash,codeHash(code));
  const message={message:{chat:{id:123456789,type:"private"},from:{id:123456789},text:"/start zf_"+code}};
  assert.equal((await request("POST","/api/telegram/customer/webhook",message,"wrong")).statusCode,403);
  assert.equal(store.chat,null);
  const welcome=await request("POST","/api/telegram/customer/webhook",message,secret);
  assert.equal(welcome.statusCode,200);
  assert.equal(store.chat,"123456789");
  assert.equal(store.enabled,true);
  const replay=await request("POST","/api/telegram/customer/webhook",message,secret);
  assert.equal(replay.statusCode,200);
  assert.match(store.messages.at(-1).text,/истекла|использована/);
  await request("POST","/api/telegram/customer/webhook",{message:{chat:{id:123456789,type:"private"},from:{id:123456789},text:"/orders"}},secret);
  assert.match(store.messages.at(-1).text,/№143/);
  await request("POST","/api/telegram/customer/webhook",{message:{chat:{id:123456789,type:"private"},from:{id:123456789},text:"/stop"}},secret);
  assert.equal(store.enabled,false);
});
