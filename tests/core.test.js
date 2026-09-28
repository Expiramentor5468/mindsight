import test from 'node:test';
import assert from 'node:assert/strict';
import {EXERCISES,makeTarget,parseIntent,parseAnswer,Session,stats} from '../js/core.js';
const create=(opts={})=>new Session({exercise:'color2',planned:8,...opts});
test('every exercise supplies an answer accepted by its scoring vocabulary',()=>{
 for(const [id,ex] of Object.entries(EXERCISES))for(let i=0;i<ex.answers.length;i++){
  const target=makeTarget(id,n=>i%n);assert.ok(ex.answers.includes(target.answer));
 }
});
test('comparisons draw the relationship with probability one half, not one quarter',()=>{
 for(const relation of [0,1])for(let first=0;first<4;first++){
  const values=[relation,first,0];const target=makeTarget('compare',()=>values.shift());
  assert.equal(target.answer,relation?'different':'same');assert.equal(target.first===target.second,!relation);
 }
});
test('observations never commit, ambiguous answers are rejected, corrections parse exactly',()=>{
 assert.equal(parseIntent('I am noticing something reddish','color2','explore').type,'note');
 assert.equal(parseIntent('blue','color2','explore').type,'note');
 assert.equal(parseIntent('please do not end session yet','color2','explore').type,'note');
 assert.equal(parseIntent('my answer is blue or red','color2','explore').answer,null);
 assert.equal(parseIntent('no I said blue','color2','confirm').answer,'blue');
 assert.equal(parseAnswer('my answer is two','numbers'),'2');
 assert.equal(parseIntent('stop','color2','explore').type,'pause');
});
test('confirmation is required and repeat confirmation cannot duplicate or overwrite',()=>{
 const s=create();s.target();assert.equal(s.commit(),false);s.propose('blue');assert.equal(s.data.trials.length,0);
 assert.ok(s.commit());const answer=s.data.trials[0].answer;assert.equal(answer,'blue');
 assert.equal(s.commit(),false);assert.equal(s.propose('red'),false);assert.equal(s.data.trials.length,1);
 assert.equal(s.data.current.target.answer,s.data.trials[0].target.answer);
});
test('comparison refuses an answer until both targets have been presented',()=>{
 const s=create({exercise:'compare'});s.target();assert.equal(s.propose('same'),false);s.data.current.part=2;assert.ok(s.propose('same'));
});
test('pause and recovery retain target, pending confirmation, and trial number',()=>{
 const s=create();s.target();s.propose('red');const target=s.data.current.target.answer;s.pause();
 const restored=new Session({},s.data);restored.resume();assert.equal(restored.data.phase,'confirm');
 assert.equal(restored.data.pending,'red');assert.equal(restored.data.current.target.answer,target);restored.commit();assert.equal(restored.data.trials.length,1);
});
test('passes, interruptions and flags survive without becoming successful answers',()=>{
 const s=create();s.target();s.commit(true);s.target();s.flag('leak');s.propose(s.data.current.target.answer);s.commit();s.target();s.finish();
 const n=stats(s.data);assert.equal(n.answered,1);assert.equal(n.correct,1);assert.equal(n.passed,1);assert.equal(n.interrupted,1);assert.equal(n.flagged,1);assert.equal(n.coverage,3/8);
});
test('completing a block preserves all records and creates no extra interrupted trial',()=>{
 const s=create({planned:2});s.target();s.propose('red');s.commit();s.target();s.commit(true);assert.equal(s.target(),false);
 assert.equal(s.data.status,'complete');assert.equal(s.data.trials.length,2);assert.equal(stats(s.data).interrupted,0);
 const again=create();assert.notEqual(again.data.id,s.data.id);assert.equal(s.data.trials.length,2);
});
test('notes distinguish pre-answer from post-feedback and never affect scoring',()=>{
 const s=create();s.target();s.note('rounded');s.propose('blue');s.commit();s.note('now it seems red');
 assert.equal(s.data.notes[0].afterFeedback,false);assert.equal(s.data.notes[1].afterFeedback,true);assert.equal(s.data.trials[0].answer,'blue');
});
