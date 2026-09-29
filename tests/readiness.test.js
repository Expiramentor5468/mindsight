import test from 'node:test';
import assert from 'node:assert/strict';
import {ReadinessCheck} from '../js/readiness.js';
function create(overrides={}){
 const states=[];let listens=0;
 const voice={available:true,dispose(){},speak:async()=>{},listen(){listens++;},...overrides};
 const check=new ReadinessCheck({voice,challenge:()=> 'two',onUpdate:s=>states.push(s)});
 return {check,states,voice,get listens(){return listens;}};
}
test('unsupported recognition reports a reason instead of silently doing nothing',async()=>{
 const f=create({available:false});await f.check.start();
 assert.match(f.states.at(-1).message,/unavailable/);assert.equal(f.check.running,false);assert.equal(f.listens,0);
});
test('readiness passes only after audio and a matching spoken response',async()=>{
 const f=create();await f.check.start();f.check.hear('ready one');assert.equal(f.states.at(-1).passed,false);
 f.check.hear('ready 2');assert.equal(f.states.at(-1).passed,true);assert.equal(f.listens,1);assert.equal(f.check.running,false);
});
test('cancel remains available while speech is stalled and stale audio cannot start a microphone',async()=>{
 let resolve;const f=create({speak:()=>new Promise(r=>resolve=r)});const pending=f.check.start();
 assert.equal(f.check.running,true);await f.check.start();assert.equal(f.check.running,false);
 resolve();await pending;assert.equal(f.listens,0);assert.match(f.states.at(-1).message,/cancelled/);
});
test('synchronous audio errors allow retry without a stuck running state',async()=>{
 const f=create({speak:()=>{throw Error('audio');}});await f.check.start();assert.equal(f.check.running,false);
 f.voice.speak=async()=>{};await f.check.start();assert.equal(f.listens,1);f.check.reset();
});
test('asynchronous voice faults invalidate pending work',async()=>{
 let resolve;const f=create({speak:()=>new Promise(r=>resolve=r)});const pending=f.check.start();
 f.check.fail('Permission denied');resolve();await pending;assert.equal(f.listens,0);assert.equal(f.states.at(-1).message,'Permission denied');
});
test('a missing browser completion event times out and resets',async()=>{
 const f=create({speak:()=>new Promise(()=>{})});f.check.timeout=10;void f.check.start();
 await new Promise(r=>setTimeout(r,30));assert.equal(f.check.running,false);assert.match(f.states.at(-1).message,/timed out/);
});
test('a cancelled previous attempt cannot interfere with a new attempt',async()=>{
 const resolves=[];const f=create({speak:()=>new Promise(r=>resolves.push(r))});const old=f.check.start();
 f.check.reset();const current=f.check.start();resolves[0]();await old;assert.equal(f.listens,0);assert.equal(f.check.running,true);
 resolves[1]();await current;assert.equal(f.listens,1);f.check.reset();
});
test('model preparation is a separate click and cannot count as a successful voice check',async()=>{
 let prepared=false;const f=create({needsPreparation:true,prepare:async()=>{prepared=true;}});
 await f.check.start();assert.equal(prepared,true);assert.equal(f.check.running,false);assert.equal(f.states.at(-1).passed,false);assert.equal(f.listens,0);
 f.voice.needsPreparation=false;await f.check.start();f.check.hear('ready two');assert.equal(f.states.at(-1).passed,true);
});
test('cancelling a model download cannot update a newer readiness attempt',async()=>{
 let finish;const f=create({needsPreparation:true,prepare:()=>new Promise(r=>finish=r)});const loading=f.check.start();
 await f.check.start();finish();await loading;assert.match(f.states.at(-1).message,/cancelled/);assert.equal(f.listens,0);
});
