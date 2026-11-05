import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync,statSync} from "node:fs";
import {resolve} from "node:path";
const root=resolve(import.meta.dirname,"..");
const read=name=>readFileSync(resolve(root,name),"utf8");
const app=read("app.js"),html=read("index.html"),css=read("premium.css");
test("premium style is loaded after base stylesheet",()=>{
 assert.ok(html.indexOf('href="./premium.css')>html.indexOf('href="./styles.css'));
 assert.match(css,/\.mobile-nav button\.active/);
 assert.match(css,/#view-auth :is\(input,textarea,select\)\{font-size:16px!important\}/);
 assert.match(css,/#account-garage \.garage-car-hero/);
 assert.match(css,/#view-search\.vin-catalog-mode \.vin-category-card/);
});
test("BMW picture is model-specific; other cars keep body-specific vectors",()=>{
 const start=app.indexOf("function vehicleArtworkHtml(");
 const end=app.indexOf("function vinCatalogHeroHtml()",start);
 assert.ok(start>=0&&end>start);
 const choose=new Function("vehicleIllustrationHtml",app.slice(start,end)+"; return vehicleArtworkHtml;")(()=>"GENERIC-SVG");
 assert.match(choose({brand:"BMW",model:"X3 (F25)"}),/bmw-x3-f25\.jpg/);
 assert.equal(choose({brand:"BMW",model:"530d"}),"GENERIC-SVG");
 assert.equal(choose({brand:"Audi",model:"Q5"}),"GENERIC-SVG");
 assert.equal(choose({brand:"Toyota",model:"RAV4"}),"GENERIC-SVG");
 const path=resolve(root,"assets/bmw-x3-f25.jpg");
 assert.ok(existsSync(path));
 assert.ok(statSync(path).size>20000);
 assert.match(read("ASSET_LICENSES.md"),/CC BY-SA 4\.0/);
});
test("missing VIN catalogue node has a real fallback rather than a dead control",()=>{
 assert.match(app,/data-vin-fallback/);
 assert.match(app,/section\.hidden=false;/);
 assert.match(app,/form\.hidden=false;/);
 assert.match(app,/vin\.value=vinCatalogState\.vin/);
 assert.match(app,/if\(vinCatalogNode\(id\)\)renderVinCatalogBrowser\(null,id\)/);
});
test("normal account state and order code are preserved",()=>{
 assert.match(app,/const AUTH_TOKEN_KEY="zapformat-access-token"/);
 assert.match(app,/function saveAuthToken\(token\)/);
 assert.match(app,/renderCartPage\(\)/);
 assert.match(html,/id="account-orders"/);
 assert.match(html,/id="garageApp"/);
});

test("mobile password toggle remains vertically centered despite button transform reset",()=>{
 assert.match(css,/#view-auth \.auth-password-toggle\{[^}]*transform:translateY\(-50%\)!important/);
});
