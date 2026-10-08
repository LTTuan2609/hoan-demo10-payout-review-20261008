import test from 'node:test';
import assert from 'node:assert/strict';
import {payoutWalletCard,payoutSavedAccounts} from '../js/payout-card.mjs';
import {createFixture} from '../js/fixtures.mjs';

test('approved separate Wallet receiving-account card retains detailed bank fields',()=>{
 const s=createFixture();
 const html=payoutWalletCard(s.payoutAccount,s.payoutAccounts?.length||1);
 assert.ok(html.includes('payout-bank-card--detail'), 'approved detail card styling selector missing');
 assert.ok(html.includes('payout-detail-header'));
 assert.ok(html.includes('payout-detail-fields'));
 assert.ok(html.includes('payout-detail-field'));
 assert.ok(html.includes('Số tài khoản'));
 assert.ok(html.includes('Chủ tài khoản'));
 assert.ok(html.includes('Vietcombank'));
 assert.ok(html.includes('••••4821'));
 assert.ok(!html.includes('payout-bank-card-top'), 'regressed to the unapproved compact layout');
});

test('saved receiving account list retains explicit account number and owner rows',()=>{
 const s=createFixture();
 const html=payoutSavedAccounts(s);
 assert.ok(html.includes('payout-saved-fields'));
 assert.ok(html.includes('payout-saved-field'));
 assert.ok(html.includes('Số tài khoản'));
 assert.ok(html.includes('Chủ tài khoản'));
 assert.ok(html.includes('payout-saved-actions'));
 assert.ok(!html.includes('payout-saved-copy'), 'approved bank manager must not be collapsed');
});

test('unverified/failed/empty accounts are visibly distinct and actionable',()=>{
 const s=createFixture();
 for(const state of ['PENDING_VERIFICATION','REJECTED']){
  const account={...s.payoutAccount,status:state};
  const html=payoutWalletCard(account,1);
  assert.ok(html.includes('payout-bank-card--detail'));
  assert.ok(html.includes('payout-detail-fields'));
  assert.ok(html.includes(state==='REJECTED'?'Cần sửa':'Chờ kiểm tra'));
 }
 const empty=payoutWalletCard(null);
 assert.ok(empty.includes('Chưa có tài khoản nhận tiền'));
 assert.ok(empty.includes('href="#/payout/edit"'));
});
