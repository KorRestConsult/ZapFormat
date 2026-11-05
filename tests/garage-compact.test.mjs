import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../premium.css",import.meta.url),"utf8");
const render=app.slice(app.indexOf("function renderGarageApp(){"),app.indexOf("async function saveGarageVin(){"));
const card=app.slice(app.indexOf("function renderGarageVehicleCard("),app.indexOf("function renderGarageMaintenance(){"));

test("garage retains editable vehicle list and one VIN selection CTA",()=>{
 assert.match(render,/garageVehicles\.length\?garageVehicles/);
 assert.match(render,/vehicles\.map\(\(car,index\)=>renderGarageVehicleCard\(car,index\)\)/);
 assert.match(render,/data-garage-add-vehicle/);
 assert.match(card,/data-garage-vin-search=/);
 assert.equal((card.match(/data-garage-vin-search=/g)||[]).length,1);
 assert.match(card,/data-garage-photo=/);
 assert.match(card,/data-garage-edit-car=/);
});
test("generic placeholder is an original line-art icon, not stock BMW photo",()=>{
 assert.match(app,/function garageVehiclePlaceholderSvg\(\)/);
 assert.match(app,/class="zf-garage-outline"/);
 assert.match(card,/zf-garage-photo-placeholder/);
 assert.doesNotMatch(card,/vehicleArtworkHtml\(v,false\)/);
 assert.doesNotMatch(card,/vehicleIllustrationHtml\(v,false\)/);
 assert.match(css,/#account-garage \.zf-garage-outline-fill/);
 assert.match(css,/#account-garage \.zf-garage-light/);
});
test("small mobile garage is two-column and uses compact headings and controls",()=>{
 assert.match(css,/GARAGE COMPACT V2/);
 assert.match(css,/grid-template-columns:116px minmax\(0,1fr\)!important/);
 assert.match(css,/#account-garage \.garage-owner-head h2\{font-size:23px!important\}/);
 assert.match(css,/#account-garage \.zf-garage-photo-control\{/);
 assert.match(css,/min-height:42px!important/);
 assert.match(css,/overscroll-behavior-y:contain/);
 assert.match(css,/pointer-events:auto!important/);
});
