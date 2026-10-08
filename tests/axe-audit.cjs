const {chromium}=require('playwright-core'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),axePath=path.join(root,'node_modules','axe-core','axe.min.js');
const serve=http.createServer((req,res)=>{const url=new URL(req.url,'http://x');let p=url.pathname;if(p==='/')p='/index.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}try{res.writeHead(200,{'Content-Type':{'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.ttf':'font/ttf'}[path.extname(f)]||'text/plain'});res.end(fs.readFileSync(f))}catch{res.writeHead(404);res.end()}});
(async()=>{let browser;try{
 await new Promise(done=>serve.listen(0,'127.0.0.1',done));
 const origin='http://127.0.0.1:'+serve.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--no-sandbox']});
 const routes=['/','/orders','/wallet','/payout','/payout/edit','/withdraw','/rank','/ledger','/invite','/account','/help','/device'];
 const runs=[],findings=[],screenshots=path.join(root,'docs','screenshots');
 fs.mkdirSync(screenshots,{recursive:true});
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.on('pageerror',e=>findings.push({route:'any',width,id:'browser-uncaught',reason:e.message}));
  for(const route of routes){
   if(width===320&&!['/','/orders','/wallet','/payout/edit','/withdraw','/rank'].includes(route))continue;
   await page.goto(origin+'/#'+route,{waitUntil:'domcontentloaded',timeout:30000});
   await page.locator('main h1').waitFor({timeout:20000});
   await page.addScriptTag({path:axePath});
   const r=await page.evaluate(async()=>{const x=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return{violations:x.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,help:v.help,helpUrl:v.helpUrl,nodes:v.nodes.slice(0,5).map(n=>({target:n.target,html:n.html.slice(0,180),summary:n.failureSummary?.slice(0,500)})),nodeCount:v.nodes.length})),incomplete:x.incomplete.map(v=>({id:v.id,impact:v.impact,nodeCount:v.nodes.length})),passes:x.passes.length}});
   runs.push({width,route,violations:r.violations.length,passes:r.passes,incomplete:r.incomplete});
   for(const v of r.violations)findings.push({width,route,...v});
   console.log('AXE '+width+' '+route+' violations='+r.violations.length+' incomplete='+r.incomplete.length+' passes='+r.passes);
   if(width===390&&['/orders','/wallet','/rank','/'].includes(route))await page.screenshot({path:path.join(screenshots,(route==='/'?'home':route.slice(1))+'-390.png'),fullPage:true});
  }
  await page.close();
 }
 const report={auditedBase:'66d6b744373e77c76c0ba183f26e905fb76e41d8',tool:'axe-core 4.10.3 / Chrome emulated touch',runs,findings};
 fs.writeFileSync(path.join(root,'docs','axe-results.json'),JSON.stringify(report,null,2));
 console.log('AXE_AUDIT_SUMMARY pages='+runs.length+' distinct_violations='+[...new Set(findings.map(x=>x.id))].join(',')+' findings='+findings.length);
 findings.slice(0,23).forEach(x=>console.log('AXE_FINDING '+JSON.stringify(x).slice(0,920)));
}catch(e){console.error('AXE_AUDIT_CRASH',e.stack||e);process.exitCode=1}
finally{await browser?.close();await new Promise(done=>serve.close(done))}})();