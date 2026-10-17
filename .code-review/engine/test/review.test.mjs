import {test} from 'node:test';
import assert from 'node:assert/strict';
import {risk,patchLines,validateFinding,gatherCandidates,verifyCandidates,summarize} from '../core.mjs';
test('risk is based on changed sensitive paths',()=>{
 assert.equal(risk(['docs/README.md']),'LOW');assert.equal(risk(['app.js']),'MEDIUM');assert.equal(risk(['backend/src/partgrade.js']),'HIGH');assert.equal(risk(['.github/workflows/deploy.yml']),'HIGH');
});
test('patch changes are correctly numbered',()=>{
 const p='@@ -8,3 +8,4 @@\n keep\n-old\n+new\n next\n+added';assert.deepEqual([...patchLines(p)],[9,11]);
});
test('reject fabricated and unchanged line references',()=>{
 const byPath=new Map([['src/a.js',{filename:'src/a.js',patch:'@@ -1,1 +1,1 @@\n-old\n+new'}]]);
 const f={file:'src/a.js',line:1,severity:'P1',impact:'Crash',evidence:'new',fix:'guard'};
 assert.ok(validateFinding(f,byPath));assert.equal(validateFinding({...f,line:10},byPath),null);assert.equal(validateFinding({...f,file:'x.js'},byPath),null);
});
test('multi-pass review requires verifier quorum and blocks',async()=>{
 const files=[{filename:'src/a.js',patch:'@@ -1 +1 @@\n-old\n+new',context:'new'}];
 const f={file:'src/a.js',line:1,severity:'P1',category:'logic',impact:'Crash on null',evidence:'new may be null',fix:'add guard'};
 const candidates=await gatherCandidates({files,context:'',ask:async()=>JSON.stringify({findings:[f]})});
 assert.ok(candidates.length>=1);
 const verified=await verifyCandidates({candidates,files,context:'',ask:async()=>JSON.stringify({confirmed:true,reason:'reproduced'})});
 assert.equal(verified[0].confirmedVotes,3);assert.equal(summarize(verified,'HIGH','abc').blocking,true);
});
test('one verifier vote is not enough',async()=>{
 const f={file:'a',line:1,severity:'P1',impact:'Crash',evidence:'x',fix:'y'};
 let i=0;const verified=await verifyCandidates({candidates:[f],files:[{filename:'a',patch:'@@ -1 +1 @@\n-old\n+new'}],context:'',ask:async()=>JSON.stringify({confirmed:++i===1})});
 assert.equal(verified.length,0);
});

import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
test('rerun does not silently mark failed code review successful',()=>{
 const text=readFileSync(new URL('../run.mjs',import.meta.url),'utf8');
 assert.ok(!text.includes("already reviewed, avoiding duplicate AI cost"));
 assert.ok(text.includes('do not convert a failed review to success'));
});
test('review uses protected runtime code, not untrusted PR checkout',()=>{
 const p=new URL('../../../.github/workflows/code-review-ai.yml',import.meta.url);\n const text=readFileSync(p,'utf8');
 assert.ok(text.includes('refs/heads/code-review-runtime'));
});
