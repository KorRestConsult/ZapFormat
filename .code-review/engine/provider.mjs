import {setTimeout as delay} from 'node:timers/promises';
const DEFAULT_ENDPOINT='https://api.timeweb.ai/v1/chat/completions';
export async function requestLLM(system,user,{token=process.env.TIMEWEB_AI_TOKEN,endpoint=process.env.REVIEW_AI_ENDPOINT||DEFAULT_ENDPOINT,model=process.env.REVIEW_AI_MODEL||'openai/gpt-5.6-luna',fetchImpl=fetch}={}) {
  if(!token)throw new Error('AI review unavailable: TIMEWEB_AI_TOKEN is not set; check must not pass silently');
  const url=new URL(endpoint);
  if(url.protocol!=='https:'||!['api.timeweb.ai','api.openai.com'].includes(url.hostname))throw new Error('Untrusted review AI endpoint');
  for(let attempt=0;attempt<2;attempt++){
    const timeout=AbortSignal.timeout(60_000);
    const res=await fetchImpl(url,{
      method:'POST',signal:timeout,
      headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({model,messages:[{role:'system',content:system+' Respond ONLY with valid JSON.'},{role:'user',content:user}],max_completion_tokens:1600})
    });
    if(res.status===429&&attempt===0){await delay(1800);continue;}
    if(!res.ok)throw new Error(`AI provider HTTP ${res.status}`);
    const json=await res.json(); const value=json.choices?.[0]?.message?.content;
    if(typeof value!=='string'||!value.trim())throw new Error('Empty AI review response');
    return value;
  }
  throw new Error('AI provider rate-limited');
}
