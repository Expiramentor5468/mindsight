import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalSpeech} from '../js/local-speech.js';
function fixture(getUserMedia){
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia}}});
 const nodes=[];globalThis.AudioWorkletNode=class {constructor(){this.port={close(){}};nodes.push(this);}connect(){}disconnect(){}};
 let recognizer;const local=new LocalSpeech();
 local.model={ready:true,KaldiRecognizer:class {constructor(rate){this.rate=rate;this.events={};recognizer=this;}on(name,fn){this.events[name]=fn;}acceptWaveformFloat(){}remove(){this.removed=true;}}};
 local.audioContext=async()=>({sampleRate:48000,destination:{},createMediaStreamSource:()=>({connect(){},disconnect(){}})});
 return {local,nodes,get recognizer(){return recognizer;}};
}
function stream(){const track={stopped:false,stop(){this.stopped=true;}};return {track,getTracks:()=>[track],getAudioTracks:()=>[track]};}
test('on-device recognition delivers final text and releases microphone on abort',async()=>{
 const media=stream(),f=fixture(async()=>media),r=f.local.createRecognition();let text,start=false;
 r.onstart=()=>start=true;r.onresult=e=>text=e.results[0][0].transcript;
 await r.start();assert.equal(start,true);assert.equal(f.recognizer.rate,48000);
 f.recognizer.events.result({result:{text:'my answer is blue'}});assert.equal(text,'my answer is blue');
 r.abort();assert.equal(media.track.stopped,true);assert.equal(f.recognizer.removed,true);
 f.recognizer.events.result({result:{text:'yes'}});assert.equal(text,'my answer is blue');
});
test('cancel during microphone permission request stops late-arriving tracks',async()=>{
 let resolve;const media=stream(),f=fixture(()=>new Promise(r=>resolve=r)),r=f.local.createRecognition();
 let started=false;r.onstart=()=>started=true;const pending=r.start();r.abort();resolve(media);await pending;
 assert.equal(media.track.stopped,true);assert.equal(started,false);assert.equal(f.nodes.length,0);
});
test('denied microphone access produces an actionable recognition error',async()=>{
 const f=fixture(async()=>{throw Object.assign(Error('denied'),{name:'NotAllowedError'});});const r=f.local.createRecognition();let error;
 r.onerror=e=>error=e.error;await r.start();assert.equal(error,'not-allowed');
});
