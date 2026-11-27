import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('public/index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('// V3.2.0 client workspace:'),html.indexOf('function render(){if(!ready)return;'));
function harness(mobile){const c=vm.createContext({window:{matchMedia:()=>({matches:mobile})},encodeURIComponent});vm.runInContext(code,c);return c;}
test('mobile entry uses hub, desktop entry retains overview',()=>{assert.equal(harness(true).workspaceEntry(),'hub');assert.equal(harness(false).workspaceEntry(),'overview');});
test('mobile routes are recognized while desktop aliases retain legacy modules',()=>{const c=harness(true);for(const m of ['hub','programs','training','overview','notes'])assert.equal(c.workspaceRoute('#/clients/client-1/'+m).module,m);assert.equal(c.workspaceDesktopModule('hub'),'overview');assert.equal(c.workspaceDesktopModule('programs'),'training');assert.equal(c.workspaceRoute('#/clients/a/unknown'),null);});
test('eight primary modules are unique, including existing program schedule',()=>{const c=harness(true);const m=vm.runInContext('mobileModules.map(x=>x[0])',c);assert.deepEqual(Array.from(m),['calendar','resources','notes','training','programs','forms','photos','progress']);assert.equal(new Set(m).size,8);});
test('formal 8px mobile tokens and safe-area accessibility exceptions are present',()=>{for(const [n,v] of [['space-1',8],['space-2',16],['space-3',24],['space-4',32],['space-6',48],['space-8',64],['card-min',112]])assert.ok(html.includes(`--ic-${n}:${v}px`));assert.match(html,/env\(safe-area-inset-bottom,0px\)/);assert.match(html,/html\[data-crm-large\] \.mobile-dock\{position:static\}/);});
test('dedicated mobile pages reuse original module views with no secondary storage',()=>{assert.match(html,/programs:\(\)=>progress\('programs'\)/);assert.match(html,/training:\(\)=>progress\('mobiletraining'\)/);assert.match(html,/if\(workspaceMobile\(\)\)return workspaceMobileView\(c\)/);});
