"use strict";

require("dotenv").config();

const base=String(process.env.PARTGRADE_API_BASE||"https://auto-complekt.public.api.abcp.ru").replace(/\/+$/,"");
const login=String(process.env.PARTGRADE_API_LOGIN||"").trim();
const psw=String(process.env.PARTGRADE_API_PASSWORD_MD5||"").trim();

async function get(path, params={}){
  const u=new URL(path,base+"/");
  u.searchParams.set("userlogin",login);
  u.searchParams.set("userpsw",psw);
  for(const [k,v] of Object.entries(params)){
    if(v!==undefined && v!==null && v!=="") u.searchParams.set(k,String(v));
  }
  const r=await fetch(u,{headers:{Accept:"application/json"}});
  const text=await r.text();
  let data;
  try{ data=JSON.parse(text); }catch{ data=text; }
  return {status:r.status,data};
}

function summarize(label,r){
  let extra="";
  if(Array.isArray(r.data)) extra="count="+r.data.length;
  else if(r.data && typeof r.data==="object"){
    const code=r.data.errorCode ?? r.data.code ?? "";
    const msg=r.data.errorMessage ?? r.data.message ?? "";
    extra=(code||msg)?`errorCode=${code} ${msg}`:`keys=${Object.keys(r.data).slice(0,12).join(",")}`;
  } else extra=String(r.data).slice(0,160);
  console.log(label.padEnd(34),"HTTP",r.status,extra);
}

(async()=>{
  console.log("ABCP search/articles probe (read-only; secrets are never printed).");

  const brands=await get("search/brands/",{number:"PRS3420"});
  summarize("search/brands PRS3420",brands);

  let brand="PATRON";
  if(Array.isArray(brands.data)){
    const hit=brands.data.find(x=>String(x?.brand||"").toUpperCase().includes("PATRON"));
    if(hit?.brand) brand=hit.brand;
  } else if(brands.data && typeof brands.data==="object"){
    const vals=Object.values(brands.data);
    const hit=vals.find(x=>String(x?.brand||"").toUpperCase().includes("PATRON"));
    if(hit?.brand) brand=hit.brand;
  }
  console.log("Brand returned by ABCP:",brand);

  const variants=[
    ["plain",{}],
    ["locale",{locale:"ru_RU"}],
    ["online=0",{useOnlineStocks:0}],
    ["online=1",{useOnlineStocks:1}],
    ["locale+online=0",{locale:"ru_RU",useOnlineStocks:0}],
    ["locale+online=1",{locale:"ru_RU",useOnlineStocks:1}]
  ];

  for(const [name,extra] of variants){
    const r=await get("search/articles/",{number:"PRS3420",brand,...extra});
    summarize("search/articles "+name,r);
    if(r.status===200 && Array.isArray(r.data) && r.data[0]){
      const x=r.data[0];
      console.log(" first offer:",{
        brand:x.brand,
        number:x.number,
        price:x.price,
        availability:x.availability,
        deliveryPeriod:x.deliveryPeriod,
        supplierCode:x.supplierCode ? "[present]" : null,
        itemKey:x.itemKey ? "[present]" : null
      });
    }
  }

  const info=await get("user/info");
  summarize("user/info",info);
  if(info.status===200 && info.data && typeof info.data==="object"){
    const safe={};
    for(const k of ["id","code","name","organization","locale","filialId","profileId","agreementId","status"]){
      if(k in info.data) safe[k]=info.data[k];
    }
    console.log("user/info safe fields:",safe);
  }
})().catch(e=>{console.error(e);process.exit(1)});
