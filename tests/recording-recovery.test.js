import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {SessionRecorder,audioSegments,importAudioSegments} from '../js/recording.js';
test('complete-backup audio import is durable and skips duplicate segments without replacing originals',async()=>{const original={session:'restore-test',id:'segment-one',startedAt:10,endedAt:30,blob:new Blob(['original'],{type:'audio/ogg'})};assert.equal(await importAudioSegments([original]),1);assert.equal(await importAudioSegments([{...original,blob:new Blob(['different'],{type:'audio/ogg'})}]),0);const saved=await audioSegments(original.session);assert.equal(saved[0].id,original.id);assert.equal(await saved[0].blob.text(),'original');assert.equal(saved[0].endedAt,30);});
test('interrupted microphone recording retains chunks and resumes into a separate timed segment',async()=>{
 const tracks=[],messages=[];Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>{const t={stop(){this.stopped=true;}};tracks.push(t);return {getTracks:()=>[t],getAudioTracks:()=>[t]};}}}});
 globalThis.MediaRecorder=class{static isTypeSupported(){return true;}constructor(stream,options){this.mimeType=options.mimeType;this.state='inactive';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable({data:new Blob(['saved chunk'],{type:this.mimeType})});queueMicrotask(()=>this.onstop());}};
 const recorder=new SessionRecorder(t=>messages.push(t));await recorder.start('recovery-test');const first=recorder.active.segment;tracks[0].onended();await recorder.stop();assert.equal(recorder.active,null);assert.match(messages.at(-1),/interrupted/);await recorder.start('recovery-test');assert.notEqual(recorder.active.segment,first);await recorder.stop();const segments=await audioSegments('recovery-test');assert.equal(segments.length,2);assert.equal(await segments[0].blob.text(),'saved chunk');assert.ok(tracks.every(t=>t.stopped));
});
