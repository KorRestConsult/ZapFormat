import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../premium.css",import.meta.url),"utf8");
const render=app.slice(app.indexOf("function renderGarageApp(){"),app.indexOf("async function saveGarageVin(){"));
const card=app.slice(app.indexOf("function renderGarageVehicleCard("),app.indexOf("function renderGarageMaintenance(){"));
test("customer garage shows a real list of all account vehicles",()=>{
 assert.match(render,/garageVehicles\.length\?garageVehicles/);
 assert.match(render,/garage-vehicle-list/);
 assert.match(render,/vehicles\.map\(\(car,index\)=>renderGarageVehicleCard\(car,index\)\)/);
 assert.match(render,/data-garage-add-vehicle/);
});
test("garage has one VIN action per car, no service dashboard, tabs or edit buttons",()=>{
 assert.equal((card.match(/data-garage-vin-search=/g)||[]).length,1);
 assert.match(card,/data-garage-photo=/);
 assert.match(card,/data-garage-edit-car=/);
 assert.match(card,/data-garage-vin-search/);
 assert.match(card,/Подобрать по VIN/);
 for(const s of ["garage-tabs","garage-owner-side","garage-mileage-card","data-garage-edit-vehicle","Последние работы","Состояние","Замеры","История"])assert.ok(!render.includes(s),s);
});
test("VIN action routes correctly and asks to add VIN when missing",()=>{
 assert.match(app,/const garageVinSearch=e\.target\.closest\("\[data-garage-vin-search\]"\)/);
 assert.match(app,/if\(!looksLikeVin\(car\.vin\|\|""\)\)/);
 assert.match(app,/openGarageVehicleEditor\("edit"\)/);
 assert.match(app,/prefillGarageSearch\(car\.vin\)/);
 assert.match(css,/zf-garage-vehicle-list/);
});
