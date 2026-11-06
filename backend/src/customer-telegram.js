"use strict";
const crypto=require("node:crypto");
const SITE="https://zapformat.ru/";
const WEBHOOK="https://api.zapformat.ru/api/telegram/customer/webhook";

function codeHash(value){return crypto.createHash("sha256").update(String(value||"")).digest("hex")}
function safe(value,max=450){return String(value||"").replace(/[\x00-\x1f\x7f]/g," ").replace(/\s+/g," ").trim().slice(0,max)}
function equalSecret(a,b){
  if(!a||!b)return false;
  return crypto.timingSafeEqual(Buffer.from(codeHash(a)),Buffer.from(codeHash(b)));
}
function statusLabel(value){
  return {new:"Принят",received:"Принят",confirmed:"Подтверждён",processing:"В работе",ready:"Готов к получению ZapFormat",completed:"Вручён клиенту",cancelled:"Отменён"}[String(value||"").toLowerCase()]||"Уточняется";
}
function messageText(n){
  return ["ZAPFORMAT · Обновление по заказу",safe(n.title,180),safe(n.body,850),"","История заказа: "+SITE].filter(Boolean).join("\n").slice(0,1800);
}
function installCustomerTelegram({app,pool,requireUser,rateLimit,telegramCall,env=process.env}){
  const state={configured:false,ready:false,username:null,error:null};
  const token=()=>String(env.ZAPFORMAT_CUSTOMER_TELEGRAM_BOT_TOKEN||"").trim();
  const secret=()=>String(env.ZAPFORMAT_CUSTOMER_TELEGRAM_WEBHOOK_SECRET||"").trim();
  const call=(method,payload)=>telegramCall(method,payload,token());
  const send=(chat,text)=>call("sendMessage",{chat_id:chat,text:String(text||"").slice(0,4000),disable_web_page_preview:true});
  const limit=rateLimit({windowMs:600000,limit:12,standardHeaders:"draft-8",legacyHeaders:false});
  let flushing=false;

  async function initialize(){
    state.configured=Boolean(token()&&secret());
    state.ready=false;state.username=null;
    if(!state.configured){state.error="not_configured";return false}
    try{
      const me=await call("getMe",{});
      if(!me?.username)throw Object.assign(new Error("username_missing"),{code:"username_missing"});
      await call("setWebhook",{url:WEBHOOK,secret_token:secret(),allowed_updates:["message"],drop_pending_updates:false});
      state.username=String(me.username);state.ready=true;state.error=null;return true;
    }catch(e){state.error=e?.code||"telegram_unavailable";console.warn("[CustomerTelegram] setup",state.error);return false}
  }
  app.get("/api/account/telegram/status",requireUser,async(req,res,next)=>{
    try{
      const rows=await pool.query("SELECT enabled,connected_at FROM customer_telegram_links WHERE user_id=$1 LIMIT 1",[req.user.id]);
      const linked=rows.rows[0]?.enabled===true;
      res.set("Cache-Control","no-store");
      res.json({available:state.ready,linked,connected_at:linked?rows.rows[0].connected_at:null,bot_username:state.ready?state.username:null});
    }catch(e){next(e)}
  });
  app.post("/api/account/telegram/connect",requireUser,limit,async(req,res,next)=>{
    if(!state.ready)return res.status(503).json({error:"customer_telegram_unavailable"});
    const code=crypto.randomBytes(18).toString("base64url");
    const db=await pool.connect();
    try{
      await db.query("BEGIN");
      await db.query("DELETE FROM customer_telegram_link_codes WHERE user_id=$1",[req.user.id]);
      await db.query("INSERT INTO customer_telegram_link_codes(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '10 minutes')",[codeHash(code),req.user.id]);
      await db.query("COMMIT");
      res.set("Cache-Control","no-store");
      res.json({ok:true,expires_seconds:600,link:"https://t.me/"+state.username+"?start=zf_"+code});
    }catch(e){await db.query("ROLLBACK").catch(()=>{});next(e)}
    finally{db.release()}
  });
  app.post("/api/account/telegram/disconnect",requireUser,limit,async(req,res,next)=>{
    try{
      await pool.query("DELETE FROM customer_telegram_link_codes WHERE user_id=$1",[req.user.id]);
      await pool.query("UPDATE customer_telegram_links SET enabled=false,updated_at=now() WHERE user_id=$1",[req.user.id]);
      res.json({ok:true,linked:false});
    }catch(e){next(e)}
  });
  app.post("/api/account/telegram/test",requireUser,limit,async(req,res)=>{
    if(!state.ready)return res.status(503).json({error:"customer_telegram_unavailable"});
    try{
      const link=await pool.query("SELECT chat_id FROM customer_telegram_links WHERE user_id=$1 AND enabled=true LIMIT 1",[req.user.id]);
      if(!link.rowCount)return res.status(409).json({error:"customer_telegram_not_linked"});
      await send(link.rows[0].chat_id,"ZAPFORMAT · Тест связи\nУведомления работают. Изменения статусов ваших заказов и отдельных позиций будут приходить сюда.\n"+SITE);
      res.json({ok:true,sent:true});
    }catch(e){console.warn("[CustomerTelegram] test",e?.code||"send_failed");res.status(502).json({error:"customer_telegram_send_failed"})}
  });

  async function claimLink(code,chatId){
    const db=await pool.connect();
    try{
      await db.query("BEGIN");
      const codes=await db.query("DELETE FROM customer_telegram_link_codes WHERE token_hash=$1 AND expires_at>now() RETURNING user_id",[codeHash(code)]);
      const userId=codes.rows[0]?.user_id;
      if(!userId){await db.query("ROLLBACK");return "expired"}
      const linked=await db.query("SELECT user_id FROM customer_telegram_links WHERE chat_id=$1 AND user_id<>$2 LIMIT 1",[chatId,userId]);
      if(linked.rowCount){await db.query("ROLLBACK");return "already_linked"}
      await db.query("INSERT INTO customer_telegram_links(user_id,chat_id,enabled,connected_at,updated_at) VALUES($1,$2,true,now(),now()) ON CONFLICT (user_id) DO UPDATE SET chat_id=EXCLUDED.chat_id,enabled=true,connected_at=now(),updated_at=now()",[userId,chatId]);
      await db.query("COMMIT");return "ok";
    }catch(e){await db.query("ROLLBACK").catch(()=>{});throw e}
    finally{db.release()}
  }
  async function userOrders(chatId){
    const linked=await pool.query("SELECT user_id FROM customer_telegram_links WHERE chat_id=$1 AND enabled=true LIMIT 1",[chatId]);
    if(!linked.rowCount)return "Аккаунт не привязан. Подключите Telegram в личном кабинете ZapFormat.";
    const result=await pool.query("SELECT order_number,status FROM orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5",[linked.rows[0].user_id]);
    if(!result.rowCount)return "Заказов пока нет. Каталог: "+SITE;
    return ["ZAPFORMAT · Последние заказы",...result.rows.map(x=>"№"+safe(x.order_number,25)+" · "+statusLabel(x.status)),"","Полная история: "+SITE].join("\n");
  }
  app.post("/api/telegram/customer/webhook",async(req,res)=>{
    if(!state.configured||!equalSecret(req.get("X-Telegram-Bot-Api-Secret-Token"),secret()))return res.status(403).json({error:"forbidden"});
    const m=req.body?.message;
    const chatId=String(m?.chat?.id||"");
    const text=String(m?.text||"").trim().slice(0,240);
    if(m?.chat?.type!=="private"||!/^\d{5,20}$/.test(chatId)||String(m?.from?.id||"")!==chatId||!text.startsWith("/"))return res.json({ok:true});
    try{
      if(/^\/start(?:@\w+)?\s+zf_[A-Za-z0-9_-]{24}$/.test(text)){
        const status=await claimLink(text.split("zf_")[1],chatId);
        await send(chatId,status==="ok"
          ?"ZAPFORMAT · Telegram подключён.\nЗаказы и изменения отдельных деталей будут приходить сюда.\n/orders — последние заказы\n/stop — отключить"
          :status==="already_linked"?"Этот Telegram уже привязан к другому аккаунту. Сначала отключите прежнюю привязку."
          :"Ссылка истекла или уже использована. Получите новую в личном кабинете.");
      }else if(/^\/stop(?:@\w+)?$/.test(text)){
        await pool.query("UPDATE customer_telegram_links SET enabled=false,updated_at=now() WHERE chat_id=$1",[chatId]);
        await send(chatId,"ZAPFORMAT · Уведомления отключены. Повторное подключение — через личный кабинет.");
      }else if(/^\/orders(?:@\w+)?$/.test(text)){
        await send(chatId,await userOrders(chatId));
      }else if(/^\/(start|help)(?:@\w+)?$/.test(text)){
        await send(chatId,"ZAPFORMAT · Заказы в Telegram\nОдин раз подключите бота в личном кабинете: "+SITE+"\n/orders — последние заказы\n/stop — отключить уведомления");
      }
      res.json({ok:true});
    }catch(e){console.warn("[CustomerTelegram] webhook",e?.code||"failed");res.status(500).json({error:"telegram_webhook_failed"})}
  });

  async function flushQueue(){
    if(!state.ready||flushing)return 0;
    flushing=true;
    try{
      const batch=await pool.query(
        "WITH jobs AS (SELECT notification_id FROM customer_telegram_deliveries WHERE attempts<8 AND next_attempt_at<=now() AND (status='pending' OR (status='sending' AND claimed_until<now())) ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED) "+
        "UPDATE customer_telegram_deliveries q SET status='sending',attempts=q.attempts+1,claimed_until=now()+interval '90 seconds' FROM jobs WHERE q.notification_id=jobs.notification_id RETURNING q.notification_id,q.user_id,q.attempts",
        [12]);
      for(const job of batch.rows){
        const target=await pool.query("SELECT n.title,n.body,l.chat_id FROM notifications n JOIN customer_telegram_links l ON l.user_id=n.user_id AND l.enabled=true WHERE n.id=$1 AND n.user_id=$2 LIMIT 1",[job.notification_id,job.user_id]);
        if(!target.rowCount){
          await pool.query("UPDATE customer_telegram_deliveries SET status='failed',last_error='not_linked' WHERE notification_id=$1",[job.notification_id]);
          continue;
        }
        try{
          await send(target.rows[0].chat_id,messageText(target.rows[0]));
          await pool.query("UPDATE customer_telegram_deliveries SET status='sent',sent_at=now(),claimed_until=NULL,last_error=NULL WHERE notification_id=$1",[job.notification_id]);
        }catch(e){
          const attempts=Number(job.attempts);
          await pool.query("UPDATE customer_telegram_deliveries SET status=$2,claimed_until=NULL,next_attempt_at=now()+($3::int * interval '1 second'),last_error=$4 WHERE notification_id=$1",
            [job.notification_id,attempts>=8?"failed":"pending",Math.min(3600,20*Math.pow(2,Math.max(0,attempts-1))),safe(e?.code||"telegram_unavailable",80)]);
        }
      }
      return batch.rowCount;
    }catch(e){console.warn("[CustomerTelegram] queue",e?.code||"db_unavailable");return 0}
    finally{flushing=false}
  }
  function start(){
    if(!pool)return;
    void initialize();
    const timer=setInterval(()=>{if(!state.ready&&state.configured)void initialize();void flushQueue()},15000);
    timer.unref();
  }
  return {start,initialize,flushQueue,state};
}
module.exports={installCustomerTelegram,statusLabel,messageText,codeHash,equalSecret};
