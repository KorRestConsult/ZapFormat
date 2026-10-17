import {readFile} from 'node:fs/promises';
import {apiClient,changedFiles} from './github.mjs';
import {risk} from './core.mjs';
const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
const pr=event.pull_request;if(!pr)throw Error('PR event required');
const repo=process.env.GITHUB_REPOSITORY,api=apiClient();
const files=await changedFiles(api,repo,pr.number);
const level=risk(files);const threshold={LOW:0,MEDIUM:1,HIGH:2}[level];
const reviews=await api(`/repos/${repo}/pulls/${pr.number}/reviews?per_page=100`);
const approvals=new Set(reviews.filter(r=>r.state==='APPROVED'&&r.commit_id===pr.head.sha&&r.user?.type!=='Bot').map(r=>r.user.login));
// A documented owner acknowledgement is counted as one sign-off, only when posted after the current commit.
const owner=repo.split('/')[0];
const comments=await api(`/repos/${repo}/issues/${pr.number}/comments?per_page=100`);
for(const c of comments){if(c.user?.login===owner&&c.user?.type!=='Bot'&&String(c.body).trim()===`/approve-risk ${pr.head.sha}`) approvals.add(owner);}
console.log(`Tier=${level}; required humans=${threshold}; distinct commit-bound approvals=${approvals.size}`);
if(approvals.size<threshold)throw new Error(`Insufficient human approvals for ${level}; approvals must match ${pr.head.sha}`);
