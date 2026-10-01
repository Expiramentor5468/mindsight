import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../sw.js',import.meta.url),'utf8');
function fixture(){
 const cacheData=new Map(),handlers={},network=[];let failure=false;
 const url=r=>typeof r==='string'?r:r.url;
 const caches={keys:async()=>[...cacheData.keys()],delete:async n=>cacheData.delete(n),open:async name=>{if(!cacheData.has(name))cacheData.set(name,new Map());const rows=cacheData.get(name);return {put:async(k,v)=>rows.set(url(k),v.clone()),match:async(k,opts)=>{const key=url(k);let v=rows.get(key);if(!v&&opts?.ignoreSearch)v=[...rows].find(([u])=>u.split('?')[0]===key.split('?')[0])?.[1];return v?.clone();}};}};
 const scope={self:{location:{href:'https://test.example/mindsight/sw.js'},clients:{claim:async()=>{}},addEventListener:(n,fn)=>handlers[n]=fn},caches,URL,Response,AbortController,fetch:async u=>{network.push(u);if(failure)throw Error('offline');return new Response('cached '+u);}};
 vm.runInNewContext(code,scope);
 const message=async type=>{let done;const result=[];handlers.message({data:{type,id:'test-job'},ports:[{postMessage:m=>result.push(m)}],waitUntil:p=>done=p});await done;return result.at(-1);};
 const fetch=async(path,mode='cors')=>{let reply;handlers.fetch({request:{url:'https://test.example/mindsight/'+path,method:'GET',mode},respondWith:p=>reply=p});return reply;};
 return {cacheData,caches,network,message,fetch,handlers,set offline(v){failure=v;}};
}
test('explicit app preparation covers every imported module and serves a full reload with the network gone',async()=>{const f=fixture();assert.equal((await f.message('STATUS')).app,false);assert.equal(f.network.length,0);assert.equal((await f.message('PREPARE_APP')).app,true);for(const u of f.network){const file=u.split('/mindsight/')[1];if(file)await readFile(new URL('../'+file,import.meta.url));}const paths=['','index.html','styles.css?v=3.5.0','js/app.js?v=3.5.0','js/journal.js?v=3.5.0','js/speech-worklet.js'];f.offline=true;for(const path of paths)assert.match(await(await f.fetch(path,path?'cors':'navigate')).text(),/cached/);});
test('failed or cancelled preparation never advertises an incomplete offline cache',async()=>{const f=fixture();f.offline=true;assert.match((await f.message('PREPARE_APP')).error,/offline/);assert.equal((await f.message('STATUS')).app,false);assert.ok(![...f.cacheData.keys()].some(n=>n.endsWith('-pending')));f.offline=false;let work;const messages=[];f.handlers.message({data:{type:'PREPARE_APP',id:'cancel'},ports:[{postMessage:m=>{messages.push(m);if(m.progress)f.handlers.message({data:{type:'CANCEL',id:'cancel'}});}}],waitUntil:p=>work=p});await work;assert.match(messages.at(-1).error,/cancelled/);assert.equal((await f.message('STATUS')).app,false);});
test('voice download is separate and cached external bytes are served through same-origin URLs',async()=>{const f=fixture();await f.message('PREPARE_APP');assert.equal((await f.message('STATUS')).voice,false);assert.equal(f.network.some(u=>u.includes('vosk')),false);await f.message('PREPARE_VOICE');f.offline=true;assert.match(await(await f.fetch('offline-assets/vosk.js')).text(),/jsdelivr/);assert.match(await(await f.fetch('offline-assets/model.tar.gz')).text(),/model-small/);});
test('a worker update can keep an earlier prepared app available before the next explicit update',async()=>{const f=fixture(),old=await f.caches.open('mindsight-app-3.4.9');await old.put('https://test.example/mindsight/offline-ready',new Response('old'));await old.put('https://test.example/mindsight/index.html',new Response('previous app'));f.offline=true;assert.equal(await(await f.fetch('','navigate')).text(),'previous app');});
