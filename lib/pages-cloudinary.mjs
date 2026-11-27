import {firebaseConfig,cloudConfig,json} from './config.mjs';
const MAX=15*1024*1024, prefix='icare-crm-image-', validAsset=/^[a-f0-9]{64}$/, mime=/^image\/(jpeg|png|gif|webp)$/;
const encoder=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
const digest=(alg,b)=>crypto.subtle.digest(alg,b);
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
async function bytesLimited(stream,limit){if(!stream)fail(400,'Missing request body.');const reader=stream.getReader();let total=0,parts=[];try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();fail(413,'Image or request exceeds the size limit.');}parts.push(value);}}finally{reader.releaseLock();}const out=new Uint8Array(total);let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;}
function matches(b,m){const ascii=(a,z)=>String.fromCharCode(...b.slice(a,z));return m==='image/webp'?b.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP':m==='image/jpeg'?b.length>3&&b[0]===255&&b[1]===216&&b[2]===255:m==='image/png'?b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v):m==='image/gif'?['GIF87a','GIF89a'].includes(ascii(0,6)):false;}
export async function assetId(recordId,bytes){const head=encoder.encode(recordId+'\n'),all=new Uint8Array(head.length+bytes.length);all.set(head);all.set(bytes,head.length);return hex(await digest('SHA-256',all));}
export async function signedDelivery(cloud,secret,id){const hash=new Uint8Array(await digest('SHA-1',encoder.encode(id+secret)));const sig=btoa(String.fromCharCode(...hash)).replace(/\+/g,'-').replace(/\//g,'_').slice(0,8);return `https://res.cloudinary.com/${cloud}/image/authenticated/s--${sig}--/${id}`;}
export async function authorize(request,env,fetcher){
 const uid=env.CRM_COACH_UID;if(!uid||uid.startsWith('replace_'))fail(503,'Set CRM_COACH_UID to your authorized coach UID.');
 let cfg;try{cfg=firebaseConfig(env);}catch{fail(503,'Firebase environment configuration is incomplete.');}
 const token=request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1];if(!token||token.length>12000)fail(401,'Sign in to Firebase first.');
 // Claims alone are NOT trusted. Google must accept the signed ID token before access is granted.
 let claims;try{const payload=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');claims=JSON.parse(atob(payload));}catch{fail(401,'Invalid Firebase session.');}
 if(claims.aud!==cfg.projectId||claims.iss!==`https://securetoken.google.com/${cfg.projectId}`||claims.sub!==uid||typeof claims.exp!=='number'||claims.exp<=Date.now()/1000||typeof claims.auth_time!=='number')fail(403,'Coach access denied.');
 let r;try{r=await fetcher('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(cfg.apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),redirect:'error',signal:AbortSignal.timeout(15000)});}catch{fail(502,'Firebase session verification is unavailable.');}
 if(!r.ok)fail(r.status===400||r.status===401||r.status===403?401:502,'Firebase session verification failed. Sign in again or check the API configuration.');
 const j=await r.json().catch(()=>({})),user=j.users?.[0];if(!user||user.localId!==uid||user.disabled||Number(user.validSince||0)>claims.auth_time)fail(403,'Coach access denied.');
}
async function cloudCall(cfg,action,params,file,fetcher){const signed={...params,timestamp:String(Math.floor(Date.now()/1000))};const signature=hex(await digest('SHA-1',encoder.encode(Object.keys(signed).sort().map(k=>k+'='+signed[k]).join('&')+cfg.secret)));const form=new FormData();for(const [k,v] of Object.entries({...signed,api_key:cfg.key,signature}))form.append(k,v);if(file)form.append('file',file,'image.webp');let r;try{r=await fetcher(`https://api.cloudinary.com/v1_1/${cfg.cloud}/image/${action}`,{method:'POST',body:form,redirect:'error',signal:AbortSignal.timeout(90000)});}catch{fail(502,'Cloudinary is unavailable.');}if(!r.ok)fail(502,`Cloudinary ${action} failed (HTTP ${r.status}). Check your configuration.`);return r.json().catch(()=>fail(502,'Invalid Cloudinary response.'));}
export async function handleCloudinary(request,env,action,fetcher=fetch){try{
 if(request.method!=='POST'||!['status','upload','download','delete'].includes(action))fail(405,'Unsupported operation.');
 if(request.headers.get('Origin')!==new URL(request.url).origin||!['same-origin',null].includes(request.headers.get('Sec-Fetch-Site')))fail(403,'Same-origin CRM requests only.');
 await authorize(request,env,fetcher);const cfg=cloudConfig(env);
 if(action==='status')return json({cloud:cfg.cloud,configured:cfg.configured});
 if(!cfg.configured)fail(503,'Set the rotated Cloudinary credentials in Cloudflare.');
 let asset,recordId,bytes;
 if(action==='upload'){
  if((request.headers.get('Content-Type')||'').split(';')[0]!=='image/webp')fail(415,'Expected a WebP image.');asset=request.headers.get('X-CRM-Asset');recordId=request.headers.get('X-CRM-Record-Id');
  if(!validAsset.test(asset||'')||! /^[A-Za-z0-9_-]{1,100}$/.test(recordId||''))fail(400,'Invalid image identifier.');
  if(Number(request.headers.get('Content-Length'))>MAX)fail(413,'Image exceeds 15 MiB.');bytes=await bytesLimited(request.body,MAX);if(!matches(bytes,'image/webp')||await assetId(recordId,bytes)!==asset)fail(400,'Invalid WebP bytes or identifier.');
  const id=prefix+asset,result=await cloudCall(cfg,'upload',{public_id:id,type:'authenticated',overwrite:'false'},new Blob([bytes],{type:'image/webp'}),fetcher);
  if(result.public_id!==id||result.type!=='authenticated')fail(502,'Unexpected Cloudinary asset response.');return json({ok:true});
 }
 if((request.headers.get('Content-Type')||'').split(';')[0]!=='application/json')fail(415,'Expected JSON.');
 let data;try{data=JSON.parse(new TextDecoder().decode(await bytesLimited(request.body,8192)));}catch(e){if(e.status)throw e;fail(400,'Invalid JSON.');}asset=data?.asset;if(typeof asset!=='string'||!validAsset.test(asset))fail(400,'Invalid image identifier.');const id=prefix+asset;
 if(action==='delete'){const result=await cloudCall(cfg,'destroy',{public_id:id,type:'authenticated',invalidate:'true'},null,fetcher);if(!['ok','not found'].includes(result.result))fail(502,'Cloudinary did not confirm removal.');return json({ok:true});}
 let r;try{r=await fetcher(await signedDelivery(cfg.cloud,cfg.secret,id),{redirect:'error',signal:AbortSignal.timeout(90000)});}catch{fail(502,'Cloudinary download unavailable.');}if(r.status===404)fail(404,'Cloud copy not found.');if(!r.ok)fail(502,'Cloudinary download failed.');const type=(r.headers.get('Content-Type')||'').split(';')[0];if(!mime.test(type))fail(502,'Unexpected image format.');bytes=await bytesLimited(r.body,MAX);if(!matches(bytes,type))fail(502,'Invalid cloud image.');return new Response(bytes,{headers:{'Content-Type':type,'Content-Disposition':'attachment','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return json({error:e.status?e.message:'Cloud connector error.'},e.status||500);}}
