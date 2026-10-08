import {esc,money,date,icon,button,top,empty} from './ui.mjs?v=10';
const rankName=r=>({DONG:'Đồng',BAC:'Bạc',VANG:'Vàng',KIMCUONG:'Kim cương'}[r]||'thành viên');
export function cashbackBreakdown(item,{estimated=true}={}){
 const total=estimated?item.est_cashback:item.cashback_amount;
 const known=Number.isFinite(total);
 const split=known&&Number.isFinite(item.base_cashback)&&Number.isFinite(item.rank_bonus)&&Math.abs(item.base_cashback+item.rank_bonus-total)<.01;
 return `<div class="earnings-breakdown"><div class="earnings-total"><div><span>${estimated?'Tổng hoàn dự kiến':'Tổng tiền hoàn'}</span>${split&&total>0?'<small>đã gồm thưởng hạng</small>':''}</div><strong>${money(total)}</strong></div>${split?`<dl><div><dt>Tiền hoàn gốc</dt><dd>${money(item.base_cashback)}</dd></div><div><dt>Thưởng hạng${item.bonus_rank?' '+esc(rankName(item.bonus_rank)):''}${Number.isFinite(item.rank_bonus_pct)?` <span>+${item.rank_bonus_pct}%</span>`:''}</dt><dd>+${money(item.rank_bonus)}</dd></div></dl>`:''}${known&&estimated?'<p class="earnings-basis">Chưa vào ví.</p>':''}${!known?'<p class="earnings-basis">Chưa có ước tính.</p>':!split?'<p class="earnings-basis">Chi tiết tiền gốc và thưởng hạng chưa được cung cấp.</p>':''}</div>`;
}
const category=e=>e.type==='INVITE_EARNING'?'INVITE':e.type==='WITHDRAW'||e.type==='ADJUSTMENT'&&e.delta>0&&e.withdrawal_id?'WITHDRAW':e.delta<0?'DEBIT':'CASHBACK';
export function ledgerGroups(entries){
 const groups=[];
 for(const e of entries){
  const last=groups.at(-1);const credit=['PAYOUT','BONUS_RANK'].includes(e.type)&&e.delta>=0;
  const merge=credit&&last?.category==='CASHBACK'&&last.parts.every(p=>['PAYOUT','BONUS_RANK'].includes(p.type))&&e.order_sn&&last.order_sn===e.order_sn&&last.date===e.date&&Math.abs(last.balance_after+e.delta-e.balance_after)<.01;
  if(merge){last.parts.push(e);last.delta+=e.delta;last.balance_after=e.balance_after;}
  else groups.push({...e,category:category(e),parts:[e]});
 }
 return groups.reverse();
}
const labels={CASHBACK:'Tiền hoàn',INVITE:'Tiền từ bạn bè',WITHDRAW:'Tiền rút',DEBIT:'Tiền trừ'};
export function ledgerRows(entries){return entries.map(e=>{
 const base=e.parts.filter(p=>p.type==='PAYOUT').reduce((n,p)=>n+p.delta,0);
 const bonus=e.parts.filter(p=>p.type==='BONUS_RANK').reduce((n,p)=>n+p.delta,0);
 const state=e.delta>0?'Đã cộng vào ví':e.category==='WITHDRAW'?'Đã chuyển sang tiền đang rút':'Đã trừ khỏi ví';
 const title=e.order_sn?`${labels[e.category]} · ${esc(e.order_sn)}`:e.category==='INVITE'&&e.source_name?`Tiền từ ${esc(e.source_name)}`:e.category==='WITHDRAW'&&e.delta>0?'Hoàn lại tiền rút':e.type==='ADJUSTMENT'&&e.delta>0?'Điều chỉnh cộng':labels[e.category];
 return `<article class="movement-row"><details class="movement-detail" data-disclosure-key="movement-${esc(e.id)}"><summary><div class="movement-heading"><h2>${title}</h2><strong class="${e.delta>0?'positive':'negative'}">${e.delta>0?'+':''}${money(e.delta)}</strong>${icon('chevron')}</div><p class="movement-status">${date(e.date)}${e.category==='WITHDRAW'&&e.delta<0?' · Chuyển sang đang rút':''}</p></summary><p>${state}</p>${bonus>0?'<p class="movement-included">Đã gồm thưởng hạng</p>':''}${e.category==='CASHBACK'?`${base>0?`<div class="summary-row"><span>Tiền hoàn gốc</span><b>${money(base)}</b></div>`:''}${bonus>0?`<div class="summary-row"><span>Thưởng hạng</span><b>+${money(bonus)}</b></div>`:''}`:''}<p class="movement-balance">Số dư sau giao dịch <b>${money(e.balance_after)}</b></p>${e.parts.map(p=>`<p>${esc(p.note)}</p>`).join('')}${e.withdrawal_id?`<a class="text-button" href="#/withdrawals/${esc(e.withdrawal_id)}">Xem yêu cầu rút tiền ${icon('chevron')}</a>`:''}</details></article>`;
 }).join('');}
export function ledgerScreen(s,v={}){
 const f=v.filter||'ALL';const all=ledgerGroups(s.ledger);const rows=all.filter(e=>f==='ALL'||e.category===f);
 return `${top('Biến động số dư')}<div class="filters order-filters" role="group" aria-label="Lọc biến động">${[['ALL','Tất cả'],...Object.entries(labels)].map(([k,t])=>button(t,'filter',`chip ${f===k?'active':''}`,`data-filter="${k}" aria-pressed="${f===k}"`)).join('')}</div><div class="card movement-list">${rows.length?ledgerRows(rows):empty('Chưa có biến động ở nhóm này','Khoản tiền chỉ xuất hiện khi số dư thay đổi.',{iconName:'wallet',actionLabel:null})}</div>`;
}
export function walletMovements(s){const rows=ledgerGroups(s.ledger).slice(0,3);return `<section class="wallet-movements"><div class="section-head"><h2>Biến động số dư</h2><a class="text-button" href="#/ledger">Xem tất cả ${icon('chevron')}</a></div><div class="card movement-list">${rows.length?ledgerRows(rows):empty('Chưa có biến động','Tiền về ví sẽ xuất hiện tại đây.',{iconName:'wallet',actionLabel:null})}</div></section>`;}
