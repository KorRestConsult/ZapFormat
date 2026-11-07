import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";

const appPath=process.env.ZF_APP || resolve(dirname(fileURLToPath(import.meta.url)),"../app.js");
const source=readFileSync(appPath,"utf8");
const start=source.indexOf("let vinManualState=null;");
const end=source.indexOf("\nfunction renderVinDecodeResult(",start);
assert.ok(start>=0 && end>start,"Manual FAPI controller exists");

function setup(manufacturerId=171,modelId=0){
  const vin="AAAAAAAAAAAAAAAAA";
  const list={innerHTML:""};
  const filter={value:"",addEventListener(){}};
  const hint={textContent:""};
  const root={hidden:true,innerHTML:"",querySelector(sel){
    return sel==="#vinManualChoices"?list:sel==="#vinManualFilter"?filter:sel==="#vinManualCount"?hint:null;
  }};
  const panel={hidden:true,scrollIntoView(){}};
  const form={hidden:true};
  const leadPart={value:"",focus(){}};
  const leadVin={value:""};
  const leadComment={value:""};
  const leadName={value:""};
  const leadPhone={value:""};
  const elements={
    vinManualCatalog:root,manualLead:panel,manualLeadForm:form,
    manualLeadPart:leadPart,manualLeadVin:leadVin,manualLeadComment:leadComment,
    manualLeadName:leadName,manualLeadPhone:leadPhone
  };
  const calls=[];
  const sandbox={
    vinCatalogState:{vin,decoded:{dt_manufacturer_id:manufacturerId,dt_model_id:modelId,model_name:modelId?"Tiguan L":"",model_year:2022,manufacturer:"Volkswagen (SAIC)"}},
    sessionUser:{name:"Тест",surname:"Клиент",phone:"+70000000000"},
    document:{getElementById:id=>elements[id]||null},
    escapeHtml:v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),
    apiRequest:async(path)=>{
      calls.push(path);
      if(path.startsWith("/api/catalog/vin-manual/manufacturers"))return {manufacturers:[{id:171,name:"VOLKSWAGEN"}]};
      if(path.startsWith("/api/catalog/vin-manual/models"))return {models:[{id:551,name:"TIGUAN L",year_from:2022,year_to:null}]};
      if(path.startsWith("/api/catalog/vin-manual/modifications"))return {modifications:[{id:8001,name:"1.4 TSI",engine_code:"DJS",engine_type:"Бензиновый двигатель",capacity:"1.4 l",power_kw:110,year_from:2018,year_to:null}]};
      if(path.startsWith("/api/catalog/vin-manual/tree"))return {ok:true,fitment_verified:false,nodes:[{id:1,parent_id:0,name:"Двигатель"}]};
      throw new Error("Unexpected API route");
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start,end),sandbox);
  return {sandbox,root,list,filter,calls,panel,form,leadVin,leadComment,leadName,leadPhone};
}

test("VIN with manufacturer ID uses current FAPI catalog rather than paying for another VIN lookup",async()=>{
  const t=setup(171);
  await vm.runInContext("openVinManualCatalog()",t.sandbox);
  assert.equal(t.calls.length,1);
  assert.equal(t.calls[0],"/api/catalog/vin-manual/models?mfi=171");
  assert.equal(t.root.hidden,false);
  assert.match(t.list.innerHTML,/TIGUAN L/);
  assert.match(t.root.innerHTML,/не подтверждение применимости/);
});

test("Model/modification choice remains unverified and only fills manual lead",async()=>{
  const t=setup();
  await vm.runInContext("openVinManualCatalog()",t.sandbox);
  await vm.runInContext('loadVinManualModifications(551,"TIGUAN L")',t.sandbox);
  assert.equal(t.calls[1],"/api/catalog/vin-manual/modifications?mi=551");
  assert.match(t.list.innerHTML,/DJS/);
  vm.runInContext('selectVinManualModification({id:8001,name:"1.4 TSI"})',t.sandbox);
  assert.match(t.root.innerHTML,/Совместимость с VIN пока не подтверждена/);
  assert.match(t.root.innerHTML,/data-vin-manual-request/);
  vm.runInContext("prepareVinManualLead()",t.sandbox);
  assert.equal(t.leadVin.value,"AAAAAAAAAAAAAAAAA");
  assert.equal(t.panel.hidden,false);
  assert.equal(t.form.hidden,false);
  assert.match(t.leadComment.value,/не подтверждено/);
  assert.equal(t.leadPhone.value,"+70000000000");
  assert.doesNotMatch(t.root.innerHTML,/data-verified-article|data-cart-action/);
});

