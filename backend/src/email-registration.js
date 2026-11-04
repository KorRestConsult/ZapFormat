"use strict";
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { createOtpCode, otpHash, otpMatches } = require("./auth-otp");

function config(env=process.env) {
  const from=String(env.EMAIL_FROM || env.SMTP_FROM || env.RESEND_FROM || "").trim();
  const resend=Boolean(String(env.RESEND_API_KEY||"").trim());
  const smtp=Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
  return { enabled:Boolean(from && (resend||smtp)), ready:Boolean(from && ((resend && env.RESEND_READY==="true") || (!resend && smtp))), from, resend, smtp };
}
function validEmail(value) {
  return typeof value==="string" && value.length<=254 &&
    /^[^\s@<>]+@[^\s@<>]+\.[A-Za-z]{2,}$/.test(value) &&
    !/[\r\n]/.test(value);
}
function maskEmail(email){
  const [name,domain]=email.split("@");
  return name.slice(0,Math.min(2,name.length))+"***@"+domain;
}
async function sendEmail({to,code,purpose="register",env=process.env,fetchImpl=fetch,createTransport}) {
  const c=config(env);
  if(!c.ready) throw Object.assign(new Error("Email is not configured"),{code:"email_not_configured"});
  const recovery=purpose==="reset";
  const subject=recovery?"ZapFormat — восстановление пароля":"ZapFormat — подтверждение email";
  const text=(recovery?"Код восстановления пароля: ":"Код регистрации ZapFormat: ")+code+"\nКод действует 10 минут. Никому его не сообщайте.";
  if(c.resend){
    const response=await fetchImpl("https://api.resend.com/emails",{
      method:"POST",
      headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({from:"ZapFormat <"+c.from+">",to:[to],subject,text}),
      signal:AbortSignal.timeout(12000)
    });
    if(!response.ok) throw Object.assign(new Error("Mail provider rejected the email"),{code:"email_delivery_failed"});
    return;
  }
  const factory=createTransport || require("nodemailer").createTransport;
  const transporter=factory({
    host:String(env.SMTP_HOST),port:Number(env.SMTP_PORT||465),
    secure:Number(env.SMTP_PORT||465)===465,
    auth:{user:String(env.SMTP_USER),pass:String(env.SMTP_PASSWORD)},
    connectionTimeout:10000,greetingTimeout:10000,socketTimeout:12000
  });
  try { await transporter.sendMail({from:c.from,to,subject,text}); }
  finally {transporter.close?.(); }
}
function installEmailRegistration({app,pool,limiter,issueSession,publicUser,otpSecret,sessionDays,
  sendMail=sendEmail,env=process.env}){
  app.get("/api/auth/email-registration/status",(_req,res)=>{
    res.set("Cache-Control","no-store");
    res.json({available:config(env).ready,method:"email_code"});
  });
  app.post("/api/auth/email-registration/start",limiter,async(req,res,next)=>{
    const name=String(req.body?.name||"").trim().slice(0,120);
    const email=String(req.body?.email||"").trim().toLowerCase();
    const password=String(req.body?.password||"");
    const confirm=String(req.body?.password_confirmation||"");
    const customerType=String(req.body?.customer_type||"individual");
    const serviceName=customerType==="service"?String(req.body?.service_name||"").trim():null;
    if(!config(env).ready) return res.status(503).json({error:"email_not_configured"});
    if(!name || !validEmail(email)) return res.status(400).json({error:"invalid_email_registration"});
    if(!["individual","service"].includes(customerType))return res.status(400).json({error:"invalid_customer_type"});
    if(customerType==="service" && (!serviceName||serviceName.length>160))return res.status(400).json({error:"service_name_required"});
    if(password.length<8 || password.length>128)return res.status(400).json({error:"password_too_short"});
    if(password!==confirm)return res.status(400).json({error:"passwords_do_not_match"});
    if(!otpSecret())return res.status(503).json({error:"verification_unavailable"});
    try{
      const exists=await pool.query("SELECT 1 FROM users WHERE lower(email)=$1 AND role='customer' AND customer_type=$2 LIMIT 1",[email,customerType]);
      if(exists.rowCount)return res.status(409).json({error:"user_already_exists"});
      const recent=await pool.query(
        "SELECT 1 FROM email_registration_challenges WHERE email=$1 AND customer_type=$2 AND consumed_at IS NULL AND created_at>now()-interval '60 seconds' LIMIT 1",[email,customerType]);
      if(recent.rowCount)return res.status(429).json({error:"otp_too_soon"});
      const id=crypto.randomUUID();
      const code=createOtpCode();
      const passwordHash=await bcrypt.hash(password,12);
      const hashed=otpHash(otpSecret(),id,code);
      await pool.query(
        "INSERT INTO email_registration_challenges(id,email,name,password_hash,code_hash,customer_type,service_name,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '10 minutes')",
        [id,email,name,passwordHash,hashed,customerType,serviceName]);
      try {await sendMail({to:email,code,env});}
      catch(e){
        await pool.query("DELETE FROM email_registration_challenges WHERE id=$1",[id]).catch(()=>{});
        console.warn("[EmailRegistration]",e?.code||"delivery_failed");
        return res.status(502).json({error:"email_delivery_failed"});
      }
      res.set("Cache-Control","no-store");
      return res.status(202).json({ok:true,challenge_id:id,masked_email:maskEmail(email),
        expires_in:600,resend_in:60,verification_method:"email"});
    }catch(e){next(e);}
  });
  app.post("/api/auth/email-registration/verify",limiter,async(req,res,next)=>{
    const id=String(req.body?.challenge_id||"").trim();
    const code=String(req.body?.code||"").trim();
    if(!/^[0-9a-f-]{36}$/i.test(id)||!/^\d{6}$/.test(code))
      return res.status(400).json({error:"verification_code_required"});
    const db=await pool.connect();
    try{
      await db.query("BEGIN");
      const found=await db.query(
        "SELECT * FROM email_registration_challenges WHERE id=$1 FOR UPDATE",[id]);
      const challenge=found.rows[0];
      if(!challenge||challenge.consumed_at||Number(challenge.attempts)>=5||
         new Date(challenge.expires_at).getTime()<=Date.now()){
        await db.query("ROLLBACK");
        return res.status(400).json({error:"verification_expired"});
      }
      if(!otpMatches(otpSecret(),id,code,challenge.code_hash)){
        await db.query("UPDATE email_registration_challenges SET attempts=attempts+1 WHERE id=$1",[id]);
        await db.query("COMMIT");
        return res.status(400).json({error:"verification_code_invalid"});
      }
      const exists=await db.query("SELECT id FROM users WHERE lower(email)=$1 AND role='customer' AND customer_type=$2 LIMIT 1",[challenge.email,challenge.customer_type]);
      if(exists.rowCount){
        await db.query("ROLLBACK");
        return res.status(409).json({error:"user_already_exists"});
      }
      const created=await db.query(
        "INSERT INTO users(name,email,phone,password_hash,email_verified_at,customer_type,service_name) VALUES($1,$2,NULL,$3,now(),$4,$5) RETURNING *",
        [challenge.name,challenge.email,challenge.password_hash,challenge.customer_type,challenge.service_name||null]);
      const user=created.rows[0];
      await db.query("INSERT INTO carts(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING",[user.id]);
      await db.query("INSERT INTO user_notification_settings(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING",[user.id]);
      await db.query("UPDATE email_registration_challenges SET consumed_at=now() WHERE id=$1",[id]);
      await db.query("COMMIT");
      const token=await issueSession(req,res,user.id);
      return res.status(201).json({user:publicUser(user),access_token:token,expires_in:sessionDays*86400});
    }catch(e){await db.query("ROLLBACK").catch(()=>{});next(e);}
    finally{db.release();}
  });
}
module.exports={config,validEmail,maskEmail,sendEmail,installEmailRegistration};
