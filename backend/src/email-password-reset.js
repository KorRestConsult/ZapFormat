"use strict";
const crypto=require("node:crypto");
const bcrypt=require("bcryptjs");
const {createOtpCode,otpHash,otpMatches}=require("./auth-otp");
const {config,validEmail,maskEmail,sendEmail}=require("./email-registration");

function installEmailPasswordReset({app,pool,limiter,issueSession,publicUser,otpSecret,sessionDays,sendMail=sendEmail,env=process.env}){
  app.post("/api/auth/email-password-reset/start",limiter,async(req,res,next)=>{
    const email=String(req.body?.email||"").trim().toLowerCase();
    const customerType=String(req.body?.customer_type||"individual").trim();
    const scope=String(req.body?.account_scope||"customer").trim();
    if(!["customer","admin"].includes(scope))return res.status(400).json({error:"invalid_account_scope"});
    if(scope==="customer"&&!["individual","service"].includes(customerType))return res.status(400).json({error:"invalid_customer_type"});
    if(!config(env).ready)return res.status(503).json({error:"email_not_configured"});
    if(!validEmail(email))return res.status(400).json({error:"invalid_email_registration"});
    if(!otpSecret())return res.status(503).json({error:"verification_unavailable"});
    res.set("Cache-Control","no-store");
    const reply=id=>res.status(202).json({ok:true,challenge_id:id,masked_email:maskEmail(email),expires_in:600,resend_in:60});
    try{
      const found=await pool.query(
        `SELECT id FROM users
         WHERE lower(email)=$1 AND status='active'
           AND (($3::text='admin' AND role IN ('owner','admin'))
             OR ($3::text='customer' AND customer_type=$2
                 AND email_verified_at IS NOT NULL AND role='customer'))
         ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END
         LIMIT 1`,
        [email,customerType,scope]
      );
      // Never reveal whether an email is bound to a customer or privileged account.
      if(!found.rowCount)return reply(crypto.randomUUID());
      const userId=found.rows[0].id;
      const recent=await pool.query(
        "SELECT 1 FROM email_password_reset_challenges WHERE user_id=$1 AND consumed_at IS NULL AND created_at>now()-interval '60 seconds' LIMIT 1",
        [userId]
      );
      if(recent.rowCount)return reply(crypto.randomUUID());
      const id=crypto.randomUUID();
      const code=createOtpCode();
      await pool.query(
        "INSERT INTO email_password_reset_challenges(id,user_id,code_hash,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes')",
        [id,userId,otpHash(otpSecret(),id,code)]
      );
      try{await sendMail({to:email,code,purpose:"reset",env});}
      catch(err){
        await pool.query("DELETE FROM email_password_reset_challenges WHERE id=$1",[id]).catch(()=>{});
        console.warn("[EmailPasswordReset]",err?.code||"delivery_failed");
        return res.status(502).json({error:"email_delivery_failed"});
      }
      return reply(id);
    }catch(e){next(e);}
  });

  app.post("/api/auth/email-password-reset/verify",limiter,async(req,res,next)=>{
    const id=String(req.body?.challenge_id||"").trim();
    const code=String(req.body?.code||"").trim();
    const password=String(req.body?.password||"");
    const confirmation=String(req.body?.password_confirmation||"");
    if(!/^[0-9a-f-]{36}$/i.test(id)||!/^\d{6}$/.test(code))
      return res.status(400).json({error:"verification_code_required"});
    if(password.length<8||password.length>128)return res.status(400).json({error:"password_too_short"});
    if(password!==confirmation)return res.status(400).json({error:"passwords_do_not_match"});
    const db=await pool.connect();
    try{
      await db.query("BEGIN");
      const found=await db.query("SELECT * FROM email_password_reset_challenges WHERE id=$1 FOR UPDATE",[id]);
      const challenge=found.rows[0];
      if(!challenge||challenge.consumed_at||Number(challenge.attempts)>=5||
        new Date(challenge.expires_at).getTime()<=Date.now()){
        await db.query("ROLLBACK");
        return res.status(400).json({error:"verification_expired"});
      }
      if(!otpMatches(otpSecret(),id,code,challenge.code_hash)){
        await db.query("UPDATE email_password_reset_challenges SET attempts=attempts+1 WHERE id=$1",[id]);
        await db.query("COMMIT");
        return res.status(400).json({error:"verification_code_invalid"});
      }
      const userResult=await db.query(
        "SELECT * FROM users WHERE id=$1 AND status='active' AND ((role='customer' AND email_verified_at IS NOT NULL) OR role IN ('owner','admin')) FOR UPDATE",
        [challenge.user_id]
      );
      if(!userResult.rowCount){
        await db.query("ROLLBACK");
        return res.status(400).json({error:"verification_expired"});
      }
      const newHash=await bcrypt.hash(password,12);
      await db.query("UPDATE users SET password_hash=$2,updated_at=now() WHERE id=$1",[challenge.user_id,newHash]);
      await db.query("DELETE FROM user_sessions WHERE user_id=$1",[challenge.user_id]);
      await db.query("UPDATE email_password_reset_challenges SET consumed_at=now() WHERE id=$1",[id]);
      await db.query("COMMIT");
      const token=await issueSession(req,res,challenge.user_id);
      return res.status(200).json({user:publicUser(userResult.rows[0]),access_token:token,expires_in:sessionDays*86400});
    }catch(e){await db.query("ROLLBACK").catch(()=>{});next(e);}
    finally{db.release();}
  });
}
module.exports={installEmailPasswordReset};
