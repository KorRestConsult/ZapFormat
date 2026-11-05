import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../premium.css",import.meta.url),"utf8");
const card=app.slice(app.indexOf("function renderGarageVehicleCard("),app.indexOf("function renderGarageMaintenance(){"));

test("private customer photos replace stock model photos inside garage only",()=>{
 assert.match(card,/garagePhotoCache\.get\(String\(v\.id\)\)/);
 assert.match(card,/zf-garage-photo-placeholder/);
 assert.doesNotMatch(card,/vehicleArtworkHtml\(v,false\)/);
 assert.match(card,/data-garage-photo=/);
 assert.match(css,/zf-garage-photo-frame/);
 assert.match(css,/pointer-events:auto!important/);
 assert.match(card,/Добавьте фото/);
});
test("uploads strip metadata by redrawing JPEG and use authenticated garage API",()=>{
 assert.match(app,/async function compressGaragePhoto\(file\)/);
 assert.match(app,/context\.drawImage\(image,/);
 assert.match(app,/canvas\.toBlob\(resolve,"image\/jpeg",quality\)/);
 assert.match(app,/method:"PUT",body:JSON\.stringify\(\{image_base64:result\.base64\}\)/);
 assert.match(app,/headers:authToken\?\{"Authorization":"Bearer "\+authToken\}:\{\}/);
});
test("photo or car editing does not modify VIN lookup or purchasing",()=>{
 assert.match(app,/data-garage-edit-car/);
 assert.match(app,/function openGarageVehicleEditor\(mode="edit",vehicleId=null\)/);
 assert.match(app,/data-vehicle-id=/);
 assert.match(app,/data-garage-vin-search/);
 assert.match(app,/prefillGarageSearch\(car\.vin\)/);
 assert.match(css,/CUSTOM GARAGE PHOTO/);
});
