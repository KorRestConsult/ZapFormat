import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../premium.css",import.meta.url),"utf8");
const home=html.slice(html.indexOf('id="view-home"'),html.indexOf('id="view-search"'));
test("VIN-first search without decorative chips",()=>{
 assert.match(home,/Найдём вашу запчасть/);
 assert.match(home,/placeholder="VIN, артикул или название"/);
 assert.match(home,/id="searchForm"/);
 assert.match(home,/id="searchInput"/);
 assert.match(home,/Найти запчасти/);
 assert.doesNotMatch(home,/class="search-modes"/);
});
test("delivery is one short statement, no long guide",()=>{
 assert.match(home,/Доставка по Рязани · по согласованному времени/);
 assert.match(home,/class="search-delivery-inline"/);
 assert.doesNotMatch(home,/class="search-journey"/);
 assert.doesNotMatch(home,/Как это работает/);
});
test("VIN-first placeholder survives vehicle context",()=>{
 assert.equal((js.match(/searchInput\.placeholder="VIN, артикул или название"/g)||[]).length,2);
 assert.match(css,/#view-home #searchInput\{min-height:88px!important\}/);
});
