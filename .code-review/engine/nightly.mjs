import {readFile,writeFile} from 'node:fs/promises';
import {gatherCandidates,verifyCandidates,summarize} from './core.mjs';
import {requestLLM} from './provider.mjs';
const paths=['backend/src/server.js','backend/src/partgrade.js','backend/src/pricing.js','backend/src/secret-bootstrap.js'];
const files=[];
for(const p of paths){let data;try{data=await readFile(p,'utf8');}catch{continue;}
 const lines=data.split('\n');for(let start=0;start<lines.length;start+=120){const s=lines.slice(start,start+120); const patch=`@@ -0,0 +${start+1},${s.length} @@\n`+s.map(x=>'+'+x).join('\n'); files.push({filename:p,patch,context:s.join('\n')});}
}
if(!files.length)throw new Error('No source files found for nightly review');
const results=[];
for(const file of files.slice(0,6)){
 const candidates=await gatherCandidates({files:[file],context:'NIGHTLY: existing code, report only confirmed real reachable severe P0/P1 defects, not style. Treat as PRE-EXISTING.',ask:requestLLM,roles:[['nightly-security','Find exploitable flaws'],['nightly-reliability','Find deterministic operational failures']]});
 results.push(...await verifyCandidates({candidates,files:[file],context:'Existing code nightly review',ask:requestLLM}));
}
const r=summarize(results,'HIGH',process.env.GITHUB_SHA||'unknown');
await writeFile('code-review-nightly.json',JSON.stringify({...r,kind:'pre-existing'},null,2));
console.log(`Nightly: ${r.total} confirmed findings. Source chunks reviewed: ${Math.min(files.length,6)}/${files.length}`);
if(results.some(f=>['P0','P1'].includes(f.severity)))process.exitCode=1;
