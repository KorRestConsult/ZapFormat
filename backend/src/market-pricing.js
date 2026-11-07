"use strict";

// The market reference is entered by the owner after checking identical
// manufacturer, article and comparable delivery conditions in Ryazan.
// No competitor website is scraped, and no reference is inferred.
function marketKey(brand,article) {
  const b=String(brand||"").trim().toUpperCase().replace(/\s+/g," ");
  const a=String(article||"").trim().toUpperCase().replace(/[\s.\-\/]/g,"");
  return b && a ? b+"|"+a : "";
}
function validReference(input) {
  const brand=String(input?.brand||"").trim().slice(0,100);
  const article=String(input?.article||"").trim().slice(0,120);
  const competitor=String(input?.competitor||"").trim().slice(0,100);
  const price=Number(input?.competitor_price);
  const city=String(input?.city||"Рязань").trim();
  const rawUrl=String(input?.source_url||"").trim();
  let url;
  try {url=new URL(rawUrl);}catch{return null;}
  if(!marketKey(brand,article)||!competitor||competitor.length<2||
    !Number.isFinite(price)||price<=0||price>10000000||
    city.toLowerCase()!=="рязань"||
    url.protocol!=="https:"||!url.hostname||url.username||url.password||
    rawUrl.length>1500||input?.owner_confirmed!==true)return null;
  return {brand,article,brand_key:marketKey(brand,article).split("|")[0],
    article_key:marketKey(brand,article).split("|")[1],
    competitor,competitor_price:Math.round(price*100)/100,
    city:"Рязань",source_url:url.toString()};
}
function validSettings(input) {
  if(!input||typeof input!=="object"||typeof input.enabled!=="boolean")return null;
  const discount=Number(input.discount_percent);
  const minimum=Number(input.min_profit_rub);
  if(!Number.isFinite(discount)||discount<0||discount>30||
     !Number.isFinite(minimum)||minimum<0||minimum>50000)return null;
  return {enabled:input.enabled,discount_percent:Math.round(discount*10)/10,
    min_profit_rub:Math.round(minimum*100)/100};
}
function marketSuggestedPrice(procurement, competitorPrice, settings) {
  const cost=Number(procurement),market=Number(competitorPrice);
  const config=validSettings(settings);
  if(!config||!Number.isFinite(cost)||cost<0||!Number.isFinite(market)||market<=0)
    return {eligible:false,reason:"invalid_data",price:null};
  // Round DOWN: never accidentally display a price above the promised
  // market discount. All monetary arithmetic is performed in kopecks.
  const marketKop=Math.round(market*100);
  const costKop=Math.round(cost*100);
  const discountedKop=Math.floor(marketKop*(100-config.discount_percent)/100);
  const saleKop=Math.floor(discountedKop/1000)*1000; // ten roubles
  const floorKop=costKop+Math.round(config.min_profit_rub*100);
  if(saleKop<floorKop) return {eligible:false,reason:"below_profit_floor",price:null};
  return {eligible:true,reason:"market_price",price:saleKop/100,
    gross_profit:(saleKop-costKop)/100};
}
function pickCustomerPrice(procurement, basePrice, competitorPrice, settings) {
  if(settings?.enabled!==true || competitorPrice==null)return basePrice;
  const result=marketSuggestedPrice(procurement,competitorPrice,settings);
  return result.eligible?result.price:basePrice;
}
module.exports={marketKey,validReference,validSettings,marketSuggestedPrice,pickCustomerPrice};
