// Validate the ready-to-deploy Pages directory; no copy or bundling needed.
import { readdir, readFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('./', import.meta.url);
const files = (await readdir(new URL('public/',root))).sort();
assert.deepEqual(files, ['_headers','_routes.json','index.html']);
for (const name of files) assert.ok((await stat(new URL('public/'+name,root))).isFile());
const html = await readFile(new URL('public/index.html',root),'utf8');
assert.match(html, /<!doctype html>/i);
assert.ok(html.includes('/api/config') && html.includes('/api/cloudinary/'));
const routes = JSON.parse(await readFile(new URL('public/_routes.json',root),'utf8'));
assert.deepEqual(routes, {version:1,include:['/api/*'],exclude:[]});
for (const file of ['functions/api/config.js','functions/api/cloudinary/[action].js']) assert.ok((await stat(new URL(file,root))).isFile());
console.log('iCare CRM: public static files and API route files verified. No build required.');
