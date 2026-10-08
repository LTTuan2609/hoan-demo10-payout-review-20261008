const {chromium}=require('playwright-core');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((req,res)=>{let p=new URL(req.url,'http://x').pathname;if(p==='/')p='/index.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}try{res.writeHead(200,{'Content-Type':{'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.ttf':'font/ttf'}[path.extname(f)]||'text/plain'});res.end(fs.readFileSync(f))}catch{res.writeHead(404);res.end()}});
(async()=>{let browser;try{
 await new Promise(done=>srv.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--no-sandbox']});
 for(const width of [320,375,390,430]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:'+srv.address().port+'/#/orders',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  const results=await page.evaluate(()=>{
   const rows=[...document.querySelectorAll('.order-disclosure')];
   const take=row=>{const a=row.querySelector('.order-name'),b=row.querySelector('.order-meta'),c=row.querySelector('.order-row'),aa=a.getBoundingClientRect(),bb=b.getBoundingClientRect(),cc=c.getBoundingClientRect();return{title:a.textContent.trim(),gap:Number((bb.top-aa.bottom).toFixed(2)),h:Number(aa.height.toFixed(2)),metaY:Number(bb.top.toFixed(2)),metaRel:Number((bb.top-cc.top).toFixed(2)),rowY:Number(cc.top.toFixed(2)),rowH:Number(cc.height.toFixed(2)),clamp:getComputedStyle(a).webkitLineClamp}};
   return rows.map(row=>{row.open=false;const closed=take(row);row.open=true;const open=take(row);row.open=false;return{closed,open}});
  });
  assert.ok(results.length>=6,'Missing order rows');
  for(const [i,r] of results.entries()){
   assert.ok(r.closed.gap>=-1&&r.closed.gap<=5,'width '+width+' item '+i+' closed gap '+r.closed.gap);
   assert.ok(r.open.gap>=-1&&r.open.gap<=5,'width '+width+' item '+i+' open gap '+r.open.gap);
   assert.ok(Math.abs(r.open.gap-r.closed.gap)<1,'width '+width+' item '+i+' gap changes');
   assert.equal(r.closed.clamp,'2');
   if(Math.abs(r.closed.h-r.open.h)<1){assert.ok(Math.abs(r.open.metaRel-r.closed.metaRel)<1,'width '+width+' item '+i+' meta shifts '+JSON.stringify(r));assert.ok(Math.abs(r.open.rowH-r.closed.rowH)<1,'width '+width+' item '+i+' summary changes height '+JSON.stringify(r))}
  }
  await page.locator('.order-disclosure').first().locator(':scope > summary').click();
  assert.equal(await page.locator('.order-disclosure').first().getAttribute('open'),'');
  await page.locator('.order-disclosure').first().locator(':scope > summary').click();
  assert.equal(await page.locator('.order-disclosure').first().getAttribute('open'),null);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=1,'width '+width+': overflow '+overflow);
  console.log('PASS '+width+'px: '+results.length+' order rows no blank title gap, natural height, stable toggle');
  console.log('SAMPLES '+JSON.stringify(results.slice(0,3).map(r=>({title:r.closed.title.slice(0,34),gap:r.closed.gap,nameClosed:r.closed.h,nameOpen:r.open.h,metaShift:Number((r.open.metaY-r.closed.metaY).toFixed(1))}))));
  await page.close();
 }
 console.log('ORDER_LAYOUT_TEST_PASSED');
}catch(e){console.error('TEST_FAILURE:',e.stack||e);process.exitCode=1}
finally{await browser?.close();await new Promise(done=>srv.close(done))}})();