export const VOICE_CACHE='mindsight-voice-v1';
export const VOICE_ASSETS={engine:'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.8/dist/vosk.js',model:'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz'};
export async function offlineVoiceURLs(){
 if(!navigator.serviceWorker?.controller||!globalThis.caches)return null;
 const cache=await caches.open(VOICE_CACHE);if(!await cache.match(VOICE_ASSETS.engine)||!await cache.match(VOICE_ASSETS.model))return null;
 return {engine:new URL('../offline-assets/vosk.js',import.meta.url).href,model:new URL('../offline-assets/model.tar.gz',import.meta.url).href};
}
export class OfflineManager{
 constructor(update=()=>{}){this.update=update;this.worker=null;this.job=null;this.cancelled=false;}
 get supported(){return !!(navigator.serviceWorker&&globalThis.caches&&window.isSecureContext);}
 async registration(create=false){
  if(!this.supported)throw Error('Offline preparation is unavailable in this browser or context.');
  const scope=new URL('../',import.meta.url).href;
  let reg=await navigator.serviceWorker.getRegistration(scope);
  if(create){reg=await navigator.serviceWorker.register(new URL('../sw.js',import.meta.url),{scope,updateViaCache:'none'});await reg.update();}
  if(reg?.installing)await new Promise((resolve,reject)=>{const worker=reg.installing;const timer=setTimeout(()=>{worker.removeEventListener('statechange',check);reject(Error('Offline setup timed out. Try again.'));},30000);const check=()=>{if(['installed','activated','redundant'].includes(worker.state)){clearTimeout(timer);worker.removeEventListener('statechange',check);worker.state==='redundant'?reject(Error('Offline preparation could not install.')):resolve();}};worker.addEventListener('statechange',check);check();});
  return reg;
 }
 message(worker,type){return new Promise((resolve,reject)=>{const channel=new MessageChannel(),id=crypto.randomUUID();const timer=setTimeout(()=>{channel.port1.close();if(this.job?.id===id){worker.postMessage({type:'CANCEL',id});this.job=null;}reject(Error('Offline preparation timed out. Try again.'));},type==='STATUS'?10000:300000);if(type.startsWith('PREPARE'))this.job={id,worker};
  channel.port1.onmessage=e=>{if(e.data.progress){this.update(e.data.progress);return;}clearTimeout(timer);channel.port1.close();if(this.job?.id===id)this.job=null;e.data.error?reject(Error(e.data.error)):resolve(e.data);};worker.postMessage({type,id},[channel.port2]);
 });}
 async status(){try{const reg=await this.registration();if(!reg)return {app:false,voice:false};const active=reg.active||reg.waiting;return active?await this.message(active,'STATUS'):{app:false,voice:false};}catch(e){return {app:false,voice:false,error:e.message};}}
 async prepare(voice=false){this.cancelled=false;const reg=await this.registration(true),worker=reg.waiting||reg.active;if(this.cancelled)throw Error('Download cancelled.');if(!worker)throw Error('The offline worker is not ready. Try again.');const result=await this.message(worker,voice?'PREPARE_VOICE':'PREPARE_APP');return {...result,pending:!!reg.waiting};}
 cancel(){this.cancelled=true;if(this.job)this.job.worker.postMessage({type:'CANCEL',id:this.job.id});}
}
