import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../premium.css",import.meta.url),"utf8");

test("home search leads with VIN and has one working search form",()=>{
  const home=html.slice(html.indexOf("view-home"),html.indexOf("view-search"));
  assert.match(home,/Найдём вашу запчасть/);
  assert.match(home,/<strong>VIN<\/strong>/);
  assert.match(home,/Артикул<\/span>/);
  assert.match(home,/Название<\/span>/);
  assert.match(home,/placeholder="VIN, артикул или название"/);
  assert.match(home,/id="searchForm"/);
  assert.match(home,/id="searchInput"/);
  assert.match(home,/Найти запчасти/);
  assert.doesNotMatch(home,/Что ищем\?/);
  assert.doesNotMatch(home,/Введите артикул или название детали\./);
});
test("ordering journey promises confirmation, arranged delivery and cash only",()=>{
  const home=html.slice(html.indexOf("view-home"),html.indexOf("view-search"));
  assert.match(home,/Укажите VIN или деталь/);
  assert.match(home,/Уточним цену и срок/);
  assert.match(home,/Доставим по адресу/);
  assert.match(home,/По Рязани · время согласуем · оплата наличными при получении/);
});
test("vehicle selection cannot replace VIN-first input with a long vehicle label",()=>{
  assert.equal((js.match(/searchInput\.placeholder="VIN, артикул или название"/g)||[]).length,2);
  assert.match(css,/#view-home #searchInput\{min-height:88px!important\}/);
});
