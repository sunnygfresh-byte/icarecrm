import {authorize} from '../../../lib/pages-cloudinary.mjs';
import {json} from '../../../lib/config.mjs';
export async function onRequest({request,env,params}){
 try{
  const action=params.action;if(request.method!=='POST'||!['status','sync','pause','resume'].includes(action))return json({error:'Unsupported operation.'},405);
  if(request.headers.get('Origin')!==new URL(request.url).origin||!['same-origin',null].includes(request.headers.get('Sec-Fetch-Site')))return json({error:'Same-origin CRM requests only.'},403);
  await authorize(request,env,fetch);
  if(!env.REPORTING_SERVICE)return json({error:'Reporting Worker is not bound. Add REPORTING_SERVICE in Cloudflare Pages.'},503);
  const r=await env.REPORTING_SERVICE.fetch('https://report.internal/'+action,{method:action==='status'?'GET':'POST'});
  return json(await r.json(),r.status);
 }catch(e){return json({error:e.status?e.message:'Reporting connector unavailable.'},e.status||502);}
}
