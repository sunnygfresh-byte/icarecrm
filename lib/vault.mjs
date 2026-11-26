// Device vault: Web Crypto only. The passphrase and non-extractable key are never persisted.
export const VAULT_ITERATIONS=600000;
const vaultEncoder=new TextEncoder();
const vaultDecoder=new TextDecoder('utf-8',{fatal:true});
export async function vaultKey(passphrase,salt){
 if(typeof passphrase!=='string'||passphrase.length<12||passphrase.length>1024)throw Error('Use a device passphrase of 12–1024 characters.');
 if(!(salt instanceof Uint8Array)||salt.length!==16)throw Error('Invalid vault salt.');
 const material=await crypto.subtle.importKey('raw',vaultEncoder.encode(passphrase),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:VAULT_ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function vaultAAD(owner,project,token,salt){return vaultEncoder.encode(JSON.stringify(['icare-vault-v1',owner,project,token,Array.from(salt)]));}
export async function vaultSeal(key,salt,owner,project,value){
 const iv=crypto.getRandomValues(new Uint8Array(12)),token=crypto.randomUUID();
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:vaultAAD(owner,project,token,salt)},key,vaultEncoder.encode(JSON.stringify(value)));
 return {format:1,owner,project,token,salt,iv,ciphertext};
}
export async function vaultOpen(key,box,owner,project){
 if(!box||box.format!==1||box.owner!==owner||box.project!==project||typeof box.token!=='string'||!(box.salt instanceof Uint8Array)||box.salt.length!==16||!(box.iv instanceof Uint8Array)||box.iv.length!==12||!(box.ciphertext instanceof ArrayBuffer))throw Error('Vault is invalid or belongs to a different Firebase account/project.');
 try{return JSON.parse(vaultDecoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:box.iv,additionalData:vaultAAD(owner,project,box.token,box.salt)},key,box.ciphertext)));}catch{throw Error('Incorrect passphrase or damaged encrypted vault. Nothing was overwritten.');}
}
