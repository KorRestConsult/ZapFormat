"use strict";

require("dotenv").config();
const { PartGradeError, createPartGradeClient } = require("../src/partgrade");

const client = createPartGradeClient();
const base = client.baseUrl;
const login = String(process.env.PARTGRADE_API_LOGIN || "").trim();
const psw = String(process.env.PARTGRADE_API_PASSWORD_MD5 || "").trim();

async function rawGet(path, params = {}) {
  const url = new URL(path, base + "/");
  url.searchParams.set("userlogin", login);
  url.searchParams.set("userpsw", psw);
  for (const [k,v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k,String(v));
  }
  const r = await fetch(url,{headers:{Accept:"application/json"}});
  const text = await r.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch{data={invalidJson:true}}
  return {http:r.status,data};
}

function summarize(label, result) {
  const data=result.data;
  let detail="";
  if(Array.isArray(data)) detail=`count=${data.length}`;
  else if(data && typeof data==="object"){
    const code=data.errorCode ?? data.code ?? "";
    const msg=data.errorMessage ?? data.message ?? "";
    if(code || msg) detail=`errorCode=${code} ${msg}`.trim();
    else detail=`keys=${Object.keys(data).slice(0,8).join(",")}`;
  }
  console.log(label.padEnd(28), "HTTP", result.http, detail);
}

(async()=>{
  console.log("ABCP read-only capability scan. No basket/order mutations will be made.");
  const tests=[
    ["user/info",()=>rawGet("user/info")],
    ["search/tips",()=>rawGet("search/tips",{number:"PRS3420",locale:"ru_RU"})],
    ["search/brands online=0",()=>rawGet("search/brands/",{number:"PRS3420",useOnlineStocks:0,locale:"ru_RU"})],
    ["search/brands online=1",()=>rawGet("search/brands/",{number:"PRS3420",useOnlineStocks:1,locale:"ru_RU"})],
    ["search/articles",()=>rawGet("search/articles/",{number:"PRS3420",brand:"PATRON",locale:"ru_RU"})],
    ["articles/brands",()=>rawGet("articles/brands")],
    ["search/history",()=>rawGet("search/history")],
    ["basket/multibasket",()=>rawGet("basket/multibasket")],
    ["basket/content",()=>rawGet("basket/content")],
    ["basket/paymentMethods",()=>rawGet("basket/paymentMethods")],
    ["basket/shipmentMethods",()=>rawGet("basket/shipmentMethods")],
    ["basket/shipmentOffices",()=>rawGet("basket/shipmentOffices")],
    ["basket/shipmentAddresses",()=>rawGet("basket/shipmentAddresses")],
    ["orders/statuses",()=>rawGet("orders/statuses")],
    ["orders",()=>rawGet("orders",{page:1})],
    ["ts/cart/summary",()=>rawGet("ts/cart/summary")],
    ["ts/orders/list",()=>rawGet("ts/orders/list")]
  ];

  for(const [name,fn] of tests){
    try{ summarize(name, await fn()); }
    catch(e){ console.log(name.padEnd(28),"LOCAL ERROR",e?.message||String(e)); }
  }

  try{
    const data=await client.searchBatch([{brand:"PATRON",number:"PRS3420"}]);
    console.log("search/batch".padEnd(28),"HTTP 200",`count=${Array.isArray(data)?data.length:0}`);
    if(Array.isArray(data) && data[0]){
      console.log("  batch first:",{
        brand:data[0].brand,
        number:data[0].number,
        price:data[0].price,
        availability:data[0].availability,
        deliveryPeriod:data[0].deliveryPeriod
      });
    }
  }catch(e){
    if(e instanceof PartGradeError){
      console.log("search/batch".padEnd(28),`HTTP ${e.status||"?"}`,`errorCode=${e.upstreamCode??""} ${e.upstreamMessage??""}`.trim());
    } else console.log("search/batch".padEnd(28),"LOCAL ERROR",e?.message||String(e));
  }
})().catch(e=>{console.error(e);process.exit(1)});
