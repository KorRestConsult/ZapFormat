import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const config=readFileSync('config.js','utf8');
const server=readFileSync('backend/src/server.js','utf8');

function apiFor(hostname) {
  const context={window:{},location:{hostname,origin:'https://'+hostname}};
  vm.runInNewContext(config,context);
  return context.window.ZAPFORMAT_CONFIG.apiBase;
}
test('custom storefronts use verified production API over HTTPS',()=>{
  for(const host of ['zapformat.ru','www.zapformat.ru','korrestconsult.github.io']){
    assert.equal(apiFor(host),'https://api.zapformat.ru',host);
  }
});
test('backend CORS accepts exact new domain origins without breaking the old',()=>{
  assert.match(server,/https:\/\/zapformat\.ru/);
  assert.match(server,/https:\/\/www\.zapformat\.ru/);
  assert.match(server,/https:\/\/admin\.zapformat\.ru/);
  assert.match(server,/FRONTEND_ORIGINS\.includes\(origin\)/);
});
test('legacy GitHub Pages URLs and canonical domain share the same trusted API',()=>{
  const html=readFileSync('index.html','utf8');
  assert.match(html,/config\.js\?v=20261103-domain-live1/);
  assert.equal(apiFor('korrestconsult.github.io'),'https://api.zapformat.ru');
});

test('owner panel on dedicated hostname uses the verified API',()=>{
  const source=readFileSync('admin/admin.js','utf8');
  const html=readFileSync('admin/index.html','utf8');
  assert.match(source,/const API = "https:\/\/api\.zapformat\.ru"/);
  assert.match(html,/admin\.js\?v=\d{8}-/);
});
test('local development retains its current origin',()=>{
  assert.equal(apiFor('localhost'),'https://localhost');
});
