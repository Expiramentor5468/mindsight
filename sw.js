/* Explicit offline preparation. Install/update never downloads a voice model. */
const VERSION='3.5.0',APP_CACHE='mindsight-app-'+VERSION,VOICE_CACHE='mindsight-voice-v1';
const BASE=new URL('./',self.location.href),READY=new URL('offline-ready',BASE).href;
const APP_FILES=['./','index.html','styles.css','icon.svg','manifest.webmanifest','js/app.js','js/core.js','js/history.js','js/targets.js','js/voice.js','js/local-reader.js','js/local-speech.js','js/readiness.js','js/recording.js','js/reflection.js','js/replay.js','js/learning.js','js/journal.js','js/setups.js','js/backup.js','js/offline.js','js/speech-worklet.js','docs/research-blueprint.md','docs/session-recordings.md','docs/learning-journal-offline.md'];
const ENGINE='https://cdn.jsdelivr.net/npm/vosk-browser@0.0.8/dist/vosk.js',MODEL='https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz';
const jobs=new Map();
self.addEventListener('install',()=>{});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function savedApp(){for(const name of [APP_CACHE,...(await caches.keys()).filter(n=>n.startsWith('mindsight-app-')&&!n.endsWith('-pending')&&n!==APP_CACHE).reverse()]){const cache=await caches.open(name);if(await cache.match(READY))return cache;}return null;}
async function status(){const app=await savedApp(),voice=await caches.open(VOICE_CACHE);return {version:VERSION,app:!!app,voice:!!await voice.match(ENGINE)&&!!await voice.match(MODEL)};}
async function prepare(type,signal,port){
 const voice=type==='PREPARE_VOICE',destination=voice?VOICE_CACHE:APP_CACHE,staging=destination+'-pending';
 await caches.delete(staging);const cache=await caches.open(staging),urls=voice?[ENGINE,MODEL]:APP_FILES.map(p=>new URL(p,BASE).href);
 try{for(let i=0;i<urls.length;i++){
  if(signal.aborted)throw Error('Download cancelled.');port.postMessage({progress:`${voice?'Downloading English voice':'Saving app'} · ${i+1} of ${urls.length} files…`});
  const response=await fetch(urls[i],{signal,cache:'reload',...(urls[i]===ENGINE?{integrity:'sha384-nqyY8clHf93uBYFkgkACShMTuvE3U57yXSJaf0Ws+XgzcoUe6OB/1BiOfHqKOWeg'}:{})});
  if(!response.ok||response.type==='opaque')throw Error('A required offline file could not be downloaded. Your existing offline copy is retained.');
  // Store readable responses. Never mark a partially downloaded cache ready.
  await cache.put(urls[i],response);
 }
 if(signal.aborted)throw Error('Download cancelled.');const final=await caches.open(destination);
 for(const url of urls)await final.put(url,await cache.match(url));
 if(!voice)await final.put(READY,new Response(VERSION));
 return await status();
 }finally{await caches.delete(staging);}
}
self.addEventListener('message',event=>{
 const {type,id}=event.data||{},port=event.ports?.[0];if(type==='CANCEL'){jobs.get(id)?.abort();return;}if(!port)return;
 event.waitUntil((async()=>{try{if(type==='STATUS'){port.postMessage(await status());return;}if(!['PREPARE_APP','PREPARE_VOICE'].includes(type))throw Error('Unknown offline action.');if(jobs.size)throw Error('Another offline download is running. Wait for it to finish.');const controller=new AbortController();jobs.set(id,controller);try{port.postMessage(await prepare(type,controller.signal,port));}finally{jobs.delete(id);}}catch(e){port.postMessage({error:e.name==='AbortError'?'Download cancelled.':e.message});}})());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
 const relative=url.pathname.slice(BASE.pathname.length);
 if(relative.startsWith('offline-assets/')){const asset=relative==='offline-assets/vosk.js'?ENGINE:relative==='offline-assets/model.tar.gz'?MODEL:null;if(!asset)return;event.respondWith((async()=>{const r=await(await caches.open(VOICE_CACHE)).match(asset);if(!r)return new Response('Voice assets have not been saved offline.',{status:503});return new Response(r.body,{headers:{'Content-Type':r.headers.get('Content-Type')||'application/octet-stream'}});})());return;}
 if(!APP_FILES.includes(relative||'./')&&request.mode!=='navigate')return;
 event.respondWith((async()=>{const cache=await savedApp();if(cache){const response=await cache.match(request,{ignoreSearch:true})||(request.mode==='navigate'?await cache.match(new URL('index.html',BASE).href):null);if(response)return response;}return fetch(request);})());
});
