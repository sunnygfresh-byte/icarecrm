"""Optional isolated Chromium UI smoke test. No live auth, cloud requests or real data.
Run from project root with Python Playwright + Chromium installed. CHROMIUM overrides binary.
The test bypasses startup only in its in-memory HTML copy and mocks encrypted persistence.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os, base64
html=Path('public/index.html').read_text().replace('bindVault();','/* isolated test: skip live startup */',1)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000}); errors=[]; alerts=[]; outbound=[]
    page.set_default_timeout(6000);page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
    page.route('**/*',lambda r:(outbound.append(r.request.url),r.abort()))
    page.set_content(html)
    page.evaluate('''() => {vaultActive=()=>true;vaultAssert=()=>{};vaultSession={};writeDB=async()=>{localVersion++};firebaseAfterSave=()=>{};fbControls=()=>{};fbSchedule=()=>{};ready=true;document.body.classList.remove('vault-locked');$('vaultGate').hidden=true;demo();}''')
    page.wait_for_function('state.clients.length===3')
    base=page.evaluate('JSON.stringify(state)')
    page.evaluate("workspaceGlobal('Contacts')")
    page.locator('[data-client-link="demo-1"]').first.click()
    assert page.evaluate('location.hash')=='#/clients/demo-1/overview'
    modules=['overview','contact','calendar','notes','resources','progress','training','forms','photos','privacy','timeline']
    def module(m):
        page.locator(f'[data-action="wsModule:{m}"]').first.click()
        assert page.evaluate('workspaceModule')==m
    for width in [1440,768,390]:
        page.set_viewport_size({'width':width,'height':900})
        for m in modules:
            module(m)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,m)
    assert page.evaluate('JSON.stringify(state)')==base,'Navigation must not mutate workspace'
    print('PASS: 11 modules × 3 viewport sizes; no horizontal page overflow; navigation leaves data unchanged')
    module('notes');page.locator('[data-action="new:notes"]').first.click()
    page.locator('#field-title').fill('Browser note');page.locator('#field-body').fill('Test note')
    page.locator('#wsFiles').set_input_files([{'name':'notes.txt','mimeType':'text/plain','buffer':b'hello'}, {'name':'test.pdf','mimeType':'application/pdf','buffer':b'%PDF-1.4\n%%EOF'}]);page.locator('#editorSave').click()
    page.wait_for_function("state.notes.some(n=>n.title==='Browser note')")
    assert page.evaluate("state.resources.filter(r=>r.noteId===state.notes.find(n=>n.title==='Browser note').id&&r.clientId==='demo-1').length") == 2
    noteid=page.evaluate("state.notes.find(n=>n.title==='Browser note').id")
    page.locator(f'[data-action="edit:notes:{noteid}"]').click()
    page.locator('#wsFiles').set_input_files({'name':'extra.txt','mimeType':'text/plain','buffer':b'extra'});page.locator('#editorSave').click()
    page.wait_for_function('state.resources.length===3')
    module('forms');page.locator('[data-action="new:forms"]').first.click();page.locator('#field-title').fill('Browser form')
    page.locator('#wsFiles').set_input_files({'name':'check.txt','mimeType':'text/plain','buffer':b'form'});page.locator('#editorSave').click()
    page.wait_for_function("state.forms.some(n=>n.title==='Browser form')")
    assert page.evaluate("state.resources.some(r=>r.formId===state.forms.find(n=>n.title==='Browser form').id&&r.clientId==='demo-1')")
    formid=page.evaluate("state.forms.find(n=>n.title==='Browser form').id")
    page.locator(f'[data-action="edit:forms:{formid}"]').click();page.locator('#wsFiles').set_input_files({'name':'second.txt','mimeType':'text/plain','buffer':b'form2'});page.locator('#editorSave').click()
    page.wait_for_function('state.resources.length===5')
    print('PASS: note/form create and edit with multiple/linked attachments, same client IDs')
    module('resources');print('Testing replacement',flush=True);rid=page.evaluate("state.resources.find(r=>r.filename==='notes.txt').id")
    page.locator(f'[data-action="edit:resources:{rid}"]').click();page.locator('#field-file').set_input_files({'name':'replacement.txt','mimeType':'text/plain','buffer':b'replaced'});page.locator('#editorSave').click()
    page.wait_for_function("state.resources.some(r=>r.filename==='replacement.txt')");print('Replacement saved',alerts,flush=True)
    assert page.evaluate(f"state.resources.find(r=>r.id==='{rid}').noteId") == noteid
    page.locator('[data-action="new:resources"]').first.click();page.locator('#field-title').fill('Nutrition link');page.locator('#field-url').fill('https://example.com/nutrition');page.locator('#editorSave').click();page.wait_for_function("state.resources.some(r=>r.title==='Nutrition link')");print('Link saved',alerts,flush=True)
    assert page.locator('a[href="https://example.com/nutrition"]').count()==1
    print('PASS: resource replacement preserves ID and parent; safe link-only resource')
    module('calendar');page.locator('[data-action="new:events"]').first.click();page.locator('#field-title').fill('Workspace appointment');page.locator('#field-time').fill('11:00');page.locator('#editorSave').click();page.wait_for_function("state.events.some(e=>e.title==='Workspace appointment')")
    assert page.evaluate("state.events.find(e=>e.title==='Workspace appointment').clientId")=='demo-1'
    page.evaluate("workspaceGlobal('Client calendar')");assert page.evaluate("calendarItems(true).filter(e=>e.title==='Workspace appointment').length") == 1
    assert page.locator('#view').get_by_text('Workspace appointment',exact=True).count()>=1
    page.evaluate("workspaceGlobal('Journey forms')");assert 'Browser form' in page.locator('#view').inner_text()
    page.evaluate("workspaceNavigate('demo-1','forms')")
    page.locator('#wsClientSearch').fill('Jordan');page.locator('#wsClientSwitch').select_option('demo-2');assert page.evaluate('clientId')=='demo-2';assert 'Browser form' not in page.locator('#view').inner_text()
    page.go_back();page.wait_for_function("clientId==='demo-1'&&workspaceModule==='forms'")
    page.evaluate("workspaceModule='';workspaceRouteRead=false;render()")
    assert page.evaluate("clientId==='demo-1'&&workspaceModule==='forms'")
    print('PASS: master calendar/forms share records; client switch, browser back, simulated route restoration')
    module('notes');page.locator(f'[data-action="edit:notes:{noteid}"]').click();page.locator('#editorDelete').click();page.wait_for_function(f"!state.notes.some(n=>n.id==='{noteid}')")
    assert page.evaluate(f"state.resources.find(r=>r.id==='{rid}').noteId") == ''
    assert len(alerts)==1 and 'retained' in alerts[0];alerts.clear()
    print('PASS: deleting note preserves linked files, clears association')
    module('forms');page.locator('[data-action="new:forms"]').first.click();page.locator('#field-title').fill('Invalid attachment test');page.locator('#wsFiles').set_input_files({'name':'unsafe.html','mimeType':'text/html','buffer':b'<html>unsafe</html>'});page.locator('#editorSave').click();page.wait_for_timeout(150)
    assert not page.evaluate("state.forms.some(f=>f.title==='Invalid attachment test')")
    assert alerts and 'Unsupported' in alerts[-1];alerts.clear();page.locator('#editorClose').click()
    print('PASS: unsupported file rejects entire save, no partial parent record')
    # Add real PNGs through a saved form, then use the shared gallery and preview.
    page.locator(f'[data-action="edit:forms:{formid}"]').click()
    png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB6sAAAAASUVORK5CYII=')
    page.locator('#wsFiles').set_input_files([{'name':'first.png','mimeType':'image/png','buffer':png},{'name':'second.png','mimeType':'image/png','buffer':png}]);page.locator('#editorSave').click()
    page.wait_for_function("state.resources.filter(r=>r.mime==='image/png').length===2")
    module('photos');ids=page.evaluate("state.resources.filter(r=>r.mime==='image/png').map(r=>r.id)")
    for img_id in ids: page.locator(f'[data-action="wsCompare:{img_id}"]').click()
    assert page.locator('.ws-compare img').count()==2
    page.locator(f'[data-action="preview:{ids[0]}"]').click();assert page.locator('#previewDialog').is_visible();page.locator('#previewClose').click()
    assert page.locator(f'[data-action="cloudUpload:{ids[0]}:resource"]').count()==1
    print('PASS: image attachments appear in gallery; compare and local preview; manual cloud action visible')

    # Test enlarged text and dark mode with the actual existing controls.
    page.locator('#themeToggle').click();assert page.evaluate("document.body.dataset.theme==='dark'")
    page.locator('#textSizeToggle').click()
    for _ in range(4): page.locator('#sizePlus').click()
    page.locator('#sizeDone').click();assert page.evaluate("document.documentElement.hasAttribute('data-crm-large')")
    module('overview');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    print('PASS: dark mode and 200% text accessibility, mobile overview')
    # No live browser reload or real vault sign-in: about:blank is restricted by host policy.
    assert not errors,errors;assert not alerts,alerts
    assert not any('/api/' in u or 'googleapis.com' in u or 'cloudinary.com' in u for u in outbound),outbound
    print('PASS: no JavaScript errors; no live service requests. Simulated persistence only.')
    browser.close()