test("Missing manufacturer ID offers manual list rather than guessing a vehicle",async()=>{
  const t=setup(0);
  await vm.runInContext("openVinManualCatalog()",t.sandbox);
  assert.equal(t.calls[0],"/api/catalog/vin-manual/manufacturers");
  assert.match(t.list.innerHTML,/VOLKSWAGEN/);
});

test("Known FAPI model skips redundant model selection and shows readable engines",async()=>{
  const t=setup(3035,37588);
  await vm.runInContext("openVinManualCatalog()",t.sandbox);
  assert.equal(t.calls.length,1);
  assert.equal(t.calls[0],"/api/catalog/vin-manual/modifications?mi=37588");
  assert.match(t.root.innerHTML,/Выберите двигатель и версию Tiguan L/);
  assert.match(t.list.innerHTML,/Бензин/);
  assert.match(t.list.innerHTML,/1,4 л/);
  assert.match(t.list.innerHTML,/150 л.с./);
  assert.match(t.list.innerHTML,/Код двигателя: DJS/);
  assert.match(t.root.innerHTML,/data-vin-manual-help/);
  assert.doesNotMatch(t.list.innerHTML,/Совместимость подтверждена/);
});

test("Unknown engine opens real manual lead with VIN, no guess or external send",async()=>{
  const t=setup(3035,37588);
  await vm.runInContext("openVinManualCatalog()",t.sandbox);
  vm.runInContext("prepareVinManualLead(true)",t.sandbox);
  assert.equal(t.panel.hidden,false);
  assert.equal(t.form.hidden,false);
  assert.equal(t.leadVin.value,"AAAAAAAAAAAAAAAAA");
  assert.match(t.leadComment.value,/Не знаю двигатель и модификацию/);
  assert.match(t.leadComment.value,/Tiguan L/);
  assert.ok(t.calls.every(x=>x.startsWith("/api/catalog/vin-manual/")));
});

test("Signed-in customer can browse self-selected modification without VIN fitment approval",async()=>{
  const t=setup(3035,37588);
  let rendered=null;
  t.sandbox.renderVinCatalogBrowser=data=>{rendered=data;};
  await vm.runInContext("openVinManualCatalog()",t.sandbox);
  vm.runInContext('selectVinManualModification({id:8001,name:"1.4 TSI"})',t.sandbox);
  assert.match(t.root.innerHTML,/data-vin-manual-browse/);
  await vm.runInContext("openVinManualTree()",t.sandbox);
  assert.equal(t.calls[1],"/api/catalog/vin-manual/tree?mi=8001");
  assert.equal(rendered?.manual_selection,true);
  assert.equal(rendered?.modification?.id,8001);
  assert.equal(rendered?.nodes?.[0]?.name,"Двигатель");
});

test("Model ID is sufficient to open modification list even without manufacturer ID",async()=>{
  const t=setup(0,37588);
  await vm.runInContext("openVinManualCatalog()",t.sandbox);
  assert.equal(t.calls[0],"/api/catalog/vin-manual/modifications?mi=37588");
});

test("Manually selected catalog article requires human fitment check, not direct pricing",()=>{
  assert.match(source,/state\.manualSelection\?"vin-manual-article":"verified-article"/);
  assert.match(source,/state\.manualSelection\?"Проверить совместимость":"Цены и аналоги"/);
  assert.match(source,/const manualArticle=e\.target\.closest\("\[data-vin-manual-article\]"\)/);
});
