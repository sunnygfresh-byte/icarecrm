// Stage only the root HTML into the dedicated Pages static directory.
import { mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('./', import.meta.url);
const output = new URL('public/', root);
await mkdir(fileURLToPath(output), { recursive: true });
await copyFile(new URL('index.html', root), new URL('index.html', output));
console.log('iCare CRM: staged public/index.html; existing Pages routing files retained.');
