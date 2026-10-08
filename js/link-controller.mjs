// One current conversion; stale responses never change the visible product.
export function createLinkController(api,callbacks={},options={}){
 let sequence=0,timer,request,last='';
 const cancel=()=>{sequence++;clearTimeout(timer);request?.abort();request=null;last='';};
 const input=(raw,{immediate=false,force=false}={})=>{
  const value=raw.trim();if(!force&&value===last)return;
  cancel();last=value;const current=sequence;callbacks.clear?.();if(!value)return;
  const execute=async()=>{request=new AbortController();callbacks.loading?.();try{const result=await api.createLink(value,{signal:request.signal});if(current===sequence)callbacks.result?.(result);}catch(e){if(current===sequence&&e.code!=='CANCELLED')callbacks.error?.(e);}};
  if(immediate)execute();else timer=setTimeout(execute,options.delay??650);
 };
 return {input,cancel};
}
export function createClipboardReader(readText){let generation=0;return {invalidate(){generation++;},async read(){const current=++generation;try{const value=await readText();return current===generation?value:null;}catch(e){if(current!==generation)return null;throw e;}}};}
