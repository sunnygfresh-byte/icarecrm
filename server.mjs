import http from 'node:http';
import { cloudConfig, configResponse } from './lib/config.mjs';
import {verifySession} from './functions/api/session.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// Single-user development connector. Do not expose to a network or the public internet.
const HOST='127.0.0.1', PORT=8787, ORIGIN=`http://${HOST}:${PORT}`;
const MAX=15*1024*1024, MAX_JSON=21*1024*1024;
const PREFIX='icare-crm-image-';
const MIME=/^image\/(jpeg|png|gif|webp)$/;
const assetPattern=/^[a-f0-9]{64}$/;
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
function fail(status,message){throw new HttpError(status,message)}
function config(){return cloudConfig(process.env);}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function readJson(req){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'Expected JSON request.');if(Number(req.headers['content-length'])>MAX_JSON)fail(413,'Image is too large.');let parts=[],n=0;for await(const chunk of req){n+=chunk.length;if(n>MAX_JSON)fail(413,'Image is too large.');parts.push(chunk)}let v;try{v=JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{fail(400,'Invalid JSON.')};if(!v||typeof v!=='object'||Array.isArray(v))fail(400,'Invalid request.');return v;}
export function assetId(recordId,bytes){return createHash('sha256').update(recordId+'\n').update(bytes).digest('hex');}
export function signedDelivery(cloud,secret,id){const signature=createHash('sha1').update(id+secret).digest('base64url').slice(0,8);return `https://res.cloudinary.com/${cloud}/image/authenticated/s--${signature}--/${id}`;}
function matchesMime(b,m){return m==='image/jpeg'?b.length>3&&b[0]===255&&b[1]===216&&b[2]===255:m==='image/png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):m==='image/gif'?['GIF87a','GIF89a'].includes(b.subarray(0,6).toString('ascii')):m==='image/webp'?b.subarray(0,4).toString('ascii')==='RIFF'&&b.subarray(8,12).toString('ascii')==='WEBP':false;}
async function callCloud(cfg,action,params,fetcher){const data=new FormData();for(const [k,v] of Object.entries(params)){if(v instanceof Blob)data.append(k,v,'image.webp');else data.append(k,String(v));}let r;try{r=await fetcher(`https://api.cloudinary.com/v1_1/${cfg.cloud}/image/${action}`,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(cfg.key+':'+cfg.secret).toString('base64')},body:data,redirect:'error',signal:AbortSignal.timeout(90000)})}catch{fail(502,'Unable to reach Cloudinary. Check your internet connection.');}if(!r.ok)fail(502,`Cloudinary rejected the ${action} request (HTTP ${r.status}). Verify your cloud name, credentials, and account settings.`);try{return await r.json()}catch{fail(502,'Unexpected Cloudinary response.');}}
export function makeServer({fetcher=fetch,getConfig=config}={}){let active=0;return http.createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');let counted=false;try{
 if(req.headers.host!==`${HOST}:${PORT}`)fail(403,'Local connector only.');
 if(req.url==='/api/session'){const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(typeof v==='string')headers.set(k,v);const result=await verifySession(new Request(ORIGIN+'/api/session',{method:req.method,headers}),process.env,fetcher);json(res,result.status,await result.json());return;}
 if(req.method==='GET'&&req.url==='/api/config'){const r=configResponse(process.env);json(res,r.status,await r.json());return;}
 if(req.method==='GET'&&(req.url==='/'||req.url==='/index.html')){const page=await readFile(new URL('./public/index.html',import.meta.url));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(page);return;}
 if(req.method==='GET'&&req.url==='/firebase-crm.js'){let code;try{code=await readFile(new URL('./firebase-crm.js',import.meta.url));}catch{fail(503,'Build Firebase first: npm install, then npm run build.');}res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});res.end(code);return;}
 if(req.method!=='POST'||!/^\/api\/cloudinary\/(status|upload|download|delete)$/.test(req.url||''))fail(404,'Not found.');
 if(req.headers.origin!==ORIGIN||(req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin'))fail(403,'Requests must originate from the local CRM.');
 if(active>=2)fail(429,'Another image operation is running.');active++;counted=true;
 const action=req.url.split('/').at(-1),cfg=getConfig();
 const binary=action==='upload'&&/^image\/webp(?:;|$)/i.test(req.headers['content-type']||'');
 let body,webpBytes;
 if(binary){if(Number(req.headers['content-length'])>MAX)fail(413,'Image is too large.');let parts=[],total=0;for await(const chunk of req){total+=chunk.length;if(total>MAX)fail(413,'Image is too large.');parts.push(chunk);}webpBytes=Buffer.concat(parts);body={asset:req.headers['x-crm-asset'],recordId:req.headers['x-crm-record-id'],mime:'image/webp'};}
 else body=await readJson(req);
 if(action==='status'){json(res,200,{cloud:cfg.cloud,configured:cfg.configured});return;}
 if(!cfg.configured)fail(503,'Set the rotated Cloudinary credentials in your local environment file first.');
 if(typeof body.asset!=='string'||!assetPattern.test(body.asset))fail(400,'Invalid image identifier.');const id=PREFIX+body.asset;
 if(action==='upload'){
  if(typeof body.recordId!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(body.recordId)||typeof body.mime!=='string'||!MIME.test(body.mime)||(!binary&&(typeof body.data!=='string'||body.data.length>Math.ceil(MAX/3)*4||body.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.data))))fail(400,'Unsupported or invalid image.');
  const bytes=binary?webpBytes:Buffer.from(body.data,'base64');if(bytes.length>MAX||!matchesMime(bytes,body.mime)||assetId(body.recordId,bytes)!==body.asset)fail(400,'Image bytes or identifier do not match.');
  const result=await callCloud(cfg,'upload',{file:binary?new Blob([bytes],{type:'image/webp'}):`data:${body.mime};base64,${body.data}`,public_id:id,type:'authenticated',overwrite:'false'},fetcher);
  if(result.public_id!==id||result.type!=='authenticated')fail(502,'Cloudinary returned an unexpected asset identifier or access type. Verify the asset in your console.');json(res,200,{ok:true});return;
 }
 if(action==='delete'){const result=await callCloud(cfg,'destroy',{public_id:id,type:'authenticated',invalidate:'true'},fetcher);if(!['ok','not found'].includes(result.result))fail(502,'Cloudinary did not confirm removal.');json(res,200,{ok:true});return;}
 // Sign only an app-owned image identifier, fetch server-side, and return image bytes, not a signed URL.
 let r;try{r=await fetcher(signedDelivery(cfg.cloud,cfg.secret,id),{redirect:'error',signal:AbortSignal.timeout(90000)})}catch{fail(502,'Unable to reach Cloudinary.');}
 if(r.status===404)fail(404,'Cloud copy not found. Upload it first or use the local Download button.');if(!r.ok)fail(502,`Cloudinary download failed (HTTP ${r.status}). Verify the copy and credentials.`);
 const contentType=(r.headers.get('content-type')||'').split(';')[0];if(!MIME.test(contentType))fail(502,'Cloudinary returned an unexpected file type.');
 let parts=[],total=0;for await(const part of r.body){total+=part.length;if(total>MAX)fail(502,'Cloud image exceeds the local size limit.');parts.push(Buffer.from(part));}const bytes=Buffer.concat(parts);if(!matchesMime(bytes,contentType))fail(502,'Cloudinary returned invalid image bytes.');res.writeHead(200,{'Content-Type':contentType,'Content-Length':bytes.length,'Content-Disposition':'attachment','Cache-Control':'no-store'});res.end(bytes);
 }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Local connector error.'});else res.end();}finally{if(counted)active--;}});}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){makeServer().listen(PORT,HOST,()=>console.log(`iCare CRM: ${ORIGIN} (local prototype only)`));}
