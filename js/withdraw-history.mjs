/* HOÀN withdrawal history — real state only; no preview transactions. */
import {esc,money,icon,top} from './ui.mjs?v=10';

const time = value => value ? new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value)) : '';

const statuses = Object.freeze({
 PAID:{label:'Đã chuyển',icon:'check',className:'paid'},
 PENDING:{label:'Đang rút',icon:'clock',className:'pending'},
 REJECTED:{label:'Đã hoàn tiền về Ví',icon:'back',className:'refunded'}
});
const statusText=x=>statuses[x.status]||{label:'Cần kiểm tra',icon:'help',className:'pending'};
const sum=(xs,s)=>xs.filter(x=>x.status===s).reduce((a,b)=>a+b.amount,0);
const destination=x=>x.method==='MOMO'?'MoMo':x.bank_name||'Ngân hàng';
function hint(x){
 if(x.status==='PAID')return `<div class="wh-note wh-note--paid">${icon('check')}<span>${x.paid_at?'Đã chuyển vào tài khoản lúc '+time(x.paid_at):'Giao dịch đã được ghi nhận chuyển tiền thành công.'}</span></div>`;
 if(x.status==='REJECTED')return `<div class="wh-note wh-note--refunded">${icon('back')}<span><strong>+${money(x.amount)} đã hoàn lại Ví.</strong> Yêu cầu rút không được chấp nhận. Không có lý do từ chối cụ thể được xác nhận.</span></div>`;
 if(x.status==='PENDING')return `<div class="wh-note wh-note--pending">${icon('clock')}<span>Tiền đang được xử lý. Chưa có kết quả chuyển tiền cuối cùng.</span></div>`;
 return `<div class="wh-note wh-note--pending">${icon('help')}<span>Trạng thái chưa được hỗ trợ. Vui lòng kiểm tra giao dịch.</span></div>`;
}
function card(x){
 const st=statusText(x),name=destination(x);
 return `<article class="wh-card wh-card--${st.className}" aria-label="Yêu cầu ${esc(x.id)}">
  <div class="wh-card__top"><span class="wh-state wh-state--${st.className}">${icon(st.icon)}${esc(st.label)}</span><span class="wh-card__id">#${esc(x.id)}</span></div>
  <p class="wh-card__eyebrow">Số tiền rút</p>
  <strong class="wh-card__amount">${money(x.amount)}</strong>
  <div class="wh-target"><span class="wh-target__icon" aria-hidden="true">${icon(x.method==='MOMO'?'wallet':'bank')}</span><div class="wh-target__body"><span class="wh-target__label">Tài khoản nhận</span><strong>${esc(name)} · ${esc(x.account_masked)}</strong></div></div>
  ${hint(x)}
  <div class="wh-card__footer"><div class="wh-requested"><span>Yêu cầu lúc</span><strong>${time(x.created_at)}</strong></div><a class="wh-card__cta" href="#/withdrawals/${encodeURIComponent(x.id)}" aria-label="Xem chi tiết yêu cầu rút tiền ${money(x.amount)}">Chi tiết ${icon('chevron')}</a></div>
 </article>`;
}
export function withdrawalHistoryScreen(s,v={},options={}){
 const all=[...(Array.isArray(s.withdrawals)?s.withdrawals:[])].sort((a,b)=>(new Date(b.created_at).getTime()||0)-(new Date(a.created_at).getTime()||0));
 const onlyPending=Boolean(options.onlyPending);
 const selected=onlyPending?'PENDING':['ALL','PENDING','PAID','REJECTED'].includes(v.historyFilter)?v.historyFilter:'ALL';
 const rows=all.filter(x=>selected==='ALL'||x.status===selected);
 const paidCount=all.filter(x=>x.status==='PAID').length;
 const pendingCount=all.filter(x=>x.status==='PENDING').length;
 const filters=[['ALL','Tất cả'],['PENDING','Đang rút'],['PAID','Đã chuyển'],['REJECTED','Hoàn về Ví']];
 const filterBar=filters.map(([state,label])=>`<button type="button" class="wh-filter ${selected===state?'wh-filter--active':''}" data-action="history-filter" data-status="${state}" aria-pressed="${selected===state}">${label}<span>${state==='ALL'?all.length:all.filter(x=>x.status===state).length}</span></button>`).join('');
 return `${top(onlyPending?'Tiền đang rút':'Lịch sử rút tiền',onlyPending?'Những yêu cầu chưa có kết quả chuyển tiền cuối cùng.':'Số tiền, tài khoản nhận và trạng thái của từng yêu cầu.')}
 <section class="wh-history" aria-label="Theo dõi lịch sử rút tiền">
   <div class="wh-summary" aria-label="Tóm tắt lịch sử">
    <div class="wh-summary__metric"><span class="wh-summary__icon wh-summary__icon--paid">${icon('check')}</span><span class="wh-summary__label">Đã chuyển trong danh sách · ${paidCount} yêu cầu</span><strong>${money(sum(all,'PAID'))}</strong></div>
    <div class="wh-summary__metric"><span class="wh-summary__icon wh-summary__icon--pending">${icon('clock')}</span><span class="wh-summary__label">Đang rút · ${pendingCount} yêu cầu</span><strong>${money(sum(all,'PENDING'))}</strong></div>
   </div>
   ${onlyPending?'<a class="wh-card__cta" href="#/withdrawals">Xem toàn bộ lịch sử</a>':`<div class="wh-filter-section"><h2>Yêu cầu rút tiền</h2><div class="wh-filters" role="group" aria-label="Lọc yêu cầu theo trạng thái">${filterBar}</div></div>`}
   <div class="wh-list" aria-live="polite">${rows.length?rows.map(card).join(''):`<div class="wh-empty"><span>${icon('wallet')}</span><strong>${onlyPending?'Không có tiền đang rút':'Không có yêu cầu ở trạng thái này'}</strong><p>${onlyPending?'Các yêu cầu đã xử lý vẫn có trong lịch sử.':'Chọn trạng thái khác để tiếp tục theo dõi.'}</p></div>`}</div>
   <p class="wh-footnote">Các tổng chỉ tính yêu cầu đã lưu trong danh sách, không phải tổng đã rút mọi thời điểm. Tiền đang rút chưa được tính là đã chuyển.</p>
 </section>`;
}
