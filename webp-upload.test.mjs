import assert from 'node:assert/strict';
import {makeServer,assetId} from './server.mjs';
const bytes=Buffer.from('UklGRjIAAABXRUJQVlA4ICYAAACQAQCdASoEAAQAAUAmJZACdLoAA5gA/uUK/iF3shz/1XiDM9ZAAA==','base64');
const recordId='webp-test',asset=assetId(recordId,bytes),base='http://127.0.0.1:8787';let count=0;
const server=makeServer({getConfig:()=>({cloud:'testcloud',key:'12345',secret:'test-secret',configured:true}),fetcher:async(url,opts)=>{count++;assert.ok(url.endsWith('/upload'));const f=opts.body.get('file');assert.equal(f.type,'image/webp');assert.equal(f.name,'image.webp');assert.deepEqual(Buffer.from(await f.arrayBuffer()),bytes);assert.equal(opts.body.get('type'),'authenticated');return Response.json({public_id:'icare-crm-image-'+asset,type:'authenticated'});}});
await new Promise(r=>server.listen(8787,'127.0.0.1',r));
const post=(body,hash=asset,origin=base)=>fetch(base+'/api/cloudinary/upload',{method:'POST',headers:{Origin:origin,'Content-Type':'image/webp','X-CRM-Record-Id':recordId,'X-CRM-Asset':hash},body});
try{assert.equal((await post(bytes)).status,200);assert.equal((await post(bytes,'0'.repeat(64))).status,400);assert.equal((await post(Buffer.from('not an image'))).status,400);assert.equal((await post(bytes,asset,'https://other.example')).status,403);assert.equal(count,1);console.log('PASS: binary WebP forwarding, byte integrity, asset identifier, origin guard and authenticated upload.');}finally{server.close();}
