import http from 'node:http';
import {Readable} from 'node:stream';
import {configResponse} from './lib/config.mjs';
import {handleCloudinary} from './lib/pages-cloudinary.mjs';
import {verifySession} from './functions/api/session.js';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
// Single-user development connector. No unauthenticated image transfer path.
const HOST='127.0.0.1',PORT=8787,ORIGIN=`http://${HOST}:${PORT}`;
export function assetId(recordId,bytes){return createHash('sha256').update(recordId+'\n').update(bytes).digest('hex');}
export function signedDelivery(cloud,secret,id){const signature=createHash('sha1').update(id+secret).digest('base64url').slice(0,8);return `https://res.cloudinary.com/${cloud}/image/authenticated/s--${signature}--/${id}`;}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function forward(res,result){res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));}
export function makeServer({fetcher=fetch,env=process.env}={}){let active=0;return http.createServer(async(req,res)=>{let counted=false;res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');try{
 if(req.headers.host!==`${HOST}:${PORT}`){json(res,403,{error:'Local connector only.'});return;}
 if(req.method==='GET'&&req.url==='/api/config'){await forward(res,configResponse(env));return;}
 if(req.method==='GET'&&(req.url==='/'||req.url==='/index.html')){const page=await readFile(new URL('./public/index.html',import.meta.url));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(page);return;}
 if(req.method==='GET'&&req.url==='/firebase-crm.js'){let code;try{code=await readFile(new URL('./firebase-crm.js',import.meta.url));}catch{json(res,503,{error:'Build Firebase first: npm install, then npm run build.'});return;}res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});res.end(code);return;}
 const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(typeof v==='string')headers.set(k,v);
 if(req.url==='/api/session'){await forward(res,await verifySession(new Request(ORIGIN+'/api/session',{method:req.method,headers}),env,fetcher));return;}
 const action=/^\/api\/cloudinary\/(status|upload|download|delete)$/.exec(req.url||'')?.[1];if(req.method!=='POST'||!action){json(res,404,{error:'Not found.'});return;}
 if(active>=2){json(res,429,{error:'Another image operation is running.'});return;}active++;counted=true;
 const request=new Request(ORIGIN+req.url,{method:'POST',headers,body:Readable.toWeb(req),duplex:'half'});await forward(res,await handleCloudinary(request,env,action,fetcher));
 }catch{if(!res.headersSent)json(res,500,{error:'Local connector error.'});else res.end();}finally{if(counted)active--;}});}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){makeServer().listen(PORT,HOST,()=>console.log(`iCare CRM: ${ORIGIN} (local development only)`));}
