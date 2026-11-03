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
test('custom storefronts keep the existing live API until new API SSL is ready',()=>{
  for(const host of ['zapformat.ru','www.zapformat.ru','korrestconsult.github.io']){
    assert.equal(apiFor(host),'https://api.168.113.211.246.sslip.io',host);
  }
});
test('backend CORS accepts exact new domain origins without breaking the old',()=>{
  assert.match(server,/https:\/\/zapformat\.ru/);
  assert.match(server,/https:\/\/www\.zapformat\.ru/);
  assert.match(server,/https:\/\/admin\.zapformat\.ru/);
  assert.match(server,/FRONTEND_ORIGINS\.includes\(origin\)/);
});
test('old GitHub Pages links still work until DNS and certificates are live',()=>{
  const html=readFileSync('index.html','utf8');
  assert.match(html,/config\.js\?v=20261103-domain-prep1/);
  assert.equal(apiFor('korrestconsult.github.io'),'https://api.168.113.211.246.sslip.io');
});
