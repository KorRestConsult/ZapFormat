"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  keyFor, parseMarketPage, retailFromMarket, validPart, sourceUrl
} = require("../src/competitor-monitor");

function offer(price,days,quantity=2,rating=null){
  return { displayPrice:{value:price}, delivery:{value:days}, quantity, ...(rating==null?{}:{rating}) };
}
function documentFor(originals,analogs=[]){
  return '<html><script type="application/json">'+JSON.stringify({
    props:{initialProps:{},initialState:JSON.stringify({details:{originals,analogs}})}
  })+'</script></html>';
}
test("same-article comparison separates low-rating offer from reliable retail reference",()=>{
  const page=documentFor([
    {make:"BMW",detailNum:"11428507683",offers:[
      offer(1659,71,241),offer(2354,8,2,4.7),offer(813,11,500,1.0)
    ]}
  ],[
    {make:"Bosch",detailNum:"F026407123",offers:[offer(800,10,3,4.4)]}
  ]);
  const data=parseMarketPage(page,"BMW","11428507683");
  assert.equal(data.status,"ok");
  const original=data.quotes["BMW|11428507683"];
  assert.equal(original.price,813);
  assert.equal(original.reliable.price,2354);
  assert.equal(original.reliable.days,8);
  assert.equal(data.quotes["BOSCH|F026407123"].reliable.price,800);
  assert.equal(retailFromMarket(702,1184.98,original,true,150),2110);
  assert.equal(retailFromMarket(702,1184.98,original,false,150),1184.98);
});
test("brand and article are checked together, never infer analog or authenticity",()=>{
  const page=documentFor([{make:"Wayteko",detailNum:"11428507683",offers:[offer(75,8)]}]);
  assert.throws(()=>parseMarketPage(page,"BMW","11428507683"),/mismatch/);
  assert.equal(keyFor("MANN-FILTER","HU 6004 x"),keyFor("Mann","HU6004X"));
});
test("below-profit price, unrated source and invalid cost cannot override checkout price",()=>{
  assert.equal(retailFromMarket(1000,1200,{reliable:{price:1000}},true,150),1200);
  assert.equal(retailFromMarket(702,1184.98,{price:813,reliable:null},true,150),1184.98);
  assert.equal(retailFromMarket(-1,1184.98,{reliable:{price:2354}},true,150),1184.98);
  assert.equal(validPart("BMW"),true);
  assert.equal(validPart("https://bad.example"),false);
  assert.match(sourceUrl("BMW","11428507683"),/40119$/);
});
