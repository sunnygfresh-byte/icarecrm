import test from 'node:test';
import assert from 'node:assert/strict';
import {verifySession} from './functions/api/session.js';
import {handleCloudinary} from './lib/pages-cloudinary.mjs';
const base='https://preview.example';
const env={FIREBASE_API_KEY:'test',FIREBASE_AUTH_DOMAIN:'test.firebaseapp.com',FIREBASE_PROJECT_ID:'test',FIREBASE_APP_ID:'test-app',CRM_COACH_UID:'coach'};
const now=Math.floor(Date.now()/1000);
const claims={aud:'test',iss:'https://securetoken.google.com/test',sub:'coach',exp:now+3600,auth_time:now-10};
const token=c=>'h.'+Buffer.from(JSON.stringify(c)).toString('base64url')+'.s';
const req=(c=claims,origin=base,method='POST')=>new Request(base+'/api/session',{method,headers:{Origin:origin,Authorization:'Bearer '+token(c)}});
function mock(response){return async(url,opts)=>{if(opts.redirect==='error')throw new TypeError('Unsupported redirect mode');assert.equal(opts.redirect,'manual');assert.ok(url.startsWith('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='));assert.equal(opts.method,'POST');assert.ok(opts.signal instanceof AbortSignal);return response;};}
test('Cloudflare redirect compatibility: authorized coach succeeds with manual mode',async()=>{const r=await verifySession(req(),env,mock(Response.json({users:[{localId:'coach'}]})));assert.equal(r.status,200);assert.deepEqual(await r.json(),{authorized:true});});
test('all HTTP redirects fail closed',async()=>{for(const status of [301,302,303,307,308]){const r=await verifySession(req(),env,mock(new Response(null,{status,headers:{Location:'https://other.example'}})));assert.equal(r.status,502);assert.notEqual((await r.json()).authorized,true);}});
test('wrong project, issuer, UID, expired token, cross origin and GET fail before lookup',async()=>{const never=async()=>assert.fail('unexpected lookup');for(const c of [{...claims,aud:'other'},{...claims,iss:'wrong'},{...claims,sub:'other'},{...claims,exp:now-1}])assert.equal((await verifySession(req(c),env,never)).status,403);assert.equal((await verifySession(req(claims,'https://other.example'),env,never)).status,403);assert.equal((await verifySession(req(claims,base,'GET'),env,never)).status,405);});
test('revoked, disabled and mismatched accounts remain denied',async()=>{for(const user of [{localId:'coach',validSince:String(now)},{localId:'coach',disabled:true},{localId:'other'}])assert.equal((await verifySession(req(),env,mock(Response.json({users:[user]})))).status,403);});
test('invalid token response and network failure remain denied',async()=>{assert.equal((await verifySession(req(),env,mock(Response.json({error:'INVALID_ID_TOKEN'},{status:400})))).status,401);assert.equal((await verifySession(req(),env,async()=>{throw Error('network unavailable');})).status,502);});
test('shared Cloudinary authorization uses the same corrected lookup',async()=>{const r=await handleCloudinary(req(),env,'status',mock(Response.json({users:[{localId:'coach'}]})));assert.equal(r.status,200);});
