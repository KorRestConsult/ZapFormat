export function apiClient(token=process.env.GITHUB_TOKEN,base='https://api.github.com'){
  if(!token)throw new Error('GITHUB_TOKEN required');
  return async(path,init={})=>{
    const url=new URL(path,base);if(url.origin!==new URL(base).origin)throw new Error('External GitHub URL rejected');
    const res=await fetch(url,{...init,headers:{'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Authorization':`Bearer ${token}`,...init.headers}});
    if(!res.ok)throw new Error('GitHub '+res.status+' '+url.pathname);
    if(res.status===204)return null;
    return await res.json();
  };
}
export async function changedFiles(api,repo,number){
  const files=[];
  for(let page=1;page<=5;page++){
    const chunk=await api(`/repos/${repo}/pulls/${number}/files?per_page=100&page=${page}`);
    files.push(...chunk);if(chunk.length<100)break;
  }
  if(files.length>=500)throw new Error('Too many files; split pull request');
  return files.map(f=>({filename:f.filename,patch:f.patch||'',status:f.status}));
}
export async function fileContext(api,repo,sha,file){
  const path=file.filename.split('/').map(encodeURIComponent).join('/');
  try{const x=await api(`/repos/${repo}/contents/${path}?ref=${sha}`);if(x.encoding!=='base64'||Number(x.size)>45_000)return '';
    return Buffer.from(x.content,'base64').toString('utf8').slice(0,45_000);
  }catch{return '';}
}
export async function postSummary(api,repo,pr,head,body){
  const prefix=`<!-- code-review:${head} -->`;
  const existing=await api(`/repos/${repo}/issues/${pr}/comments?per_page=100`);
  if(existing.some(c=>String(c.body).includes(prefix)))return false;
  await api(`/repos/${repo}/issues/${pr}/comments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:`${prefix}\n${body}`})});return true;
}

export async function postInlineFindings(api,repo,pr,sha,findings){
  const existing=await api(`/repos/${repo}/pulls/${pr}/comments?per_page=100`);
  for(const f of findings){
    const marker=`<!-- code-review:${sha}:${f.file}:${f.line}:${f.category} -->`;
    if(existing.some(c=>String(c.body).includes(marker)))continue;
    const body=`${marker}\n**${f.severity} · confirmed ${f.confirmedVotes}/3**\n\n${f.impact}\n\nEvidence: ${f.evidence}\n\nSuggested fix: ${f.fix}\n\nAI finding. Validate before applying; human approval rules still apply.`;
    await api(`/repos/${repo}/pulls/${pr}/comments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body,commit_id:sha,path:f.file,line:f.line,side:'RIGHT'})});
  }
}
