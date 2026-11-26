import {authorize} from '../../lib/pages-cloudinary.mjs';
import {json} from '../../lib/config.mjs';
// Check the existing coach UID and Firebase token before the browser opens a local vault.
export async function verifySession(request,env,fetcher=fetch){try{
 if(request.method!=='POST')return json({error:'Unsupported operation.'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin||!['same-origin',null].includes(request.headers.get('Sec-Fetch-Site')))return json({error:'Same-origin CRM requests only.'},403);
 await authorize(request,env,fetcher);return json({authorized:true});
}catch(e){return json({error:e.status?e.message:'Session verification unavailable.'},e.status||502);}}
export const onRequest=({request,env})=>verifySession(request,env);
