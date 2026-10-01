// Audio is opt-in and kept in IndexedDB, outside the small text journal.
export function recordingType(Recorder=globalThis.MediaRecorder){
 return ['audio/ogg;codecs=opus','audio/webm;codecs=opus','audio/mp4'].find(t=>Recorder?.isTypeSupported(t))||'';
}
let database;
function db(){return database??=new Promise((resolve,reject)=>{const r=indexedDB.open('mindsight-audio',1);r.onupgradeneeded=()=>{const s=r.result.createObjectStore('chunks',{keyPath:['session','segment','index']});s.createIndex('session','session');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function put(row){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('chunks','readwrite');t.objectStore('chunks').put(row);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}
export async function audioSegments(id){const d=await db();const rows=await new Promise((resolve,reject)=>{const r=d.transaction('chunks').objectStore('chunks').index('session').getAll(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const groups=new Map();for(const r of rows){if(!groups.has(r.segment))groups.set(r.segment,[]);groups.get(r.segment).push(r);}return [...groups.values()].map(rows=>{rows.sort((a,b)=>a.index-b.index);return {id:rows[0].segment,startedAt:rows[0].startedAt,endedAt:rows.at(-1).endedAt,blob:new Blob(rows.map(r=>r.blob),{type:rows[0].blob.type})};}).sort((a,b)=>a.startedAt-b.startedAt);}
// Import all missing segments in one transaction; existing recordings are retained.
export async function importAudioSegments(segments){
 if(!segments.length)return 0;
 const d=await db();return new Promise((resolve,reject)=>{let added=0;const tx=d.transaction('chunks','readwrite'),store=tx.objectStore('chunks');
 for(const s of segments){const request=store.get([s.session,s.id,0]);request.onsuccess=()=>{if(!request.result){store.add({session:s.session,segment:s.id,index:0,startedAt:s.startedAt,endedAt:s.endedAt,blob:s.blob});added++;}};}
 tx.oncomplete=()=>resolve(added);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Audio import cancelled.'));
 });
}
export class SessionRecorder {
 constructor(onState=()=>{}){this.onState=onState;this.active=null;this.pending=Promise.resolve();}
 async start(id){
  if(!globalThis.MediaRecorder||!navigator.mediaDevices?.getUserMedia)throw Error('Audio recording is unavailable in this browser.');
  await this.stop();await db();
  const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
  try{
   const mimeType=recordingType();const recorder=new MediaRecorder(stream,{...(mimeType?{mimeType}:{}),audioBitsPerSecond:24000});
   const startedAt=Date.now(),segment=crypto.randomUUID();let index=0;
   const active=this.active={recorder,stream,startedAt,id,segment};
   recorder.ondataavailable=e=>{if(!e.data.size)return;const row={session:id,segment,index:index++,startedAt,endedAt:Date.now(),blob:e.data};this.pending=this.pending.then(()=>put(row)).catch(()=>{active.failed=true;this.onState('Audio storage failed. Saved audio may be incomplete; text journal remains available.');void this.stop();});};
   active.done=new Promise(resolve=>recorder.onstop=()=>{stream.getTracks().forEach(t=>{t.onended=null;t.stop();});if(this.active===active)this.active=null;this.onState(active.failed?'Audio storage failed · saved chunks may be incomplete. Export before leaving.':active.interrupted?'Audio interrupted · saved chunks retained. Resume recording when ready.':'Audio stopped · saved on this device');resolve();});
   recorder.onerror=()=>{active.interrupted=true;void this.stop();};
   stream.getAudioTracks().forEach(t=>t.onended=()=>{active.interrupted=true;void this.stop();});
   recorder.start(5000);this.onState('● Recording microphone · includes reflection');return startedAt;
  }catch(e){stream.getTracks().forEach(t=>t.stop());this.active=null;throw e;}
 }
 async stop(){const a=this.active;if(a){if(a.recorder.state!=='inactive')a.recorder.stop();await a.done;}await this.pending;}
}
export function saveBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);}
