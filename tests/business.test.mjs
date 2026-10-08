import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixture} from '../js/fixtures.mjs';
import {createStore} from '../js/store.mjs';
import {createDemoAdapter,parseWithdrawalAmount} from '../js/adapter.mjs';
import {createLinkController,createClipboardReader} from '../js/link-controller.mjs';
import {restorePayoutPreferences,savePayoutPreferences,clearPayoutPreferences} from '../js/payout-preferences.mjs';
import {resolveRoute} from '../js/router.mjs';
import {esc,money} from '../js/ui.mjs';
const make=(scenario='returning',opts={})=>{const store=createStore(createFixture(scenario));return {store,api:createDemoAdapter(store,{delay:0,autoVerifyPayout:true,...opts})};};

test('rank bonus computed from user base rather than Shopee gross',()=>{
 const s=createFixture();const l=s.links[0];
 assert.equal(l.base_cashback,50000);assert.equal(l.rank_bonus_pct,15);
 assert.equal(l.rank_bonus,7500);assert.equal(l.est_cashback,57500);
 for(const o of s.orders.slice(0,4))assert.ok(Math.abs(o.base_cashback+o.rank_bonus-(o.cashback_amount??o.est_cashback))<.01);
});
test('generated link reflects true 50k base + 15% bonus',async()=>{
 const {store,api}=make();const l=await api.createLink('https://shopee.vn/product/123');
 assert.deepEqual([l.base_cashback,l.rank_bonus,l.est_cashback],[50000,7500,57500]);
 assert.equal(store.getState().links[0].id,l.id);
});
test('unknown cashback never invents monetary value',async()=>{
 const {api}=make('estimate-unknown');const l=await api.createLink('https://shopee.vn/p');
 assert.deepEqual([l.base_cashback,l.rank_bonus,l.est_cashback],[null,null,null]);
});
for(const raw of ['javascript:alert(1)','https://shopee.vn.evil.test/p','https://evil.test/','https://user:pass@shopee.vn/a','ftp://shopee.vn/a','not-a-url','https://s.shopee.vn.evil.com/a']){
 test('spoofed link rejected: '+raw,async()=>assert.rejects(make().api.createLink(raw),{code:'INVALID_SHOPEE_URL'}));
}
for(const raw of ['https://shopee.vn/a','https://s.shopee.vn/a','https://shp.ee/a']){
 test('allowed domain: '+raw,async()=>assert.ok((await make().api.createLink(raw)).id));
}
test('link controller drops stale async response',async()=>{
 const calls=[];const events=[];let first,second;
 const c=createLinkController({createLink:v=>new Promise(r=>{calls.push(v);if(!first)first=r;else second=r;})},{clear:()=>events.push('clear'),loading:()=>events.push('loading'),result:x=>events.push('result:'+x)},{delay:0});
 c.input('https://shopee.vn/1',{immediate:true});c.input('https://shopee.vn/2',{immediate:true});
 first('old');second('new');await new Promise(r=>setImmediate(r));
 assert.deepEqual(calls,['https://shopee.vn/1','https://shopee.vn/2']);
 assert.equal(events.includes('result:old'),false);assert.equal(events.includes('result:new'),true);
});
test('cancelled controller does not announce stale result',async()=>{
 let finish,announced=false;
 const c=createLinkController({createLink:()=>new Promise(r=>finish=r)},{result:()=>announced=true});
 c.input('https://shopee.vn/a',{immediate:true});c.cancel();finish('old');
 await new Promise(r=>setImmediate(r));assert.equal(announced,false);
});
test('clipboard reader invalidates old promise',async()=>{
 let finish;const c=createClipboardReader(()=>new Promise(r=>finish=r));
 const p=c.read();c.invalidate();finish('secret');assert.equal(await p,null);
});
for(const [input,expected] of [['50000',50000],['50.000',50000],['50 000',50000],['50,000',50000],['1.234.567',1234567],[' 50.000 ',50000],['0',null],['-2',null],['1.5',null],['50.000,5',null],['1e5',null],['50000abc',null],['90071992547409920',null],['',null]]){
 test('strict withdrawal input '+JSON.stringify(input),()=>assert.equal(parseWithdrawalAmount(input),expected));
}
test('withdrawal idempotency, no double debit and conflicting retry rejected',()=>{
 const {store}=make();
 assert.equal(store.dispatch({type:'REQUEST_WITHDRAWAL',id:'QA1',amount:50000}).ok,true);
 const w=store.getState().wallet;
 assert.deepEqual([w.available,w.withdrawing],[106400,50000]);
 const replay=store.dispatch({type:'REQUEST_WITHDRAWAL',id:'QA1',amount:50000});
 assert.equal(replay.replayed,true);assert.deepEqual(store.getState().wallet,w);
 assert.equal(store.dispatch({type:'REQUEST_WITHDRAWAL',id:'QA1',amount:60000}).error,'IDEMPOTENCY_CONFLICT');
});
test('withdrawal invalid amount and insufficient funds do not debit',()=>{
 const {store}=make();
 for(const [amount,error] of [[0,'INVALID_AMOUNT'],[-1,'INVALID_AMOUNT'],[1.5,'INVALID_AMOUNT'],[49999,'MIN_WITHDRAWAL_ERROR'],[999999,'BALANCE_INSUFFICIENT']])
  assert.equal(store.dispatch({type:'REQUEST_WITHDRAWAL',id:'W-'+amount,amount}).error,error);
 assert.equal(store.getState().wallet.available,156400);
});
test('pending withdrawal paid exactly once',()=>{
 const {store}=make();store.dispatch({type:'REQUEST_WITHDRAWAL',id:'PAY',amount:50000});
 assert.equal(store.dispatch({type:'RESOLVE_WITHDRAWAL',id:'PAY',status:'PAID'}).ok,true);
 assert.deepEqual([store.getState().wallet.available,store.getState().wallet.withdrawing,store.getState().wallet.withdrawn],[106400,0,1300000]);
 assert.equal(store.dispatch({type:'RESOLVE_WITHDRAWAL',id:'PAY',status:'PAID'}).error,'ALREADY_PROCESSED');
});
test('rejected withdrawal restored to available with one ledger adjustment',()=>{
 const {store}=make();store.dispatch({type:'REQUEST_WITHDRAWAL',id:'REJ',amount:65000});
 assert.equal(store.dispatch({type:'RESOLVE_WITHDRAWAL',id:'REJ',status:'REJECTED'}).ok,true);
 const s=store.getState();assert.deepEqual([s.wallet.available,s.wallet.withdrawing],[156400,0]);
 assert.equal(s.ledger.filter(x=>x.withdrawal_id==='REJ'&&x.delta===65000).length,1);
 assert.equal(store.dispatch({type:'RESOLVE_WITHDRAWAL',id:'REJ',status:'REJECTED'}).error,'ALREADY_PROCESSED');
});
test('unverified, offline and logged-out withdrawals are blocked',()=>{
 assert.equal(make('account-pending').store.dispatch({type:'REQUEST_WITHDRAWAL',id:'P',amount:50000}).error,'PAYOUT_ACCOUNT_UNVERIFIED');
 assert.equal(make('offline').store.dispatch({type:'REQUEST_WITHDRAWAL',id:'O',amount:50000}).error,'OFFLINE');
 const {store}=make();store.dispatch({type:'LOGOUT'});
 assert.equal(store.dispatch({type:'REQUEST_WITHDRAWAL',id:'X',amount:50000}).error,'UNAUTHORIZED');
});
test('submit unknown retry uses same id without new debit',async()=>{
 const {store,api}=make('withdraw-timeout');
 await assert.rejects(api.withdraw(50000,{requestId:'W-EX'}),{code:'SUBMIT_UNKNOWN'});
 assert.equal((await api.withdraw(50000,{requestId:'W-EX'})).id,'W-EX');
 assert.equal(store.getState().wallet.withdrawing,50000);
 assert.equal(store.getState().withdrawals.filter(x=>x.id==='W-EX').length,1);
});
test('bank information is validated then masked',async()=>{
 const {store,api}=make();
 const a=await api.savePayoutAccount({method:'BANK',account_info:{bank_code:'TCB',account_number:'0123456789',account_holder:'NGUYEN VAN A'}});
 assert.equal(a.status,'VERIFIED');assert.equal(a.account_masked.account_number,'••••6789');
 assert.equal(JSON.stringify(store.getState()).includes('0123456789'),false);
});
test('duplicate payout method has no duplicate account',async()=>{
 const {store,api}=make();const a={method:'MOMO',account_info:{momo_phone:'0901234567'}};
 await api.savePayoutAccount(a);await api.savePayoutAccount(a);
 assert.equal(store.getState().payoutAccounts.length,2);
});
test('unverified payout cannot be selected',()=>{
 const {store}=make('multi-payout');
 assert.equal(store.dispatch({type:'SELECT_PAYOUT_ACCOUNT',id:'demo-momo'}).error,'PAYOUT_ACCOUNT_UNVERIFIED');
 assert.equal(store.dispatch({type:'SELECT_PAYOUT_ACCOUNT',id:'demo-tcb'}).ok,true);
});
test('router blocks stale review or unverified payout',()=>{
 const s=createFixture();
 assert.equal(resolveRoute('/withdraw/review',s,{'/withdraw/review':{amount:49999}}),'/withdraw');
 assert.equal(resolveRoute('/withdraw/review',s,{'/withdraw/review':{amount:300000}}),'/withdraw');
 assert.equal(resolveRoute('/withdraw/review',s,{'/withdraw/review':{amount:50000}}),'/withdraw/review');
 s.payoutAccount.status='REJECTED';
 assert.equal(resolveRoute('/withdraw/review',s,{'/withdraw/review':{amount:50000}}),'/withdraw');
});
test('store clone prevents direct state tampering',()=>{
 const {store}=make();store.getState().wallet.available=123456789;
 assert.equal(store.getState().wallet.available,156400);
});
test('reset invalidates previously requested link',async()=>{
 const {store,api}=make('returning',{delay:25});
 const pending=api.createLink('https://shopee.vn/a');
 store.dispatch({type:'RESET',state:createFixture('new')});
 await assert.rejects(pending,{code:'CANCELLED'});
 assert.equal(store.getState().links.length,0);
});
test('storage persists masked payout number only',()=>{
 const state=createFixture();let saved='';
 const storage={getItem:()=>saved,setItem:(_k,v)=>{saved=v;},removeItem:()=>{saved='';}};
 savePayoutPreferences(state,storage);
 assert.equal(saved.includes('••••4821'),true);
 assert.equal(saved.includes('0123456789'),false);
 const recovered=restorePayoutPreferences(createFixture('new'),storage);
 assert.equal(recovered.payoutAccount.account_masked.account_number,'••••4821');
 clearPayoutPreferences(storage);assert.equal(saved,'');
});
test('invalid unmasked local preferences ignored',()=>{
 const storage={getItem:()=>JSON.stringify({version:1,accounts:[{id:'x',method:'BANK',status:'VERIFIED',account_masked:{account_number:'123456789',bank_code:'VCB',account_holder:'A'}}]})};
 const empty=createFixture('new');
 assert.deepEqual(restorePayoutPreferences(empty,storage),empty);
});
test('HTML text escape and unknown amount display safe',()=>{
 assert.equal(esc('<img src=x onerror="alert(1)">'),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
 assert.equal(money(null),'Đang cập nhật');
});
test('user cannot claim own invite code',async()=>{
 await assert.rejects(make().api.claimInvite('LANABC2345'),{code:'SELF_INVITE'});
});
