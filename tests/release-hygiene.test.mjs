import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');

test('no simulated withdrawal records, fake bank-rejection reason or preview controls',()=>{
 const history=read('js/withdraw-history.mjs');
 assert.doesNotMatch(history,/SIM-(?:PAID|PENDING|REJECTED)|getWithdrawalPreview|historyMode|Minh họa 3 trạng thái/);
 assert.match(history,/Array\.isArray\(s\.withdrawals\)/);
 assert.match(history,/Đã hoàn tiền về Ví/);
 assert.doesNotMatch(history,/Thông tin tài khoản nhận tiền chưa hợp lệ/);
 assert.equal(existsSync(join(root,'js/withdraw-history-simulation.mjs')),false);
});

test('cashback card has exactly one Wallet link and no redundant View Wallet',()=>{
 const overview=read('js/overview.mjs');
 const start=overview.indexOf('export function moneyOverview(');
 const end=overview.indexOf('\nfunction result(',start);
 assert.ok(start>=0&&end>start,'Expected cashback component boundaries');
 const component=overview.slice(start,end);
 assert.match(component,/<a class="quick-wallet quick-wallet-link" href="#\/wallet"/);
 assert.equal((component.match(/<a\b/g)||[]).length,1,'One clickable link only');
 assert.equal((component.match(/<\/a>/g)||[]).length,1);
 assert.doesNotMatch(overview,/Tiền hoàn của bạn<\/h1><a/);
});

test('all locally referenced entry assets and static JavaScript imports exist',()=>{
 const html=read('index.html');
 const assets=[...html.matchAll(/(?:href|src)="((?:css|js|assets)\/[^"]+)"/g)].map(m=>m[1].split('?')[0]);
 assert.ok(assets.length>=12,'Expected CSS, font and entry script');
 for(const asset of assets)assert.ok(existsSync(join(root,asset)),`Missing entry asset: ${asset}`);
 const modules=['adapter','app','earnings','fixtures','link-controller','overview','payout-card','payout-preferences','rank-view','router','screens','store','ui','withdraw-history'];
 for(const mod of modules){
  const file=join(root,'js',mod+'.mjs');
  assert.ok(existsSync(file),`Missing module: ${mod}`);
  const code=readFileSync(file,'utf8');
  for(const [,relative] of code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)){
   if(!relative.startsWith('.'))continue;
   const target=relative.split('?')[0];
   assert.ok(existsSync(resolve(dirname(file),target)),`Missing imported module in ${mod}: ${target}`);
  }
 }
});

test('approved order layout, receiving-account card and reduced motion remain intact',()=>{
 const order=read('css/order-spacing-approved.css');
 const premium=read('css/premium-finishing-stage3.css');
 const historyCSS=read('css/withdraw-history.css');
 const overview=read('js/overview.mjs');
 const app=read('js/app.mjs');
 assert.match(order,/min-height:\s*116px/);
 assert.match(premium,/payout-bank-card--detail/);
 assert.match(historyCSS,/quick-wallet-link:focus-visible/);
 assert.match(overview,/payoutWalletCard/);
 assert.match(app,/prefers-reduced-motion: reduce/);
 assert.doesNotMatch(app,/startViewTransition|motion-stage3m/);
 assert.equal(existsSync(join(root,'js/motion.mjs')),false);
});

test('main entry excludes abandoned Stage 2/3M and uses audited QA routes',()=>{
 const html=read('index.html');
 const screens=read('js/screens.mjs');
 assert.doesNotMatch(html,/withdraw-history-simulation|motion-stage3m/);
 assert.match(html,/css\/withdraw-history\.css/);
 assert.match(screens,/withdrawalHistoryScreen/);
 assert.ok(existsSync(join(root,'tests/business.test.mjs')));
 assert.ok(existsSync(join(root,'tests/final-ux.cjs')));
});
