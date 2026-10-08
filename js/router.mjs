const wizard=p=>p==='/withdraw'||p==='/withdraw/review';
export function createRouter(windowLike){
 let route=windowLike?.location.hash.slice(1)||'/',trail=[],withdrawEpoch=0,withdrawalId=null;
 const retiredWithdrawals=new Set();
 const views=new Map();
 const write=(replace=false)=>windowLike?.history[replace?'replaceState':'pushState']({hoan:true,trail:[...trail],withdrawEpoch,withdrawalId},'','#'+route);
 write(true);
 return {
  getRoute:()=>route,
  navigate(path,{replace=false,reset=false}={}){if(reset)trail=[];else if(!replace&&path!==route)trail.push(route);if(path===route&&!reset)return;route=path;if(!wizard(route))withdrawalId=null;write(replace||reset);},
  back(){if(windowLike&&trail.length){windowLike.history.back();return null;}route=trail.pop()||'/wallet';write(true);return route;},
  setWithdrawalId(id){withdrawalId=id;write(true);},
  completeWithdrawal(target,{requestId}={}){if(requestId)retiredWithdrawals.add(requestId);else{withdrawEpoch++;trail=trail.filter(p=>!wizard(p));}route=target;if(!wizard(route))withdrawalId=null;write(true);},
  saveViewState(key,value){views.set(key,structuredClone(value));},
  getViewState(key){return structuredClone(views.get(key)||{});},
  sync(path,state){route=path||'/';withdrawalId=state?.withdrawalId||null;trail=state?.hoan?[...state.trail]:[];if(retiredWithdrawals.has(withdrawalId)||(state?.withdrawEpoch??-1)<withdrawEpoch){trail=trail.filter(p=>!wizard(p));if(wizard(route)){route='/wallet';write(true);}}return route;}
 };
}
export function resolveRoute(path,s,views={}){
 if(!s.user.signedIn)return '/login';
 if(!s.network.online&&!s.snapshot)return '/offline';
 if(path==='/withdraw/review'&&(!Number.isSafeInteger(views[path]?.amount)||views[path].amount<s.settings.min_withdraw||views[path].amount>s.wallet.available||s.payoutAccount?.status!=='VERIFIED'))return '/withdraw';
 return path;
}

export function completeWithdrawalDrafts(views,submitted,{currentPath,show}={}){if(views['/withdraw/review']!==submitted)return;views['/withdraw/review']={};if(show||!wizard(currentPath))views['/withdraw']={};}
