import {readFile,writeFile} from 'node:fs/promises';
import {gatherCandidates,verifyCandidates,risk,summarize} from './core.mjs';
import {requestLLM} from './provider.mjs';
import {apiClient,changedFiles,fileContext,postSummary,postInlineFindings} from './github.mjs';
const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
const pr=event.pull_request;
if(!pr)throw new Error('This command requires a PR event');
const repo=process.env.GITHUB_REPOSITORY; const number=pr.number; const sha=pr.head.sha;
if(pr.head.repo.full_name!==repo){console.error('Untrusted fork: AI unavailable, manual review required');process.exit(1);}
const api=apiClient();
const files=await changedFiles(api,repo,number);
if(!files.length){console.log('No changed source lines to review');process.exit(0);}
for(const f of files.filter(f=>f.patch))f.context=await fileContext(api,repo,sha,f);
const ctx=[];
for(const name of ['README.md','CLAUDE.md','REVIEW.md']){try{
 const res=await api(`/repos/${repo}/contents/${name}?ref=${pr.base.sha}`);
 if(res.encoding==='base64')ctx.push(`${name}: ${Buffer.from(res.content,'base64').toString('utf8').slice(0,12000)}`);
}catch{}}
const context=ctx.join('\n').slice(0,25000);
const candidates=await gatherCandidates({files:files.filter(f=>f.patch),context,ask:requestLLM});
const confirmed=await verifyCandidates({candidates,files:files.filter(f=>f.patch),context,ask:requestLLM});
const result=summarize(confirmed,risk(files),sha);
const report=['### AI Code Review',`Commit: \`${sha}\`; risk: **${result.risk}**; confirmed: **${result.total}**`,...confirmed.map(f=>`- **${f.severity}** \`${f.file}:${f.line}\`: ${f.impact}\n  - Evidence: ${f.evidence}\n  - Fix: ${f.fix}\n  - Verified: ${f.confirmedVotes}/3`),'\nAI findings are suggestions, not human approvals. Test and security checks remain mandatory.'].join('\n');
await writeFile('code-review-result.json',JSON.stringify(result,null,2));
await postInlineFindings(api,repo,number,sha,confirmed);
await postSummary(api,repo,number,sha,report);
console.log(report);
if(result.blocking)process.exitCode=1;
