import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, inMemoryPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, runTransaction, Bytes, serverTimestamp } from 'firebase/firestore';
import { encodeWorkspace, decodeWorkspace, readManifest, checkRevision } from './firebase-sync.mjs';
const response=await fetch('/api/config',{cache:'no-store',credentials:'same-origin'});
const config=await response.json();
if(!response.ok||!config.firebase)throw Error(config.error||'Firebase configuration unavailable.');
const firebaseConfig=config.firebase;
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
// Analytics intentionally disabled for the private client workspace.
await setPersistence(auth,inMemoryPersistence);
function owner(){if(!auth.currentUser)throw Error('Sign in to Firebase first.');return auth.currentUser.uid;}
function refs(uid){const root=doc(db,'users',uid,'crm','current');return {root,chunk:i=>doc(root,'chunks',String(i))};}
export const login=async(email,password)=>(await signInWithEmailAndPassword(auth,email,password)).user;
export const logout=()=>signOut(auth);
export async function inspect(){const s=await getDocFromServer(refs(owner()).root);return readManifest(s.exists()?s.data():null);}
export async function pull(){const r=refs(owner());return runTransaction(db,async tx=>{const snap=await tx.get(r.root),m=readManifest(snap.exists()?snap.data():null);if(!m.revision)throw Error('No cloud workspace exists. Upload your local workspace first.');const chunks=await Promise.all(Array.from({length:m.count},(_,i)=>tx.get(r.chunk(i))));const bytes=chunks.map(c=>{if(!c.exists()||c.data().revision!==m.revision||!(c.data().payload instanceof Bytes))throw Error('Cloud workspace is incomplete. No local data was changed.');return c.data().payload.toUint8Array();});return {state:decodeWorkspace(bytes,m),revision:m.revision};});}
export async function push(state,expected){const r=refs(owner()),encoded=encodeWorkspace(state),revision=crypto.randomUUID();await runTransaction(db,async tx=>{const s=await tx.get(r.root),old=readManifest(s.exists()?s.data():null);checkRevision(old.revision,expected);encoded.chunks.forEach((payload,i)=>tx.set(r.chunk(i),{revision,payload:Bytes.fromUint8Array(payload)}));for(let i=encoded.chunks.length;i<old.count;i++)tx.delete(r.chunk(i));tx.set(r.root,{revision,count:encoded.chunks.length,byteLength:encoded.byteLength,format:1,updatedAt:serverTimestamp()});});return revision;}
