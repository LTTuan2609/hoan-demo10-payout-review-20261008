import {esc,icon} from './ui.mjs?v=10';

export const bankOptions=[['VCB','Vietcombank'],['TCB','Techcombank'],['ACB','ACB'],['BIDV','BIDV'],['MB','MB Bank']];
export const bankName=code=>bankOptions.find(([id])=>id===code)?.[1]||code||'Ngân hàng';

// One compact receiving-account summary; transaction details remain on /payout.
export function payoutWalletCard(account,count=account?1:0){
 const title='<div class="section-head payout-card-heading"><h2 id="wallet-payout-title">Tài khoản nhận tiền</h2>';
 const heading=title+(account?'<a class="payout-card-detail" href="#/payout" aria-label="Quản lý tài khoản nhận tiền">'+(count>1?count+' đã lưu · ':'')+'Quản lý '+icon('chevron')+'</a>':'')+'</div>';
 if(!account)return `<section class="payout-account-section" aria-labelledby="wallet-payout-title">${heading}<div class="payout-bank-card payout-bank-card--empty"><span class="payout-card-icon" aria-hidden="true">${icon('bank')}</span><div class="payout-empty-copy"><strong>Chưa có tài khoản nhận tiền</strong><p>Thêm ngân hàng hoặc MoMo để chuẩn bị rút tiền.</p></div><a class="payout-card-add" href="#/payout/edit">Thêm tài khoản ${icon('arrow')}</a></div></section>`;
 const isBank=account.method==='BANK';
 const verified=account.status==='VERIFIED',rejected=account.status==='REJECTED',pending=account.status==='PENDING_VERIFICATION';
 const state=verified?'verified':rejected?'rejected':'pending';
 const label=verified?'Đã xác minh':rejected?'Cần sửa':pending?'Chờ xác minh':'Chưa xác minh';
 const marker=verified?'check':rejected?'alert':'clock';
 const identity=account.account_masked||{};
 const institution=isBank?bankName(identity.bank_code):'MoMo';
 const number=identity.account_number||identity.momo_phone||'Chưa có số tài khoản';
 const holder=identity.account_holder;
 const action=rejected?'<a class="payout-card-fix" href="#/payout/edit">Sửa thông tin '+icon('arrow')+'</a>':'';
 const hint=rejected?'Thông tin chưa được chấp nhận.':verified?'':pending?'Đang chờ xác minh để nhận tiền rút.':'Cần xác minh trước khi nhận tiền rút.';
 return `<section class="payout-account-section" aria-labelledby="wallet-payout-title">${heading}<div class="payout-bank-card payout-bank-card--${state}"><div class="payout-bank-card-top"><span class="payout-card-icon" aria-hidden="true">${icon(isBank?'bank':'wallet')}</span><div class="payout-card-identity"><strong>${esc(institution)}</strong><span class="payout-card-number">${esc(number)}</span></div><span class="payout-card-status payout-card-status--${state}">${icon(marker)}${label}</span></div>${holder||hint||action?`<div class="payout-bank-card-footer">${holder?`<p class="payout-card-holder"><span>Chủ tài khoản</span><strong>${esc(holder)}</strong></p>`:''}${hint?`<p class="payout-card-hint">${hint}</p>`:''}${action}</div>`:''}</div></section>`;
}

export function payoutSavedAccounts(s){
 const entries=s.payoutAccounts||(s.payoutAccount?[s.payoutAccount]:[]);
 if(!entries.length)return '<div class="payout-list-empty"><p>Chưa có tài khoản nào được lưu.</p></div>';
 return '<section class="payout-saved-list" aria-label="Danh sách tài khoản nhận tiền">'+entries.map(a=>{
  const current=a.id===s.activePayoutId;
  const verified=a.status==='VERIFIED',rejected=a.status==='REJECTED';
  const state=verified?'verified':rejected?'rejected':'pending';
  const label=verified?'Đã xác minh':rejected?'Cần sửa':'Chờ xác minh';
  const info=a.account_masked||{};
  const name=a.method==='BANK'?bankName(info.bank_code):'MoMo';
  const masked=info.account_number||info.momo_phone||'••••';
  const holder=info.account_holder?' · '+esc(info.account_holder):'';
  const id=esc(a.id||'');
  return `<article class="payout-saved-item${current?' is-selected':''}"><div class="payout-saved-head"><span class="payout-card-icon" aria-hidden="true">${icon(a.method==='BANK'?'bank':'wallet')}</span><div class="payout-saved-copy"><h2>${esc(name)}</h2><p>${esc(masked)}${holder}</p></div>${current?'<span class="payout-active-label">Đang dùng</span>':''}</div><div class="payout-saved-bottom"><span class="payout-card-status payout-card-status--${state}">${icon(verified?'check':rejected?'alert':'clock')}${label}</span>${a.verification_note?`<p class="payout-saved-note">${esc(a.verification_note)}</p>`:''}<div class="payout-saved-actions">${!current&&verified?`<button type="button" class="payout-select" data-action="select-payout" data-id="${id}">Chọn tài khoản này</button>`:''}${rejected?'<a class="payout-select" href="#/payout/edit">Thêm tài khoản khác</a>':''}<button type="button" class="payout-remove" data-action="remove-payout" data-id="${id}" aria-label="Xóa tài khoản ${esc(name)} ${esc(masked)}">Xóa</button></div></div></article>`;
 }).join('')+'</section>';
}
