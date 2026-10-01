import {validateSession} from './history.js?v=3.5.0';
import {cleanPreferences,cleanPreset} from './setups.js?v=3.5.0';
export const BACKUP_LIMIT=256*1024*1024;
const assert=(ok,message)=>{if(!ok)throw Error(message);};
async function encode(blob){const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}
export async function makeBackup({sessions,preferences,presets=[],archives=[],legacy=null},readAudio,onProgress=()=>{}){
 const audio=[],missingAudio=[];let total=0;
 for(let i=0;i<sessions.length;i++){
  const r=sessions[i];onProgress(`Collecting session ${i+1} of ${sessions.length}…`);
  if(!r.hasAudio)continue;const segments=await readAudio(r.id);if(!segments.length)missingAudio.push(r.id);
  for(const s of segments){total+=s.blob.size;assert(total<BACKUP_LIMIT*.7,'This backup is too large for one file. Export audio or individual sessions separately.');audio.push({session:r.id,id:s.id,startedAt:s.startedAt,endedAt:s.endedAt,mimeType:s.blob.type,data:await encode(s.blob)});}
 }
 return {format:'mindsight-backup',version:1,exportedAt:new Date().toISOString(),sessions,preferences:cleanPreferences(preferences),presets:presets.map(cleanPreset),archives,legacy,audio,missingAudio};
}
export function previewBackup(value,existing=[]){
 assert(value?.format==='mindsight-backup'&&value.version===1,'Unsupported backup format.');
 assert(Array.isArray(value.sessions)&&value.sessions.length<=10000,'Invalid backup sessions.');
 const sessions=value.sessions.map(validateSession),incoming=new Map(),current=new Map(existing.map(r=>[r.id,r]));
 for(const s of sessions){assert(!incoming.has(s.id),'Duplicate session IDs inside the backup.');incoming.set(s.id,s);}
 const additions=sessions.filter(s=>!current.has(s.id));
 assert(Array.isArray(value.audio)&&value.audio.length<=20000,'Invalid backup recordings.');let bytes=0;const ids=new Set();
 const audio=value.audio.map(s=>{
  assert(s&&incoming.has(s.session)&&typeof s.id==='string'&&/^[\w-]{1,100}$/.test(s.id),'Invalid recording identity.');const key=s.session+'/'+s.id;assert(!ids.has(key),'Duplicate audio segments.');ids.add(key);
  assert(Number.isFinite(s.startedAt)&&s.startedAt>=0&&Number.isFinite(s.endedAt)&&s.endedAt>=s.startedAt,'Invalid recording timing.');
  assert(typeof s.mimeType==='string'&&/^audio\/[a-z0-9.+-]+(?:;[a-z0-9=; .+-]*)?$/i.test(s.mimeType),'Invalid recording format.');
  assert(typeof s.data==='string'&&s.data.length%4===0&&/^[A-Za-z0-9+/]*={0,2}$/.test(s.data),'Invalid audio encoding.');bytes+=s.data.length*.75;assert(bytes<BACKUP_LIMIT,'Recordings exceed the import size limit.');
  const old=current.get(s.session),fresh=incoming.get(s.session);
  if(old)assert(JSON.stringify([old.exercise,old.config,old.createdAt,old.trials])===JSON.stringify([fresh.exercise,fresh.config,fresh.createdAt,fresh.trials]),'A recording belongs to a different version of an existing session. Import the matching session separately.');
  const binary=atob(s.data),array=Uint8Array.from(binary,c=>c.charCodeAt(0));return {...s,blob:new Blob([array],{type:s.mimeType}),data:undefined};
 });
 assert(Array.isArray(value.presets||[])&&(value.presets||[]).length<=500,'Invalid saved setups.');const presets=(value.presets||[]).map(cleanPreset);
 assert(Array.isArray(value.archives||[])&&(value.archives||[]).every(a=>a&&typeof a.name==='string'&&Array.isArray(a.rawSessions)),'Invalid earlier archives.');
 assert(value.legacy==null||Array.isArray(value.legacy),'Invalid earlier records.');
 return {kind:'backup',additions,sessions,duplicates:sessions.length-additions.length,audio,preferences:cleanPreferences(value.preferences),presets,archives:value.archives||[],legacy:value.legacy||null,missingAudio:Array.isArray(value.missingAudio)?value.missingAudio.length:0};
}
export function writeStorageBatch(storage,values){
 const previous=Object.keys(values).map(k=>[k,storage.getItem(k)]);
 try{for(const [k,v] of Object.entries(values))storage.setItem(k,JSON.stringify(v));}
 catch(error){let restored=true;for(const [k,v] of previous)try{if(v===null)storage.removeItem(k);else storage.setItem(k,v);}catch{restored=false;}throw Error(restored?'Device storage is full or unavailable. Existing text records were restored.':'Storage failed during import. Keep this backup and reload to check the saved records.');}
}
