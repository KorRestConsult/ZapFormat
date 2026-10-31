"use strict";
const {SmsDeliveryError}=require("./auth-otp");

// SMS.RU outgoing flash call: secret API ID and expected four digits stay on the server.
function createSmsRuCallSender({apiId,fetchImpl=globalThis.fetch}={}){
  return async function callVerificationCode({phone,ip}={}){
    const key=String(apiId??process.env.SMSRU_API_ID??"").trim();
    if(!key)throw new SmsDeliveryError("Flash call not configured","sms_not_configured");
    if(typeof fetchImpl!=="function")throw new SmsDeliveryError("No HTTP client","sms_send_failed");
    const digits=String(phone||"").replace(/\D/g,"");
    if(!/^7\d{10}$/.test(digits))throw new SmsDeliveryError("Invalid Russian phone","invalid_phone");
    const sourceIp=String(ip||"").trim();
    const params=new URLSearchParams({api_id:key,phone:digits,ip:sourceIp||"-1"});
    let response, data;
    try{
      response=await fetchImpl("https://sms.ru/code/call",{
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
        body:params,
        signal:AbortSignal.timeout(12000)
      });
      data=await response.json();
    }catch(err){
      throw new SmsDeliveryError("Call provider unavailable","sms_send_failed",err.message);
    }
    if(!response.ok||data?.status!=="OK"||!/^\d{4}$/.test(String(data?.code||""))){
      throw new SmsDeliveryError("Call provider rejected verification","sms_send_failed",
        data?.status_text||data?.status||response.status);
    }
    return {code:String(data.code),call_id:String(data.call_id||""),cost:Number(data.cost)||null};
  };
}
module.exports={createSmsRuCallSender};
