import {writeFile,readFile} from 'node:fs/promises';
import {gatherCandidates,verifyCandidates} from './core.mjs';
import {requestLLM} from './provider.mjs';
const fixtures=JSON.parse(await readFile(new URL('./eval-cases.json',import.meta.url),'utf8'));
const outputs=[];
for(const c of fixtures){
  const findings=await gatherCandidates({files:[c.file],context:c.description,ask:requestLLM});
  const verified=await verifyCandidates({candidates:findings,files:[c.file],context:c.description,ask:requestLLM});
  outputs.push({id:c.id,expected:c.expected,actual:verified.length?verified[0].severity:'clean',findings:verified});
}
const passed=outputs.filter(x=>x.actual===x.expected).length;
const summary={passed,total:outputs.length,score:passed/outputs.length,outputs,date:new Date().toISOString()};
await writeFile('code-review-eval.json',JSON.stringify(summary,null,2));
console.log(`Review eval: ${passed}/${outputs.length}, score=${summary.score.toFixed(2)}`);
if(passed<outputs.length)process.exitCode=1;
