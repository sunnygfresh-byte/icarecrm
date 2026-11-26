// Only Firebase's public web configuration is returned to browsers.
const fields = {apiKey:'FIREBASE_API_KEY',authDomain:'FIREBASE_AUTH_DOMAIN',projectId:'FIREBASE_PROJECT_ID',storageBucket:'FIREBASE_STORAGE_BUCKET',messagingSenderId:'FIREBASE_MESSAGING_SENDER_ID',appId:'FIREBASE_APP_ID',measurementId:'FIREBASE_MEASUREMENT_ID'};
export function firebaseConfig(env){
 const result={}; for(const [field,name] of Object.entries(fields)){const value=env[name];if(typeof value==='string'&&value.trim()&&!value.startsWith('replace_'))result[field]=value.trim();}
 const missing=['apiKey','authDomain','projectId','appId'].filter(k=>!result[k]);
 if(missing.length)throw new Error('Firebase environment configuration is incomplete. Set '+missing.map(k=>fields[k]).join(', ')+'.');
 return result;
}
export function cloudConfig(env){const cloud=env.CLOUDINARY_CLOUD_NAME||'',key=env.CLOUDINARY_API_KEY||'',secret=env.CLOUDINARY_API_SECRET||'';return {cloud,key,secret,configured:/^[A-Za-z0-9_-]+$/.test(cloud)&&/^\d+$/.test(key)&&!!secret&&!secret.startsWith('replace_')};}
export function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});}
export function configResponse(env){try{return json({firebase:firebaseConfig(env)});}catch(e){return json({error:e.message},503);}}
