export function parseWithdrawalAmount(raw){const value=String(raw).trim().replace(/[\u00a0\u202f]/g,' ');if(!/^(?:\d+|\d{1,3}([., ])\d{3}(?:\1\d{3})*)$/.test(value))return null;const amount=Number(value.replace(/[., ]/g,''));return Number.isSafeInteger(amount)&&amount>0?amount:null;}
const fail=(code,message,meta)=>Object.assign(new Error(message||code),{code,meta});
const mask=s=>'••••'+s.slice(-4);
export function createDemoAdapter(store,opts={}){
 const pause=()=>new Promise(r=>setTimeout(r,opts.delay??350));let sequence=1;
 const guard=async(generation)=>{await pause();if(generation!==store.getGeneration())throw fail('CANCELLED');requireOnline();};
 const requireOnline=()=>{const s=store.getState();if(!s.network.online)throw fail('OFFLINE','Bạn đang ngoại tuyến. Kết nối mạng để tiếp tục.');if(!s.user.signedIn)throw fail('UNAUTHORIZED','Đăng nhập để tiếp tục.');return {...s,operationGeneration:store.getGeneration()};};
 return {
  async createLink(raw,{signal}={}){const s=requireOnline();let u;try{u=new URL(raw.trim());}catch{throw fail('INVALID_SHOPEE_URL');}if(!['https:','http:'].includes(u.protocol)||!['shopee.vn','s.shopee.vn','shp.ee'].includes(u.hostname)||u.username||u.password)throw fail('INVALID_SHOPEE_URL');
   await guard(s.operationGeneration);const scenario=opts.scenario||s.scenario;
   if(['NO_COMMISSION','PRODUCT_NOT_FOUND','RATE_LIMITED','UPSTREAM_SHOPEE_ERROR'].includes(scenario))throw fail(scenario);
   if(signal?.aborted)throw fail('CANCELLED');
   const link={id:'L'+Date.now()+sequence++,short_link:'https://s.shopee.vn/demo-'+sequence,name:'Bình giữ nhiệt 500 ml · màu kem',price:249000,est_cashback:scenario==='estimate-unknown'?null:50000+50000*s.rank.bonus_pct/100,base_cashback:scenario==='estimate-unknown'?null:50000,rank_bonus:scenario==='estimate-unknown'?null:50000*s.rank.bonus_pct/100,rank_bonus_pct:s.rank.bonus_pct,bonus_rank:s.rank.bonus_rank,image:'bottle',created_at:'2026-10-07T04:00:00Z'};store.dispatch({type:'ADD_LINK',link});return link;
  },
  async getOrders(filter='ALL'){return store.getState().orders.filter(o=>{const released=o.timeline.some(t=>t.code==='RELEASED'&&t.done);return filter==='ALL'||filter==='RELEASED'&&released||filter==='VALIDATED'&&o.status==='VALIDATED'&&!released||!['RELEASED','VALIDATED'].includes(filter)&&o.status===filter;});},
  async savePayoutAccount(body){const s=requireOnline();const method=String(body.method||'').toUpperCase();const info=body.account_info||{};let fields,masked;
   if(method==='BANK'){const bank=String(info.bank_code||'').trim().toUpperCase();const n=String(info.account_number||'').replace(/\s/g,'');const name=String(info.account_holder||'').trim().replace(/\s+/g,' ').toUpperCase();if(!/^[A-Z0-9]{2,10}$/.test(bank)||!/^\d{6,20}$/.test(n)||name.length<2||name.length>120)throw fail('INVALID_PAYOUT_ACCOUNT');fields=[method,bank,n,name];masked={bank_code:bank,account_number:mask(n),account_holder:name};}
   else if(method==='MOMO'){const n=String(info.momo_phone||'').replace(/\s/g,'');if(!/^0\d{9}$/.test(n))throw fail('INVALID_PAYOUT_ACCOUNT');fields=[method,n];masked={momo_phone:mask(n)};}
   else throw fail('INVALID_PAYOUT_ACCOUNT');
   const bytes=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(fields.join('|')));const fingerprint=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');await guard(s.operationGeneration);const result=store.dispatch({type:'SAVE_PAYOUT_ACCOUNT',account:{id:'payout-'+globalThis.crypto.randomUUID(),method,fingerprint,account_masked:masked}});if(opts.autoVerifyPayout)store.dispatch({type:'VERIFY_ACCOUNT',id:result.accountId});return store.getState().payoutAccounts.find(x=>x.id===result.accountId);
  },
  async withdraw(amount,{requestId}={}){const s=requireOnline();const id=requestId||'W'+Date.now()+sequence++;await guard(s.operationGeneration);const result=store.dispatch({type:'REQUEST_WITHDRAWAL',amount:Number(amount),id});if(!result.ok)throw fail(result.error,'',{min_withdraw:s.settings.min_withdraw,available:store.getState().wallet.available});if((opts.scenario||s.scenario)==='withdraw-timeout'&&!result.replayed)throw fail('SUBMIT_UNKNOWN','',{withdrawalId:id});return result.withdrawal;},
  async claimInvite(raw){const s=requireOnline();const code=String(raw).trim().toUpperCase();if(s.invite.claimed)return {status:'ALREADY_CLAIMED'};if(code===s.invite.code)throw fail('SELF_INVITE');if(code!=='MAIABC2345')throw fail('INVALID_CODE');await guard(s.operationGeneration);return store.dispatch({type:'CLAIM_INVITE'});},
  async copyText(text){try{if(!globalThis.navigator?.clipboard?.writeText)return {ok:false,reason:'unsupported'};await navigator.clipboard.writeText(text);return {ok:true};}catch{return {ok:false,reason:'denied'};}},
  async share(data){if(!globalThis.navigator?.share)return {ok:false,reason:'unsupported'};try{await navigator.share(data);return {ok:true};}catch(e){return {ok:false,reason:e.name==='AbortError'?'cancelled':'denied'};}},
  async setDeviceNotification(enabled){const s=requireOnline();if(!s.device.supported||s.device.permission==='denied')return {ok:false,reason:s.device.supported?'denied':'unsupported'};store.dispatch({type:'SET_DEVICE',enabled});return {ok:true};}
 };
}
