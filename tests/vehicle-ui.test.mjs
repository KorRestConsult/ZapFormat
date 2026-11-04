import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const extract=name=>{
  const start=app.indexOf('function '+name+'(');
  assert.ok(start>=0,'Missing '+name);
  const end=app.indexOf('\n}',start);
  assert.ok(end>start,'Missing end of '+name);
  return app.slice(start,end+2);
};
const ctx=vm.createContext({});
vm.runInContext(extract('vehicleBodyStyle')+'\n'+extract('vehicleIllustrationHtml'),ctx);
const kind=v=>vm.runInContext('vehicleBodyStyle('+JSON.stringify(v)+')',ctx);
const illustration=v=>vm.runInContext('vehicleIllustrationHtml('+JSON.stringify(v)+',true)',ctx);
test('vehicle illustration follows car body/model, not a universal BMW X3',()=>{
  assert.equal(kind({brand:'BMW',model:'X3 (F25)'}),'suv');
  assert.equal(kind({brand:'Toyota',model:'Camry',body_type:'Sedan'}),'sedan');
  assert.equal(kind({brand:'Ford',model:'Transit',body_type:'Van'}),'van');
  assert.equal(kind({brand:'Volkswagen',model:'Golf'}),'hatch');
  assert.match(illustration({model:'Toyota Camry'}),/zf-body-sedan/);
  assert.match(illustration({model:'BMW X3'}),/zf-body-suv/);
});
test('VIN root and leaf have actual delegated click handling',()=>{
  assert.match(app,/const nodeButton=e.target.closest\("\[data-vin-node\]"\)/);
  assert.match(app,/if\(vinCatalogNode\(id\)\)renderVinCatalogBrowser\(null,id\)/);
  assert.match(app,/if\(e.target.closest\("\[data-vin-catalog-back\]"\)\)/);
});
