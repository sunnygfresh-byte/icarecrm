"""Isolated Chromium UI checks. Fictional data, no live Firebase/Cloudinary; mock persistence only."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from zipfile import ZipFile
import os
html=Path('public/index.html').read_text().replace('bindVault();','/* isolated test: skip live startup */',1)
init='''() => {vaultActive=()=>true;vaultAssert=()=>{};vaultSession={};writeDB=async()=>{localVersion++};firebaseAfterSave=()=>{};fbControls=()=>{};fbSchedule=()=>{};ready=true;document.body.classList.remove('vault-locked');$('vaultGate').hidden=true;demo();}'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
    errors=[]; outbound=[]; alerts=[]
    def load(src,width):
        page=browser.new_page(viewport={'width':width,'height':844});page.set_default_timeout(6000)
        page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(alerts.append(d.message),d.accept()));page.route('**/*',lambda r:(outbound.append(r.request.url),r.abort()))
        page.set_content(src);page.evaluate(init);page.wait_for_function('state.clients.length===3');return page
    page=load(html,390)
    base=page.evaluate('JSON.stringify(state)');page.evaluate("workspaceGlobal('Contacts')");page.locator('[data-client-link="demo-1"]').first.click()
    assert page.evaluate('location.hash')=='#/clients/demo-1/hub';assert page.locator('.mobile-module-card').count()==12
    assert page.locator('.mobile-module-card svg.mobile-icon').count()==12
    for icon in page.locator('.mobile-module-card svg.mobile-icon').all():
        assert icon.is_visible() and icon.bounding_box()['width']==32
    def route(m):
        page.wait_for_function(f"workspaceModule==='{m}'")
    def hub():
        if page.locator('.mobile-back[data-action="wsHubBack"]').count(): page.locator('.mobile-back[data-action="wsHubBack"]').click();route('hub')
        else: page.evaluate("workspaceNavigate(clientId,'hub')");route('hub')
    def open_module(m):
        hub();page.locator(f'.mobile-workspace [data-action="wsModule:{m}"]').first.click();route(m)
        assert page.locator('.mobile-module-card').count()==0
        assert page.locator('.mobile-back').is_visible();assert page.locator('.mobile-dock').is_visible()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(m,page.evaluate('document.documentElement.scrollWidth'))
    for width in [320,390,768,800]:
        page.set_viewport_size({'width':width,'height':844});hub()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
        assert page.locator('.mobile-modules').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ').length") == 2
        for m in ['calendar','resources','notes','training','programs','forms','photos','progress','overview','contact','privacy','timeline']:
            open_module(m)
            if m=='programs': assert '16-week training calendar' in page.locator('.mobile-content').inner_text() and 'Exercise and session history' not in page.locator('.mobile-content').inner_text()
            if m=='training': assert 'Exercise and session history' in page.locator('.mobile-content').inner_text() and '16-week training calendar' not in page.locator('.mobile-content').inner_text()
    print('PASS: 12 dedicated modules, hub and responsive two-column grid at 320/390/768/800 px; no page overflow')
    page.set_viewport_size({'width':390,'height':844});hub();open_module('notes');page.go_back();route('hub');page.go_forward();route('notes');hub();route('hub')
    open_module('programs');page.evaluate("workspaceModule='';workspaceRouteRead=false;render()");route('programs');assert page.evaluate('clientId')=='demo-1'
    page.locator('.mobile-top summary').click();page.locator('#wsClientSearch').fill('Jordan');page.locator('#wsClientSwitch').select_option('demo-2');assert page.evaluate('clientId')=='demo-2';route('programs');page.go_back();page.wait_for_function("clientId==='demo-1'&&workspaceModule==='programs'")
    print('PASS: native Back/Forward, hub Back, client switch and simulated deep-link restoration')
    page.set_viewport_size({'width':1440,'height':1000});page.wait_for_function("document.querySelector('.ws-modules')!==null");assert '16-week training calendar' in page.locator('.ws-content').inner_text();assert page.locator('.ws-modules button').count()==11;assert page.locator('.mobile-workspace').count()==0
    page.evaluate("workspaceNavigate('demo-1','hub')");assert page.locator('.ws-modules button[aria-current=page]').inner_text()=='Overview'
    page.set_viewport_size({'width':390,'height':844});page.wait_for_function("document.querySelector('.mobile-hub')!==null");assert page.evaluate('JSON.stringify(state)')==base
    print('PASS: desktop aliases, rotation/breakpoint changes, no record mutation during navigation')
    # Use the original editor through mobile primary action and verify existing relationships.
    open_module('notes');page.locator('.mobile-dock [data-action="new:notes"]').click();page.locator('#field-title').fill('Mobile test note');page.locator('#field-body').fill('Fictional');page.locator('#wsFiles').set_input_files({'name':'note.txt','mimeType':'text/plain','buffer':b'hello'});page.locator('#editorSave').click();page.wait_for_function("state.notes.some(n=>n.title==='Mobile test note')");assert page.evaluate("state.resources.some(r=>r.noteId===state.notes.find(n=>n.title==='Mobile test note').id&&r.clientId==='demo-1')")
    open_module('forms');page.locator('.mobile-dock [data-action="new:forms"]').click();page.locator('#field-title').fill('Mobile test form');page.locator('#wsFiles').set_input_files({'name':'form.txt','mimeType':'text/plain','buffer':b'hello'});page.locator('#editorSave').click();page.wait_for_function("state.forms.some(f=>f.title==='Mobile test form')");assert page.evaluate("state.resources.some(r=>r.formId===state.forms.find(f=>f.title==='Mobile test form').id&&r.clientId==='demo-1')")
    print('PASS: real UI editors for notes and forms, attachments saved under correct fictional client')
    hub();page.locator('#themeToggle').click();assert page.evaluate("document.body.dataset.theme==='dark'");page.locator('#textSizeToggle').click()
    for _ in range(4): page.locator('#sizePlus').click()
    page.locator('#sizeDone').click();assert page.evaluate("document.documentElement.hasAttribute('data-crm-large')");assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');open_module('overview')
    assert page.locator('.mobile-dock').evaluate('e=>getComputedStyle(e).position')=='static'
    print('PASS: dark mode, 200% text sizing on hub and overview, accessible dock reflows')
    assert not errors,errors;assert not alerts,alerts;assert not any('/api/' in u or 'googleapis.com' in u or 'cloudinary.com' in u for u in outbound),outbound
    print('PASS: no JavaScript errors or live service requests; simulated storage and authentication only')
    browser.close()
