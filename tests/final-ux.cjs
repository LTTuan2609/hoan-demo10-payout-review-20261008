const {chromium}=require('playwright-core');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 let p=new URL(req.url,'http://x').pathname;if(p==='/')p='/index.html';
 const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 try{res.writeHead(200,{'Content-Type':{'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.ttf':'font/ttf'}[path.extname(f)]||'text/plain'});res.end(fs.readFileSync(f))}
 catch{res.writeHead(404);res.end()}
});
(async()=>{let browser;try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const base='http://127.0.0.1:'+server.address().port+'/#';
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--no-sandbox']});
 for(const width of [320,375,390,430]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const target of ['.quick-main','.round-arrow','.quick-pending-item:first-child','.quick-pending-item:last-child']){
   await page.goto(base+'/',{waitUntil:'networkidle'});
   assert.equal(await page.locator('.overview-heading a').count(),0,'Duplicate Xem ví');
   assert.equal(await page.locator('.quick-wallet').evaluate(e=>e.tagName==='A'&&e.getAttribute('href')==='#/wallet'&&e.querySelectorAll('a,button').length===0),true,'Card must be one semantic link');
   await page.locator(target).click();
   assert.equal(new URL(page.url()).hash,'#/wallet','Each cashback region must open Wallet');
  }
  await page.goto(base+'/withdrawals',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.wh-preview-switch').count(),0,'No preview switch in main');
  assert.equal(await page.locator('.wh-card').count(),1,'Only recorded W0 withdrawal expected');
  assert.ok((await page.locator('.wh-card').innerText()).includes('Đã chuyển'),'Real W0 status');
  assert.equal(await page.locator('main').innerText().then(s=>s.includes('SIM-REJECTED')),false,'Mock withdrawal leaked');
  const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,screen:innerWidth}));
  assert.ok(size.scroll<=size.screen+1,'Horizontal overflow '+width+' '+JSON.stringify(size));
  await page.locator('[data-action=history-filter][data-status=PENDING]').click();
  assert.equal(await page.locator('.wh-card').count(),0,'No pending withdrawals yet');
  await page.goto(base+'/withdrawals/pending',{waitUntil:'networkidle'});
  assert.equal(await page.locator('main h1').innerText(),'Tiền đang rút');
  assert.equal(await page.locator('.wh-card').count(),0);
  await page.goto(base+'/wallet',{waitUntil:'networkidle'});
  assert.ok((await page.locator('main').innerText()).includes('156.400 ₫'),'Balance must remain original');
  assert.deepEqual(errors,[],'JS errors '+width);
  console.log('PASS UX '+width+'px: four card targets → Ví, actual history, filters, pending, wallet invariant, no overflow');
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/withdraw',{waitUntil:'networkidle'});
 await page.locator('#amount').fill('50.000');
 await page.locator('form[data-form=amount] button.primary').click();
 assert.equal(new URL(page.url()).hash,'#/withdraw/review');
 await page.locator('[data-action=withdraw]').click();
 await page.waitForURL(/#\/withdraw\/result\//,{timeout:10000});
 await page.goto(base+'/withdrawals/pending',{waitUntil:'networkidle'});
 assert.equal(await page.locator('.wh-card--pending').count(),1,'Pending request must be recorded');
 assert.ok((await page.locator('.wh-card--pending').innerText()).includes('50.000 ₫'));
 await page.locator('[data-action=review]').click();
 await page.locator('[data-action=reject]').click();
 await page.goto(base+'/withdrawals',{waitUntil:'networkidle'});
 await page.locator('[data-action=history-filter][data-status=REJECTED]').click();
 assert.equal(await page.locator('.wh-card--refunded').count(),1);
 const refunded=await page.locator('.wh-card--refunded').innerText();
 assert.ok(refunded.includes('+50.000 ₫')&&refunded.includes('Đã hoàn tiền về Ví'));
 assert.ok(!refunded.includes('chưa hợp lệ'),'No fabricated account-validation rejection');
 await page.locator('.wh-card__cta').click();
 assert.ok((await page.locator('main').innerText()).includes('Đã hoàn tiền về Ví'));
 await page.goto(base+'/wallet',{waitUntil:'networkidle'});
 assert.ok((await page.locator('main').innerText()).includes('156.400 ₫'),'Refund restored available balance');
 assert.deepEqual(errors,[]);
 console.log('PASS UX withdrawal: pending → operator rejection → refunded history + restored Wallet');
 console.log('FINAL_UX_REGRESSION_PASSED');
}catch(e){console.error('FINAL_UX_FAIL',e.stack||e);process.exitCode=1}finally{await browser?.close();await new Promise(done=>server.close(done))}})();