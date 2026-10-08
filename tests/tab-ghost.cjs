const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 let p=new URL(req.url,'http://local').pathname;if(p==='/')p='/index.html';
 const fn=path.resolve(root,'.'+p);
 if(!fn.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 try{res.writeHead(200,{'Content-Type':{'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.ttf':'font/ttf'}[path.extname(fn)]||'text/plain'});res.end(fs.readFileSync(fn))}catch{res.writeHead(404);res.end()}
});
(async()=>{let browser;try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/#/wallet',{waitUntil:'networkidle'});
 await page.evaluate(()=>{window.__n=0;let native=document.startViewTransition?.bind(document);if(native)document.startViewTransition=(...a)=>{window.__n++;return native(...a)}});
 const routes=[['/orders','Đơn hàng'],['/wallet','Ví của bạn'],['/account','Tài khoản'],['/','Tiền hoàn của bạn'],['/orders','Đơn hàng'],['/wallet','Ví của bạn'],['/','Tiền hoàn của bạn'],['/account','Tài khoản']];
 const durations=[];
 for(const [route,heading] of routes){
  const r=await page.evaluate(route=>{
   const el=document.querySelector('.bottom-nav a[href="#'+route+'"]');
   if(!el)throw Error('Route tab not found '+route);
   const before=performance.now();
   el.click();
   const now=performance.now();
   return {ms:now-before,hash:location.hash,heading:document.querySelector('main h1')?.textContent?.trim(),native:window.__n,oldPseudo:getComputedStyle(document.documentElement,'::view-transition-old(polish-content)').animationName,newPseudo:getComputedStyle(document.documentElement,'::view-transition-new(polish-content)').animationName};
  },route);
  assert.equal(r.hash,'#'+route);
  assert.equal(r.heading,heading,JSON.stringify(r));
  assert.equal(r.native,0);
  assert.equal(r.oldPseudo,'none',JSON.stringify(r));
  assert.equal(r.newPseudo,'none',JSON.stringify(r));
  durations.push(r.ms);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: 8 consecutive tab changes synchronized DOM and URL without old-frame snapshots');
 console.log('PASS: native View Transitions API never called');
 console.log('PASS: no old/new view-transition ghost layers');
 console.log('NAVIGATION_MS: '+durations.map(x=>x.toFixed(2)).join(', '));
 console.log('PASS: no runtime errors');
}catch(e){console.error('FAIL:',e.stack||e);process.exitCode=1}finally{await browser?.close();await new Promise(done=>server.close(done))}})();