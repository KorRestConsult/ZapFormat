"use strict";
// An isolated Resend test address simulates delivery; no real recipient gets mail.
// A successful probe requires an API key permitted to send from our verified domain.
async function probeResendDelivery(apiKey,{fetchImpl=fetch}={}){
  let response;
  try{
    response=await fetchImpl("https://api.resend.com/emails",{
      method:"POST",
      headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
      body:JSON.stringify({
        from:"ZapFormat <auth@zapformat.ru>",
        to:["delivered@resend.dev"],
        subject:"ZapFormat domain verification test",
        text:"Automated simulator-only sender verification. No real customer email."
      }),
      signal:AbortSignal.timeout(10000)
    });
  }catch{return {ready:false,error:"provider_unavailable"};}
  if(response.ok)return {ready:true,error:null};
  if(response.status===401)return {ready:false,error:"invalid_key"};
  if(response.status===403||response.status===422)return {ready:false,error:"domain_unverified"};
  return {ready:false,error:"provider_unavailable"};
}
module.exports={probeResendDelivery};
