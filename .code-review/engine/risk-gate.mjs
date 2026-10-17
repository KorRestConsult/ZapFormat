import {readFile} from 'node:fs/promises';
import {apiClient,changedFiles} from './github.mjs';
import {risk} from './core.mjs';
const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
const pr=event.pull_request;if(!pr)throw Error('PR event required');
const repo=process.env.GITHUB_REPOSITORY,api=apiClient();
const files=await changedFiles(api,repo,pr.number);
const level=risk(files);const threshold={LOW:0,MEDIUM:0,HIGH:1}[level];
const reviews=await api(`/repos/${repo}/pulls/${pr.number}/reviews?per_page=100`);
const approvals=new Set(reviews.filter(r=>r.state==='APPROVED'&&r.commit_id===pr.head.sha&&r.user?.type!=='Bot').map(r=>r.user.login));
// The high-risk gate requires one deliberate human owner sign-off tied to the exact head SHA.
// The account owner cannot approve their own GitHub PR, so an owner GitHub comment is supported.
const owner=repo.split('/')[0];
const commit=await api(`/repos/${repo}/commits/${pr.head.sha}`);
const committed=Date.parse(commit.commit?.committer?.date || commit.commit?.author?.date || '');
const comments=await api(`/repos/${repo}/issues/${pr.number}/comments?per_page=100`);
for(const c of comments){if(c.user?.login===owner&&c.user?.type!=='Bot'&&String(c.body).trim()===`/approve-risk ${pr.head.sha}` && Date.parse(c.created_at)>=committed && !Number.isNaN(committed)) approvals.add(owner);}
console.log(`Tier=${level}; required humans=${threshold}; distinct commit-bound approvals=${approvals.size}`);
if(approvals.size<threshold)throw new Error(`Insufficient human approvals for ${level}; approvals must match ${pr.head.sha}`);
