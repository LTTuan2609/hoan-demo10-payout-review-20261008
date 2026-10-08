export function createStore(initial){
 let generation=0;let state=structuredClone(initial);const listeners=new Set();
 return {getGeneration:()=>generation,getState:()=>structuredClone(state),subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},dispatch(a){
  const s=structuredClone(state);let result={ok:true};const at=a.at||'2026-10-07T04:00:00Z';
  switch(a.type){
   case 'RESET':generation++;state=structuredClone(a.state);listeners.forEach(fn=>fn());return result;
   case 'ADD_LINK':s.links.unshift(a.link);break;
   case 'SAVE_PAYOUT_ACCOUNT':{
    const list=s.payoutAccounts||(s.payoutAccount?[{...s.payoutAccount,id:s.payoutAccount.id||'demo-default'}]:[]);
    const match=list.find(x=>x.fingerprint===a.account.fingerprint&&x.fingerprint);
    if(match&&match.status!=='REJECTED'){result.accountId=match.id;s.payoutAccounts=list;break;}
    if(match){
     Object.assign(match,{...a.account,id:match.id,status:'PENDING_VERIFICATION',verification_note:null,updated_at:at,history:[{at,action:'Đã lưu lại thông tin'},...(match.history||[])]});
     result.accountId=match.id;
    }else{
     const next={...a.account,id:a.account.id||'payout-'+crypto.randomUUID(),status:'PENDING_VERIFICATION',verification_note:null,updated_at:at,history:[{at,action:'Đã thêm tài khoản'}]};
     list.push(next);result.accountId=next.id;
    }
    s.payoutAccounts=list;
    if(!s.payoutAccount||!list.some(x=>x.id===s.activePayoutId)){
     s.activePayoutId=result.accountId;s.payoutAccount=list.find(x=>x.id===result.accountId);
    }else s.payoutAccount=list.find(x=>x.id===s.activePayoutId)||s.payoutAccount;
    break;
   }
   case 'SELECT_PAYOUT_ACCOUNT':{
    const account=(s.payoutAccounts||[]).find(x=>x.id===a.id);
    if(!account)return {ok:false,error:'PAYOUT_ACCOUNT_REQUIRED'};
    if(account.status!=='VERIFIED')return {ok:false,error:'PAYOUT_ACCOUNT_UNVERIFIED'};
    s.activePayoutId=account.id;s.payoutAccount=account;break;
   }
   case 'REMOVE_PAYOUT_ACCOUNT':{
    const list=s.payoutAccounts||[];
    if(!list.some(x=>x.id===a.id))return {ok:false,error:'PAYOUT_ACCOUNT_REQUIRED'};
    s.payoutAccounts=list.filter(x=>x.id!==a.id);
    if(s.activePayoutId===a.id){const fallback=s.payoutAccounts.find(x=>x.status==='VERIFIED')||s.payoutAccounts[0]||null;s.activePayoutId=fallback?.id||null;s.payoutAccount=fallback;}
    break;
   }
   case 'VERIFY_ACCOUNT':{
    const list=s.payoutAccounts||(s.payoutAccount?[{...s.payoutAccount,id:s.payoutAccount.id||'demo-default'}]:[]);
    const account=list.find(x=>x.id===(a.id||s.activePayoutId||s.payoutAccount?.id));
    if(!account)return {ok:false,error:'PAYOUT_ACCOUNT_REQUIRED'};
    account.status='VERIFIED';account.verification_note=null;account.history??=[];account.history.unshift({at,action:'Đã xác minh (mô phỏng)'});
    s.payoutAccounts=list;if(s.activePayoutId===account.id||!s.payoutAccount)s.payoutAccount=account;
    break;
   }
   case 'REQUEST_WITHDRAWAL':{
    if(!s.user.signedIn)return {ok:false,error:'UNAUTHORIZED'};
    if(!s.network.online)return {ok:false,error:'OFFLINE'};
    const existing=s.withdrawals.find(w=>w.id===a.id);if(existing)return existing.amount===a.amount?{ok:true,withdrawal:structuredClone(existing),replayed:true}:{ok:false,error:'IDEMPOTENCY_CONFLICT'};
    if(!s.payoutAccount)return {ok:false,error:'PAYOUT_ACCOUNT_REQUIRED'};
    if(s.payoutAccount.status!=='VERIFIED')return {ok:false,error:'PAYOUT_ACCOUNT_UNVERIFIED'};
    if(!Number.isSafeInteger(a.amount)||a.amount<=0)return {ok:false,error:'INVALID_AMOUNT'};
    if(a.amount<s.settings.min_withdraw)return {ok:false,error:'MIN_WITHDRAWAL_ERROR'};
    if(a.amount>s.wallet.available)return {ok:false,error:'BALANCE_INSUFFICIENT'};
    s.wallet.available-=a.amount;s.wallet.withdrawing+=a.amount;s.wallet.updated_at=at;
    const acc=s.payoutAccount;const w={id:a.id,amount:a.amount,method:acc.method,account_masked:acc.account_masked.account_number||acc.account_masked.momo_phone,status:'PENDING',note:null,created_at:at,paid_at:null};
    s.withdrawals.unshift(w);s.ledger.push({id:'ledger-'+a.id,withdrawal_id:a.id,type:'WITHDRAW',delta:-a.amount,note:`Rút ${acc.method==='MOMO'?'MoMo':'ngân hàng'} — chờ quản trị duyệt`,date:at,balance_after:s.wallet.available});result={ok:true,withdrawal:w};break;
   }
   case 'RESOLVE_WITHDRAWAL':{
    const w=s.withdrawals.find(x=>x.id===a.id);if(!w||w.status!=='PENDING')return {ok:false,error:'ALREADY_PROCESSED'};
    if(!['PAID','REJECTED'].includes(a.status))return {ok:false,error:'INVALID_STATUS'};
    w.status=a.status;s.wallet.withdrawing-=w.amount;
    if(a.status==='PAID'){s.wallet.withdrawn+=w.amount;w.paid_at=at;w.note='Đã chuyển tiền (mô phỏng)';}
    else{s.wallet.available+=w.amount;w.note='Yêu cầu bị từ chối (mô phỏng). Tiền đã được hoàn lại ví.';s.ledger.push({id:'refund-'+w.id,withdrawal_id:w.id,type:'ADJUSTMENT',delta:w.amount,note:'Hoàn lại yêu cầu rút #'+w.id,date:at,balance_after:s.wallet.available});}
    break;
   }
   case 'CLAIM_INVITE':if(s.invite.claimed)return {ok:true,status:'ALREADY_CLAIMED'};s.invite.claimed=true;result={ok:true,status:'CLAIMED'};break;
   case 'SET_DEVICE':s.device.enabled=a.enabled;break;
   case 'LOGIN':s.user.signedIn=true;s.snapshot=true;break;
   case 'LOGOUT':generation++;s.user.signedIn=false;s.snapshot=false;break;
   default:return {ok:false,error:'UNKNOWN_ACTION'};
  }
  state=s;listeners.forEach(fn=>fn());return structuredClone(result);
 }};
}
