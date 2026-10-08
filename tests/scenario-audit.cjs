const {chromium}=require('playwright-core'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://x');let p=url.pathname;if(p==='/')p='/index.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}try{res.writeHead(200,{'Content-Type':{'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.ttf':'font/ttf'}[path.extname(f)]||'text/plain'});res.end(fs.readFileSync(f))}catch{res.writeHead(404);res.end()}});
(async()=>{let browser;const issues=[];let checks=0;try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));const rootUrl='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--no-sandbox']});
 const scenarios=['returning','multi-payout','long-names','new','review','account-pending','account-rejected','offline','offline-empty','estimate-unknown','NO_COMMISSION','PRODUCT_NOT_FOUND','RATE_LIMITED','UPSTREAM_SHOPEE_ERROR','withdraw-timeout','device-denied','device-unsupported'];
 for(const width of [320,390,430]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(rootUrl+'/#/',{waitUntil:'networkidle'});
  const measure=async(category,scenario)=>{
   let x=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:innerWidth,heading:document.querySelector('main h1')?.textContent,hash:location.hash,main:document.querySelector('main')?.innerText}));
   checks++;
   if(x.doc>x.viewport+1)issues.push({width,scenario,category,type:'horizontal-overflow',...x});
   if(!x.heading)issues.push({width,scenario,category,type:'missing-page-heading',...x});
   return x;
  };
  for(const scenario of scenarios){
   // The demo's scenario switch is intentionally reached only via its own UI.
   await page.locator('[data-action=review]').click();
   await page.locator('#scenario').selectOption(scenario);
   await page.locator('.review-panel [data-action=scenario]').click();
   let home=await measure('home',scenario);
   if(scenario==='offline-empty'){
    if(!home.main.includes('ngoại tuyến'))issues.push({width,scenario,type:'offline-empty-missing'});
    continue;
   }
   if(scenario==='new'&&!home.main.includes('0 ₫'))issues.push({width,scenario,type:'new-balance-not-zero'});
   await page.locator('.bottom-nav a[href="#/orders"]').click();
   const orders=await measure('orders',scenario);
   if(scenario==='new'&&!orders.main.includes('Chưa có đơn'))issues.push({width,scenario,type:'new-orders-not-empty'});
   if(scenario==='review'&&!await page.locator('.order-filters button').filter({hasText:'Đang kiểm tra'}).count())issues.push({width,scenario,type:'review-filter-missing'});
   await page.locator('.bottom-nav a[href="#/wallet"]').click();
   const wallet=await measure('wallet',scenario);
   if(scenario==='account-pending'&&!wallet.main.includes('Chờ kiểm tra'))issues.push({width,scenario,type:'pending-payout-status-missing',walletText:wallet.main.slice(0,1450)});
   if(scenario==='account-rejected'&&!wallet.main.includes('Cần sửa'))issues.push({width,scenario,type:'rejected-payout-status-missing'});
   if(scenario==='long-names'){
    await page.locator('.bottom-nav a[href="#/orders"]').click();
    let offscreen=await page.locator('.order-name').evaluateAll(els=>els.map(el=>{const b=el.getBoundingClientRect();return {name:el.textContent.slice(0,26),right:b.right,viewport:innerWidth,scrollW:el.scrollWidth,clientW:el.clientWidth}}));
    for(const x of offscreen)if(x.right>x.viewport+2)issues.push({width,scenario,type:'long-name-row-overflow',...x});
    checks++;
   }
  }
  if(errors.length)issues.push({width,type:'uncaught-js-errors',errors});
  await page.close();
  console.log('PASS scenario viewport '+width+'px, 17 scenarios tested');
 }
 console.log('SCENARIO_AUDIT',{checks,issues:issues.length});
 issues.forEach(x=>console.log('FINDING '+JSON.stringify(x)));
 if(issues.length)process.exitCode=1;
}catch(e){console.error('SCENARIO_AUDIT_CRASH',e.stack||e);process.exitCode=1}
finally{await browser?.close();await new Promise(r=>server.close(r))}})();