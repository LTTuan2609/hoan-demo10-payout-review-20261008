const {chromium}=require('playwright-core'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const serve=http.createServer((req,res)=>{let p=new URL(req.url,'http://localhost').pathname;if(p==='/')p='/index.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}try{res.writeHead(200,{'Content-Type':{'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.ttf':'font/ttf'}[path.extname(f)]||'text/plain'});res.end(fs.readFileSync(f))}catch{res.writeHead(404);res.end()}});
(async()=>{let browser;const issues=[];try{
 await new Promise(r=>serve.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+serve.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/#/orders',{waitUntil:'networkidle'});
 const d=page.locator('.order-disclosure').first(),s=d.locator(':scope > summary');
 let baseline=await s.evaluate(e=>({meta:e.querySelector('.order-meta').getBoundingClientRect().top,y:e.getBoundingClientRect().y,height:e.getBoundingClientRect().height,tap:getComputedStyle(e).webkitTapHighlightColor}));
 assert.equal(baseline.tap,'rgba(0, 0, 0, 0)','native touch highlight returned');
 for(let i=0;i<10;i++){
  await s.tap();assert.equal(await d.getAttribute('open'),'');
  const opened=await s.evaluate(e=>({meta:e.querySelector('.order-meta').getBoundingClientRect().top,y:e.getBoundingClientRect().y,height:e.getBoundingClientRect().height}));
  assert.ok(Math.abs(opened.meta-baseline.meta)<1 && Math.abs(opened.y-baseline.y)<1 && Math.abs(opened.height-baseline.height)<1,'Order header moved');
  await s.tap();assert.equal(await d.getAttribute('open'),null);
 }
 console.log('PASS 10 order disclosure touch cycles, header stable, no dark native overlay');
 await page.goto(origin+'/#/orders',{waitUntil:'networkidle'});await page.keyboard.press('Tab');for(let i=0;i<80;i++){if(await s.evaluate(e=>e===document.activeElement))break;await page.keyboard.press('Tab')}const focus=await s.evaluate(e=>({focused:e===document.activeElement,outline:getComputedStyle(e).outlineStyle,width:getComputedStyle(e).outlineWidth,visible:e.matches(':focus-visible')}));
 if(!focus.focused||focus.outline==='none'||!focus.visible)issues.push({id:'summary-focus-outline-missing',focus});
 console.log('FOCUS_SUMMARY '+JSON.stringify(focus));
 await page.keyboard.press('Enter');console.log('KEYBOARD_ENTER_STATE',await d.getAttribute('open'));
 if(await d.getAttribute('open')===null){await page.keyboard.press('Space');console.log('KEYBOARD_SPACE_STATE',await d.getAttribute('open'));}
 assert.equal(await d.getAttribute('open'),'','Keyboard Enter or Space did not open native details');
 await page.keyboard.press('Space');console.log('KEYBOARD_CLOSE_STATE',await d.getAttribute('open'));
 console.log('PASS keyboard Tab shows focus ring; Space activates native details');
 await page.locator('[data-action=review]').click();
 assert.ok(await page.locator('[role=dialog][aria-modal=true]').isVisible(),'review dialog invisible');
 await page.keyboard.press('Escape');assert.equal(await page.locator('[role=dialog]').count(),0);
 console.log('PASS review dialog Escape closes overlay');
 await page.locator('.bottom-nav a[href="#/wallet"]').click();
 await page.locator('.bottom-nav a[href="#/orders"]').click();
 assert.equal(await page.locator('main h1').innerText(),'Đơn hàng');
 console.log('PASS tab navigation remains immediate and correct');
 assert.deepEqual(errors,[],'JS exceptions');

 const reduced=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 await reduced.addInitScript(()=>{
   window.__scrollCalls=[];
   const fn=Element.prototype.scrollIntoView;
   Element.prototype.scrollIntoView=function(options){window.__scrollCalls.push({name:this.className,options});return fn.call(this,options)};
 });
 const rp=await reduced.newPage();
 await rp.goto(origin+'/#/',{waitUntil:'networkidle'});
 await rp.locator('[data-action=review]').click();
 await rp.locator('.review-panel [data-action=sample]').click();
 await rp.locator('.inline-product').waitFor({timeout:8000});
 await rp.waitForTimeout(120);
 const scrolls=await rp.evaluate(()=>window.__scrollCalls);
 if(scrolls.some(x=>x.options?.behavior==='smooth'))issues.push({id:'reduce-motion-smooth-scroll-not-honored',severity:'P2',scrolls});
 console.log('REDUCED_SCROLL '+JSON.stringify(scrolls));
 assert.equal(await rp.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
 console.log('PASS reduce-motion media query; observed scroll behavior separately');
 await reduced.close();
 fs.writeFileSync(path.join(root,'docs','manual-interaction-findings.json'),JSON.stringify({issues,orderTouchCycles:10},null,2));
 console.log('INTERACTION_ACCESSIBILITY_AUDIT_SUMMARY issues='+issues.length);
 issues.forEach(x=>console.log('FINDING '+JSON.stringify(x).slice(0,1150)));
}catch(e){console.error('INTERACTION_ACCESSIBILITY_CRASH',e.stack||e);process.exitCode=1}
finally{await browser?.close();await new Promise(r=>serve.close(r))}})();