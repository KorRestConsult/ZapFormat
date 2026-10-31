import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
const file=readFileSync(resolve('app.js'),'utf8');
const extract=name=>{
  const i=file.indexOf('function '+name+'(');
  assert.ok(i>=0,'missing '+name);
  const j=file.indexOf('\n}',i);
  assert.ok(j>i,'missing closing '+name);
  return file.slice(i,j+2);
};
const ctx=vm.createContext({});
vm.runInContext(['looksLikeArticle','normalizeVin','looksLikeVin','extractArticleCandidate'].map(extract).join('\n'),ctx);
const parse=q=>vm.runInContext('extractArticleCandidate('+JSON.stringify(q)+')',ctx);
test('single Russian part names are not mistaken for supplier articles',()=>{
  for(const q of ['Шаровые','Шаровая','Амортизатор','Фильтр','Ступица']){
    assert.equal(parse(q),null,q);
  }
});
test('real part articles still search by manufacturer',()=>{
  assert.equal(parse('0986AF1111'),'0986AF1111');
  assert.equal(parse('123456'),'123456');
  assert.equal(parse('А123'), 'А123');
});
test('VIN is recognized separately and not sent as article',()=>{
  assert.equal(parse('LSVYL60TXN2171564'),null);
  assert.match(file,/api\/catalog\/vin-browser\?vin/);
  assert.match(file,/timeoutMs:32000/);
});
