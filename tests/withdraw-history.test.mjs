import test from 'node:test';
import assert from 'node:assert/strict';
import {withdrawalHistoryScreen} from '../js/withdraw-history.mjs';
const records=[
 {id:'P',amount:50000,status:'PENDING',method:'MOMO',account_masked:'••••4567',created_at:'2026-10-05T00:00:00Z'},
 {id:'A',amount:120000,status:'PAID',method:'BANK',account_masked:'••••4821',created_at:'2026-10-04T00:00:00Z',paid_at:'2026-10-04T03:00:00Z'},
 {id:'R',amount:150000,status:'REJECTED',method:'BANK',account_masked:'••••9999',created_at:'2026-10-06T00:00:00Z'}
];
test('withdrawal history uses current records and truthful refund status',()=>{
 const html=withdrawalHistoryScreen({withdrawals:records},{});
 assert.match(html,/Đã hoàn tiền về Ví/);assert.match(html,/\+150\.000/);
 assert.ok(html.indexOf('#R')<html.indexOf('#P'));
 assert.ok(!html.includes('SIM-REJECTED')&&!html.includes('Minh họa 3 trạng thái'));
 assert.ok(!html.includes('Thông tin tài khoản nhận tiền chưa hợp lệ'));
});
test('pending-only route excludes paid and refunded transactions',()=>{
 const html=withdrawalHistoryScreen({withdrawals:records},{},{onlyPending:true});
 assert.match(html,/Tiền đang rút/);
 assert.ok(html.includes('href="#/withdrawals/P"'));
 assert.ok(!html.includes('href="#/withdrawals/A"')&&!html.includes('href="#/withdrawals/R"'));
});
test('history status chips filter correctly',()=>{
 for(const [key,id] of [['PENDING','P'],['PAID','A'],['REJECTED','R']]){
  const html=withdrawalHistoryScreen({withdrawals:records},{historyFilter:key});
  assert.ok(html.includes('href="#/withdrawals/'+id+'"'));
  for(const other of records.filter(x=>x.id!==id))assert.ok(!html.includes('href="#/withdrawals/'+other.id+'"'));
 }
});
test('empty and unexpected states do not invent successful payouts',()=>{
 assert.match(withdrawalHistoryScreen({withdrawals:[]},{}),/Không có yêu cầu/);
 const unknown=withdrawalHistoryScreen({withdrawals:[{id:'U',amount:12345,status:'UNKNOWN',method:'BANK',account_masked:'••••1234',created_at:'2026-10-05T00:00:00Z'}]},{});
 assert.match(unknown,/Cần kiểm tra/);assert.ok(!unknown.includes('Đã hoàn tiền về Ví'));
});
test('untrusted request IDs are escaped and URL encoded',()=>{
 const html=withdrawalHistoryScreen({withdrawals:[{id:'bad"><svg/onload=alert(1)>',amount:50000,status:'PENDING',method:'BANK',account_masked:'••••1234',created_at:'2026-10-05T00:00:00Z'}]},{});
 assert.ok(!html.includes('<svg/onload'));
 assert.ok(html.includes('bad&quot;&gt;'));
});
