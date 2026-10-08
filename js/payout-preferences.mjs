// UX preview only, never a security decision or backend verification record.
const KEY='hoan-preview-payout-v1';
const statuses=new Set(['VERIFIED','PENDING_VERIFICATION','REJECTED']);
const isMasked=v=>typeof v==='string'&&/^••••[^\s]{1,4}$/.test(v);
function clean(a){
 if(!a||typeof a!=='object'||!['BANK','MOMO'].includes(a.method)||!statuses.has(a.status)||typeof a.id!=='string'||a.id.length>90)return null;
 const raw=a.account_masked||{};
 const m=a.method==='BANK'?{bank_code:String(raw.bank_code||'').slice(0,10),account_number:raw.account_number,account_holder:String(raw.account_holder||'').slice(0,120)}:{momo_phone:raw.momo_phone};
 if(!isMasked(a.method==='BANK'?m.account_number:m.momo_phone))return null;
 return {id:a.id,method:a.method,status:a.status,account_masked:m,updated_at:String(a.updated_at||''),verification_note:null,history:[]};
}
export function restorePayoutPreferences(initial,storage){
 try{
  const saved=JSON.parse(storage?.getItem(KEY)||'null');
  if(saved?.version!==1||!Array.isArray(saved.accounts)||saved.accounts.length>20)return initial;
  const accounts=saved.accounts.map(clean).filter(Boolean);
  if(!accounts.length)return initial;
  const selected=accounts.find(a=>a.id===saved.selectedId)||accounts[0];
  return {...initial,payoutAccounts:accounts,activePayoutId:selected.id,payoutAccount:selected};
 }catch{return initial;}
}
export function savePayoutPreferences(state,storage){
 try{
  const accounts=(state.payoutAccounts||[]).map(clean).filter(Boolean).slice(0,20);
  if(!accounts.length){storage?.removeItem(KEY);return;}
  storage?.setItem(KEY,JSON.stringify({version:1,selectedId:state.activePayoutId,accounts}));
 }catch{/* Storage may be unavailable. */}
}
export function clearPayoutPreferences(storage){try{storage?.removeItem(KEY)}catch{}}
