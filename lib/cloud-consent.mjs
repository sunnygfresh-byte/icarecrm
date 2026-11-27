import {readManifest,decodeWorkspace} from '../firebase-sync.mjs';
const idPattern=/^[A-Za-z0-9_-]{1,100}$/;
const hashPattern=/^[a-f0-9]{64}$/;
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const bytes=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0));
const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
export async function sourceHash(source){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source)));}
export async function readCommittedWorkspace({project,uid,token},fetcher){
 if(!/^[a-z][a-z0-9-]{2,62}$/.test(project)||!idPattern.test(uid))fail(503,'Invalid Firebase project or coach UID.');
 const url=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/users/${uid}/crm/current`;
 async function get(path){let r;try{r=await fetcher(path,{headers:{Authorization:'Bearer '+token},redirect:'manual',signal:AbortSignal.timeout(15000)});}catch{fail(502,'Could not verify committed image consent. Retry online.');}if(!r.ok)fail(r.status===404?409:r.status===401||r.status===403?403:502,'Could not verify committed workspace. Sync Firebase first.');return r.json();}
 const manifest=d=>{let f=d.fields||{};return readManifest({format:Number(f.format?.integerValue),revision:f.revision?.stringValue,count:Number(f.count?.integerValue),byteLength:Number(f.byteLength?.integerValue)});};
 try{for(let attempt=0;attempt<2;attempt++){const m=manifest(await get(url));const chunks=await Promise.all(Array.from({length:m.count},(_,i)=>get(url+'/chunks/'+i).then(x=>x.fields)));const end=manifest(await get(url));if(end.revision!==m.revision||chunks.some(c=>c?.revision?.stringValue!==m.revision))continue;const s=decodeWorkspace(chunks.map(c=>bytes(c.payload.bytesValue)),m);if(s.schemaVersion!==1||!Array.isArray(s.clients)||!Array.isArray(s.resources))fail(409,'Invalid committed workspace.');return s;}}catch(e){if(e.status)throw e;fail(409,'Committed workspace could not be verified.');}fail(409,'Workspace changed during verification. Retry after synchronization.');
}
export function webpDimensions(b){
 const ascii=(a,n)=>String.fromCharCode(...b.slice(a,a+n));const u24=i=>b[i]+b[i+1]*256+b[i+2]*65536;const u32=i=>u24(i)+b[i+3]*16777216;
 if(b.length<20||ascii(0,4)!=='RIFF'||ascii(8,4)!=='WEBP'||u32(4)+8!==b.length)fail(400,'Invalid WebP container.');
 let w=0,h=0,extended=false,image=false;for(let i=12;i+8<=b.length;){let type=ascii(i,4),n=u32(i+4),p=i+8;if(n>b.length-p||p+n+(n%2)>b.length)fail(400,'Invalid WebP chunk.');
 if(type==='ANIM'||type==='ANMF')fail(400,'Animated WebP is not supported.');if(type==='EXIF'||type==='XMP ')fail(400,'Embedded image metadata is not permitted.');
 if(type==='VP8X'){if(n!==10||extended||image||b[p]&2)fail(400,'Invalid or animated WebP.');w=u24(p+4)+1;h=u24(p+7)+1;extended=true;}
 if(type==='VP8 '){if(n<10||ascii(p+3,3)!=='\x9d\x01\x2a'||image)fail(400,'Invalid WebP image.');let iw=(b[p+6]+b[p+7]*256)&16383,ih=(b[p+8]+b[p+9]*256)&16383;if(!extended){w=iw;h=ih;}else if(w!==iw||h!==ih)fail(400,'WebP dimensions do not match.');image=true;}
 if(type==='VP8L'){if(n<5||b[p]!==47||image)fail(400,'Invalid lossless WebP.');let v=u32(p+1),iw=(v&16383)+1,ih=((v>>>14)&16383)+1;if(!extended){w=iw;h=ih;}else if(w!==iw||h!==ih)fail(400,'WebP dimensions do not match.');image=true;}i=p+n+(n%2);}
 if(!image||!w||!h||w>1600||h>1600)fail(400,'WebP must be a still image at most 1600 pixels per edge.');return {width:w,height:h};
}
export async function checkAsset(s,{kind,recordId,asset,action,body},assetId){
 if(!['avatar','resource'].includes(kind)||!idPattern.test(recordId||'')||!hashPattern.test(asset||''))fail(400,'Invalid image association.');
 const r=(kind==='avatar'?s.clients:s.resources).find(x=>x.id===recordId);if(!r)fail(403,'Image is not associated with a committed record.');const client=kind==='avatar'?r:s.clients.find(x=>x.id===r.clientId);if(!client)fail(403,'Client association missing.');
 if(kind==='resource'&&action!=='delete'){if(r.noteId&&r.formId)fail(403,'Ambiguous attachment association.');if(r.noteId&&!s.notes?.some(n=>n.id===r.noteId&&n.clientId===r.clientId))fail(403,'Note association missing or belongs to another client.');if(r.formId&&!s.forms?.some(f=>f.id===r.formId&&f.clientId===r.clientId))fail(403,'Form association missing or belongs to another client.');} 
 if(action==='download'&&kind==='resource'&&(r.type==='Progress photo'||r.photoKind==='Progress')&&client.photoConsent!=='Granted')fail(403,'Progress photo permission is required.');
 const source=kind==='avatar'?r.profilePhoto:r.data;const pending=r.cloudPending,copy=r.cloudCopy,retired=r.cloudRetired;
 if(action==='upload'){
  if(!pending||pending.asset!==asset||pending.revokedAt||!stamp(pending.consentAt)||pending.mime!=='image/webp'||pending.size!==body.length||typeof source!=='string'||!source||pending.sourceHash!==await sourceHash(source)||typeof pending.data!=='string')fail(403,'Explicit, synchronized consent for this image is required.');
  if(kind==='resource'&&(r.type==='Progress photo'||r.photoKind==='Progress')&&client.photoConsent!=='Granted')fail(403,'Progress photo permission is required.');
  let committed;try{committed=bytes(pending.data);}catch{fail(409,'Invalid pending image.');}if(committed.length!==body.length||await assetId(recordId,committed)!==asset)fail(403,'Upload does not match the consented image.');webpDimensions(body);return;
 }
 const match=[copy,pending,retired].find(x=>x?.asset===asset);
 if(match){if(action==='download'&&(match.revokedAt||match===retired||match===pending))fail(403,'Image is pending, withdrawn or retired.');if(action==='delete'&&(match.consentAt||match===pending||match===retired)&&!stamp(match.revokedAt))fail(403,'Commit cloud consent withdrawal before removal.');return;}
 // V2.1 legacy resources had no stored cloud reference. Permit retrieval/removal only of the exact original attachment identifier.
 if(kind==='resource'&&!copy&&!pending&&!retired&&typeof source==='string'&&source){try{if(await assetId(recordId,bytes(source))===asset)return;}catch{}}
 fail(403,'Image is not associated with a committed record.');
}
