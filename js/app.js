import {AREAS,LESSONS,lessonFor,lessonState,recommendation,variety,favorite,hasPractice,areaFor,responses,comparableGroups} from './learning.js?v=3.5.0';
import {journalCard,filterSessions,activityView,trendView} from './journal.js?v=3.5.0';
import {cleanSetup,cleanPreset} from './setups.js?v=3.5.0';
import {makeBackup,previewBackup,writeStorageBatch,BACKUP_LIMIT} from './backup.js?v=3.5.0';
import {OfflineManager} from './offline.js?v=3.5.0';
import {previewHistory} from './history.js?v=3.5.0';
import {shapeSVG} from './targets.js?v=3.5.0';
import {EXERCISES,COLORS,GROUPS,exerciseFor,makeTarget,Session,parseIntent,stats,randomInt} from './core.js?v=3.5.0';
import {SessionRecorder,audioSegments,importAudioSegments,saveBlob} from './recording.js?v=3.5.0';
import {replayDocument} from './replay.js?v=3.5.0';
import {reflectionInput} from './reflection.js?v=3.5.0';
import {Voice} from './voice.js?v=3.5.0';
import {ReadinessCheck} from './readiness.js?v=3.5.0';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const percent=n=>n===null?'—':`${Math.round(n*100)}%`;
const stamp=()=>new Date().toISOString();
const key='mindsite-v3-sessions',prefKey='mindsite-v3-preferences';
let records=[],preferences={rate:.94,spoken:true,large:false,theme:'system'},storageOK=true,storageBlocked=false;
try {records=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(records))throw Error('bad records');preferences={...preferences,...JSON.parse(localStorage.getItem(prefKey)||'{}')};localStorage.setItem('mindsite-storage-check','ok');localStorage.removeItem('mindsite-storage-check');}catch{storageOK=false;storageBlocked=true;records=[];}
let presets=[],presetsOK=true,journalGroups=[],downloadIntent='recognition';
const presetKey='mindsight-presets';
try{presets=JSON.parse(localStorage.getItem(presetKey)||'[]').map(cleanPreset);}catch{presetsOK=false;}
const offline=new OfflineManager(message=>{$('#offlineStatus').textContent=message;});
let session=null,setup=null,mode='practice',voiceMode=true,checkPassed=false,sessionTimer=null,wake=null,checking=false,lastPrompt='',audioFault=false;
const recorder=new SessionRecorder(message=>{$('#recordingStatus').textContent=message;$('#stopRecording').disabled=!recorder.active;$('#resumeRecording').hidden=!!recorder.active||!(session?.data.recordingWanted||session?.data.hasAudio);});
const voice=new Voice({onText:receive,onState:setVoiceState,onFault:voiceFault});
const readiness=new ReadinessCheck({voice,challenge:()=>['one','two','three','four'][randomInt(4)],rate:()=>preferences.rate,onUpdate:state=>{
 checking=state.running;checkPassed=state.passed;
 $('#checkVoice').disabled=false;
 $('#checkVoice').textContent=state.running?(voice.needsPreparation?'Cancel download':'Cancel check'):state.passed?'Check again':voice.needsPreparation?'Set up on-device voice…':'Check audio & microphone';
 $('#checkStatus').textContent=state.message;
 $('#voiceCheck').setAttribute('aria-busy',String(state.running));
 updateSetup();
}});
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,6000);}
function currentSetupValues(){return cleanSetup({inputMode:$('#inputMode').value,speechEngine:$('#speechEngine').value,condition:$('#condition').value,conditionNotes:$('#conditionNotes').value,planned:$('#trialCount').value});}
function persistPreferences(){try{localStorage.setItem(prefKey,JSON.stringify(preferences));return true;}catch{toast('Preferences could not be saved.');return false;}}
async function stopSessionRecording(reason){if(!session||!recorder.active)return;const current=session;current.event('recording-stopped',{reason});await recorder.stop();if(session===current){save();renderSession();}}
let recordingStarting=false;
async function resumeSessionRecording(){
 if(!session||recorder.active||recordingStarting)return;recordingStarting=true;const current=session;$('#resumeRecording').disabled=true;
 try{await recorder.start(current.data.id);if(session!==current||document.hidden){await recorder.stop();return;}current.data.hasAudio=true;current.data.recordingWanted=true;current.data.audioSegments??=[];current.data.audioSegments.push({startedAt:recorder.active.startedAt,id:recorder.active.segment,mimeType:recorder.active.recorder.mimeType||'browser-selected'});current.event('recording-resumed');save();renderSession();}
 catch(e){toast('Recording could not resume: '+e.message);}finally{recordingStarting=false;$('#resumeRecording').disabled=false;}
}
async function watchReplay(id){
 const r=records.find(r=>r.id===id);if(!r||r.status==='active')return;
 try{if(recorder.active?.id===id)await stopSessionRecording('Opened replay');voice.dispose();const audio=r.hasAudio?await audioSegments(id):[];if(r.hasAudio&&!audio.length)toast('Saved audio was not found. The screen replay is still available.');$('#replayFrame').srcdoc=await replayDocument(r,audio);$('#replayDialog').showModal();}
 catch(e){toast('Replay could not open: '+e.message);}
}
function save(){
 if(!session)return true;
 const i=records.findIndex(s=>s.id===session.data.id);const copy=structuredClone(session.data);
 if(i<0)records.unshift(copy);else records[i]=copy;
 try{if(storageBlocked)throw Error('Existing data could not be read');localStorage.setItem(key,JSON.stringify(records));$('#savedStatus').textContent='Saved on this device';storageOK=true;return true;}
 catch{storageOK=false;$('#savedStatus').textContent='Save failed – export your session before leaving';toast('Storage is unavailable or full. Export your session to keep it.');return false;}
}
function route(){
 if(session&&!$('#sessionView').hidden)return;
 const name=location.hash.slice(1)||'home';const page=['home','program','practice','journal','about'].includes(name)?name:'home';
 $$('.page').forEach(e=>e.hidden=e.id!==page);$$('[data-nav]').forEach(e=>{e.classList.toggle('active',e.dataset.nav===page);e.toggleAttribute('aria-current',e.dataset.nav===page);});
 renderOverview();if(page==='journal')renderJournal();if(page==='program')renderProgram();
 window.scrollTo(0,0);
}
function icon(ex){
 if(ex.kind==='color')return `<span class="swatch" style="background:#bf755e"></span><span class="swatch" style="background:#82929a"></span>${ex.answers.length===4?'<span class="swatch" style="background:#c7b87c"></span>':''}`;
 return {compare:'◐ ◑',location:'· ●',shape:'△ ○',orientation:'⊥',symbol:ex.answers[0]==='1'?'12':'Aa'}[ex.kind];
}
function exerciseCard(id){const ex=EXERCISES[id];return `<article class="exercise-card"><div class="exercise-icon" aria-hidden="true">${icon(ex)}</div><span class="eyebrow">${ex.category}</span><h3>${ex.name}</h3><p>${ex.description}</p><div class="card-bottom"><span>${ex.answers.length} choices · ${percent(1/ex.answers.length)} chance baseline</span><button data-start="${id}" aria-label="Start ${ex.name}">↗</button></div></article>`;}
function lessonOptions(id){const l=LESSONS[id];return {exercise:l.exercise,mode:'practice',guided:true,lesson:id,planned:l.planned};}
function suggestionCard(id,reason,label='SUGGESTED NEXT'){const l=LESSONS[id];return `<article class="suggestion-card"><span class="eyebrow">${label}</span><h3>${l.name}</h3><p>${escape(reason)}</p><button class="button secondary" data-lesson="${id}">Try this activity →</button></article>`;}
function renderOverview(){
 const practiced=records.filter(hasPractice),next=recommendation(records),areas=new Set(practiced.map(areaFor));
 $('#homeHistory').textContent=practiced.length?`${practiced.length} sessions across ${areas.size} practice areas. Your observations and replays are ready to revisit.`:'Your first session is a fresh page. Every observation has a place here.';
 $('#homeStart').dataset.lesson=next.lesson;$('#homeStart').textContent=practiced.length?'Continue your practice →':'Begin a guided session →';
 const active=records.find(r=>r.status==='active');$('#resumeBanner').hidden=!active;
 if(active)$('#resumeBanner').innerHTML=`<div><strong>A session is waiting for you.</strong><br><span>${exerciseFor(active).name} · ${responses(active).length} of ${active.planned} responses</span></div><button class="button secondary" data-resume="${escape(active.id)}">Continue session →</button>`;
 $('#pathSummary').innerHTML=`<div><span class="eyebrow">${practiced.length?'YOUR PRACTICE SO FAR':'YOUR STARTING POINT'}</span><h2>${practiced.length?areas.size+' '+(areas.size===1?'area':'areas')+' explored.':'Find your rhythm.'}</h2><p>${practiced.length?practiced.length+' sessions recorded, including partial practice. Next suggestion: '+LESSONS[next.lesson].name+'.':'Start with the process, known examples and a few deliberate choices.'}</p><a class="text-link" href="#program">Explore your path →</a></div>`;
 const last=practiced.slice().sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0];
 $('#featuredExercises').innerHTML=suggestionCard(next.lesson,next.reason)+suggestionCard(variety(records),'Change the task for a fresh point of comparison. You can return to your current focus any time.','TRY SOMETHING DIFFERENT')+(last?`<article class="suggestion-card"><span class="eyebrow">KEEP SOMETHING STEADY</span><h3>${escape(exerciseFor(last).name)}</h3><p>Return to your last target set and conditions. Your input preference comes with you.</p><button class="button secondary" data-repeat="${escape(last.id)}">Repeat this setup →</button></article>`:`<article class="suggestion-card"><span class="eyebrow">MAKE IT YOURS</span><h3>Follow your curiosity.</h3><p>Choose colors, shapes, outlines or symbols. Every exercise is available.</p><a class="button secondary" href="#practice">Browse & customize →</a></article>`);
}
function renderProgram(){
 const next=recommendation(records);$('#pathRecommendation').innerHTML=suggestionCard(next.lesson,next.reason);
 $('#weekList').innerHTML=AREAS.map((a,i)=>{const rs=records.filter(r=>areaFor(r)===a.id&&hasPractice(r));return `<article class="area-card"><header><span class="area-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><div><h2>${a.name}</h2><p>${a.description}</p></div><span class="status-badge">${rs.length?rs.length+' sessions · '+rs.reduce((n,r)=>n+responses(r).length,0)+' responses':'Ready to explore'}</span></header><div class="lesson-list">${a.lessons.map(id=>{const l=LESSONS[id];return `<div class="learning-lesson"><div><span class="eyebrow">${lessonState(id,records)}</span><h3>${l.name}</h3><p>${l.purpose}</p></div><button class="button secondary" data-lesson="${id}" aria-label="Begin ${l.name}">Begin →</button></div>`;}).join('')}</div></article>`;}).join('');
}
function summaryMarkup(data){if(data.lesson==='known')return '<p class="small">Known examples are for observation and comparison. This activity has no score.</p>';const s=stats(data);return `<div class="stats-row"><div class="stat"><strong>${s.correct}/${s.answered}</strong><span>Correct / answered</span></div><div class="stat"><strong>${percent(s.accuracy)}</strong><span>Answer accuracy</span></div><div class="stat"><strong>${s.passed}</strong><span>Passed</span></div><div class="stat"><strong>${s.interrupted}</strong><span>Interrupted</span></div></div><p class="small">Chance baseline: ${percent(s.chance)} · Recorded: ${data.trials.length}/${data.planned} · Flagged: ${s.flagged}${s.interval?` · 95% accuracy interval: ${percent(s.interval[0])}–${percent(s.interval[1])}`:''}. Small blocks vary widely by chance. These results do not establish perception without ordinary sight.</p>`;}
function renderJournal(){
 const area=$('#journalArea').value,condition=$('#journalCondition').value,comparison=$('#comparisonGroup').value;
 $('#journalArea').innerHTML='<option value="">All areas</option>'+AREAS.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');$('#journalArea').value=area;
 $('#journalCondition').innerHTML='<option value="">All conditions</option>'+[...new Set(records.map(r=>r.condition))].map(c=>`<option>${escape(c)}</option>`).join('');$('#journalCondition').value=condition;
 $('#showObservationTargets').checked=!!preferences.showTargets;
 $('#journalOverview').innerHTML=`<section class="journal-overview"><div class="overview-metrics"><div><strong>${records.length}</strong><span>saved sessions</span></div><div><strong>${records.reduce((n,r)=>n+responses(r).length,0)}</strong><span>recorded responses</span></div><div><strong>${records.reduce((n,r)=>n+r.notes.length,0)}</strong><span>observations & reflections</span></div></div><h2>The last two weeks</h2>${activityView(records)}</section>`;
 journalGroups=comparableGroups(records);$('#comparisonGroup').innerHTML=journalGroups.length?journalGroups.map((g,i)=>`<option value="${escape(g.key)}">${escape(g.label)}</option>`).join(''):'<option value="">No completed blocks yet</option>';
 if(journalGroups.some(g=>g.key===comparison))$('#comparisonGroup').value=comparison;renderComparison();
 const filtered=filterSessions(records,{area:$('#journalArea').value,condition:$('#journalCondition').value,mode:$('#journalMode').value,audio:$('#journalAudio').checked,query:$('#journalSearch').value.trim()});
 $('#journalCount').textContent=`${filtered.length} of ${records.length} sessions shown`;
 $('#journalList').innerHTML=filtered.length?filtered.map(r=>journalCard(r,preferences.showTargets)).join(''):`<div class="empty-state"><h2>${records.length?'No matching sessions.':'Your observations belong here.'}</h2><p>${records.length?'Try another filter or search phrase.':'Begin a session to start your journal, or import a backup from another browser.'}</p>${records.length?'':'<button class="button primary" data-lesson="welcome">Begin your first session →</button>'}</div>`;
}
function renderComparison(){$('#comparisonChart').innerHTML=trendView(journalGroups.find(g=>g.key===$('#comparisonGroup').value));}
function renderPresets(){$('#savedSetups').innerHTML=presets.length?'<h2>Your saved setups</h2><div class="preset-grid">'+presets.map(p=>`<article><h3>${escape(p.name)}</h3><p>${escape(exerciseFor(p).name)} · ${escape(p.condition)} · ${escape(p.inputMode)}</p><button class="button secondary" data-preset="${escape(p.id)}">Start this setup →</button></article>`).join('')+'</div>':'<p class="small">You can name and save a setup before starting a session.</p>';}
function openSetup(opts){
 readiness.reset();audioFault=false;setup=opts;
 const remembered=cleanSetup({...preferences.setup,...opts,...opts.existing}),lesson=LESSONS[opts.lesson];
 voice.engine=remembered.speechEngine;$('#speechEngine').value=remembered.speechEngine;
 $('#setupTitle').textContent=opts.existing?'Pick up where you left off.':lesson?.name||opts.name||EXERCISES[opts.exercise].name;
 $('#setupDescription').textContent=`${opts.config?'Custom targets: '+exerciseFor(opts).answers.join(', ')+'. ':''}${opts.mode==='measurement'?'Quiet measurement: feedback waits until the block ends.':'Explore, commit, hear feedback, and stay with each target.'} You control when to move on.`;
 $('#setupPurpose').textContent=lesson?.purpose||'';$('#setupPurpose').hidden=!lesson;
 $('#inputMode').value=remembered.inputMode;$('#trialCount').value=String(opts.existing?.planned||lesson?.planned||remembered.planned);$('#trialCount').disabled=!!opts.existing||!!lesson;
 $('#condition').value=remembered.condition;$('#condition').disabled=!!opts.existing;
 $('#conditionNotes').value=remembered.conditionNotes;$('#conditionNotes').disabled=!!opts.existing;
 $('#recordAudio').checked=false;$('#comfortCheck').checked=false;$('#checkStatus').textContent='Not checked yet.';$('#checkVoice').disabled=false;$('#setupError').textContent='';$('#presetName').value=opts.name||'';$('#presetStatus').textContent='';
 $('#setupDialog').showModal();updateSetup();
}
function updateSetup(){
 const v=$('#inputMode').value==='voice';$('#voiceCheck').hidden=!v;
 $('#beginButton').disabled=!$('#comfortCheck').checked||(v&&!checkPassed);
 $('#voiceCompatibility').hidden=!v||voice.available;
 $('#engineInfo').textContent=voice.usesLocal?'On-device English recognition works in compatible Zen, Firefox, Chrome and Edge browsers. It keeps the microphone connected during guide speech while ignoring the guide. First-time preparation downloads about 46 MB; saved offline files are reused. You can cancel before or during loading. Recognition audio stays on this device.':'Browser speech service: your browser may send recognition audio to its provider. Choose On-device to process recognition locally and avoid repeated microphone connections during guide speech. Browser-provided recognition may make system start/stop sounds.';
 if(!checking)$('#checkVoice').textContent=checkPassed?'Check again':voice.needsPreparation?'Set up on-device voice…':'Check audio & microphone';
 if(!storageOK)$('#setupError').textContent='Device storage is unavailable. You can practice, but export before leaving to retain your session.';
}
function checkVoice(){audioFault=false;downloadIntent='recognition';$('#downloadExplanation').textContent='Prepare on-device English recognition. If you have not saved the voice offline, this downloads about 46 MB from jsDelivr and the Vosk Browser project. Saved offline files are reused. You can cancel before or during preparation.';if(!readiness.running&&voice.needsPreparation&&voice.available){$('#downloadDialog').showModal();return;}void readiness.start();}
$('#confirmDownload').onclick=()=>{$('#downloadDialog').close();if(downloadIntent==='offline')void prepareOffline(true);else void readiness.start();};
$('#cancelDownload').onclick=()=>{$('#downloadDialog').close();const offlineChoice=downloadIntent==='offline';$(offlineChoice?'#offlineStatus':'#checkStatus').textContent='Download cancelled. No model download started.';$(offlineChoice?'#prepareOfflineVoice':'#checkVoice').focus();};
function receive(text,source='voice'){
 if(checking){readiness.hear(text);return;}
 if(!session||$('#sessionView').hidden)return;
 $('#lastHeard').textContent=`${source==='keyboard'?'Typed':'Heard'}: “${text}”`;
 session.event('utterance',{text,source});
 const earlyIntent=parseIntent(text,session.data.exercise,session.data.phase,session.data.config);if(['startRecording','stopRecording'].includes(earlyIntent.type)){handle(earlyIntent);return;}
 if(session.data.phase==='reflection'){const d=session.data;const result=reflectionInput({draft:d.reflectionDraft||'',listening:!!d.reflectionListening},text);if(result.action!=='idle'){d.reflectionDraft=result.draft;d.reflectionListening=result.listening;if(result.action==='save')saveReflection();else {save();renderSession();if(result.action==='start')say('Reflection started. Speak freely. Say save reflection when you are finished, or cancel reflection to discard the draft.');if(result.action==='cancel')say('Reflection draft discarded.');}return;}}
 handle(parseIntent(text,session.data.exercise,session.data.phase,session.data.config));
}
function setVoiceState(state){
 if(state==='listening')readiness.started();
 $('#voiceStatus').textContent={off:voiceMode?'Microphone off':'Touch / keyboard',speaking:'Guide speaking · listen',connecting:'Starting microphone…',listening:'Listening · take your time',reconnecting:'Reconnecting microphone…'}[state]||state;
 $('.voice-indicator').classList.toggle('listening',state==='listening');
}
function voiceFault(message){
 audioFault=true;
 if(checking){readiness.fail(message);return;}
 if(!session||$('#sessionView').hidden)return;
 if(!voiceMode){audioFault=false;preferences.spoken=false;voice.dispose();session.event('audio-unavailable',{message});save();renderSession();$('#sessionPrompt').textContent=lastPrompt;toast('Spoken audio is unavailable. Touch and keyboard controls remain ready.');return;}
 clearSessionTimer();session.pause(message);session.event('voice-fault',{message});save();renderSession();
 $('#reconnectButton').hidden=false;$('#sessionPrompt').textContent=message;$('#voiceStatus').textContent='Paused · voice needs attention';
 // Announce a microphone failure once; never recursively retry failed synthesis.
 if(!message.startsWith('Spoken audio'))void voice.speak(`Session paused. ${message}`,{rate:preferences.rate});
}
async function begin(){
 if($('#beginButton').disabled)return;
 const currentSetup=setup;preferences.setup=currentSetupValues();persistPreferences();
 readiness.reset();voiceMode=$('#inputMode').value==='voice';audioFault=false;
 const options={...setup,planned:Number($('#trialCount').value),condition:$('#condition').value,conditionNotes:$('#conditionNotes').value};
 const candidate=new Session(options,setup.existing||null);
 if($('#recordAudio').checked){$('#beginButton').disabled=true;try{await recorder.start(candidate.data.id);candidate.data.hasAudio=true;candidate.data.audioSegments??=[];candidate.data.audioSegments.push({startedAt:recorder.active.startedAt,id:recorder.active.segment,mimeType:recorder.active.recorder.mimeType||'browser-selected'});}catch(e){$('#setupError').textContent='Recording could not start: '+e.message+' Uncheck recording to continue without audio.';updateSetup();return;}}else $('#recordingStatus').textContent='Audio recording off';
 if(!$('#setupDialog').open||setup!==currentSetup){await recorder.stop();return;}
 session=candidate;session.data.reflectionListening=false;session.data.recordingWanted=$('#recordAudio').checked;session.data.speechEngine=$('#speechEngine').value;
 if(setup.existing){session.event('recovered');if(session.data.phase!=='paused')session.pause('Recovered after leaving the page');}
 session.data.inputMode=$('#inputMode').value;save();$('#setupDialog').close();$('#shell').hidden=true;$('#sessionView').hidden=false;$('#lastHeard').textContent='';$('#reconnectButton').hidden=true;
 window.scrollTo(0,0);requestWake();renderSession();if(session.data.inputMode==='keyboard')focusCommand();else $('#sessionActions button')?.focus();
 if(voiceMode)voice.enabled=true;
 say(setup.existing?'Your session is saved. Say resume when you are ready.':introText());
}
function introText(){const ex=exerciseFor(session.data),lesson=lessonFor(session.data);return `${lesson?.name||ex.name}. ${lesson?.purpose||''} ${ex.description} Your choices are ${ex.answers.join(', ')}. ${session.data.inputMode==='keyboard'?'Type commands and press Enter. Spoken feedback follows your settings. ':''}${session.data.condition==='Unmasked, closed eyes'?'Close your eyes when comfortable.':session.data.condition.includes('Unmasked')?'Keep your eyes open for this demonstration.':'Put on your blindfold when comfortable.'} The target will stay on screen. Say I am ready to begin. Say help at any time after I finish speaking.`;}
function focusCommand(){if(session?.data.inputMode==='keyboard'&&!$('#sessionView').hidden&&!document.querySelector('dialog[open]'))$('#commandInput').focus({preventScroll:true});}
function say(text){if(session?.data.inputMode==='keyboard')text=text.replace(/\bSay\b/g,'Type').replace(/\bsay\b/g,'type');if(session){session.event('prompt',{text});save();}lastPrompt=text;$('#sessionPrompt').textContent=text;return voice.speak(text,{enabled:voiceMode||preferences.spoken,rate:preferences.rate});}
function shortSay(text){if(!session.data.quiet)return say(text);}
function clearSessionTimer(){clearTimeout(sessionTimer);sessionTimer=null;}
function enterSettle(){session.phase('settle');save();renderSession();say('Let your shoulders and jaw soften. Breathe normally. Notice the support beneath you. There is nothing to force. Take a quiet moment, or say ready when you want to continue.');sessionTimer=setTimeout(()=>{if(session?.data.phase==='settle')shortSay('Take the time you need. Say ready to continue.');},120000);}
function enterBaseline(){clearSessionTimer();session.phase('baseline');save();renderSession();say('The screen is blank. Notice any background colors, patterns, or sensations already present. You do not need to see anything. Describe what you notice, or say next.');}
function familiarTarget(){const ex=exerciseFor(session.data),idx=session.data.familiarIndex%ex.answers.length;
 if(ex.kind==='compare'){const keys=Object.keys(COLORS),c=keys[idx%4];return {answer:'same',first:c,second:c};}
 if(ex.kind==='shape'){const wanted=ex.answers[idx];const target=makeTarget(session.data.exercise,()=>0,session.data.config);target.answer=wanted;if(ex.settings.ask==='both')[target.color,target.shape]=wanted.split(' ');else if(ex.settings.ask==='shape')target.shape=wanted;else target.color=wanted;return target;}
 return {answer:ex.answers[idx]};
}
function enterFamiliar(){clearSessionTimer();session.phase('familiar');save();renderSession();const t=familiarTarget();say(`This is a known example: ${session.data.exercise==='compare'?t.first:t.answer}. Explore it without scoring. ${session.data.familiarIndex+1>=familiarLimit()?(learningSteps().at(-1)==='familiar'?'Say next to finish these known examples and reflect.':'Say next to begin unknown targets.'):'Say next for another example. '+(learningSteps().at(-1)==='familiar'?'Say end session to finish early.':'Say start practice to move to unknown targets.')}`);}
function startTarget(){clearSessionTimer();
 if(session.data.phase==='familiar'||['intro','baseline','settle'].includes(session.data.phase))session.event('practice-start');
 if(!session.target()){if(lessonFor(session.data))session.data.lessonCompleted=true;save();renderSession();onFinished();return;}
 save();renderSession();
 say(session.data.exercise==='compare'?'The first color is on screen. Explore it, then say second.':session.data.quiet?'Target ready.':'A target is on screen. Notice whatever comes up. Describe it, say my answer is followed by your choice, or say pass.');
}
function learningSteps(){return lessonFor(session.data)?.steps||(session.data.guided?['settle','baseline',...(session.data.skipFamiliar||session.data.mode==='measurement'?[]:['familiar']),'practice']:['practice']);}
function enterLearningStep(step){if(step==='settle')enterSettle();else if(step==='baseline')enterBaseline();else if(step==='familiar')enterFamiliar();else if(step==='practice')startTarget();else finish();}
function familiarLimit(){return session.data.lesson==='known'?4:exerciseFor(session.data).answers.length;}
function next(){const p=session.data.phase,steps=learningSteps();
 if(p==='intro')enterLearningStep(steps[0]);
 else if(p==='settle'||p==='baseline')enterLearningStep(steps[steps.indexOf(p)+1]);
 else if(p==='familiar'){if(session.data.familiarIndex+1>=familiarLimit()){if(steps.at(-1)==='familiar'){session.data.lessonCompleted=true;finish();}else startTarget();}else {session.data.familiarIndex++;enterFamiliar();}}
 else if(p==='feedback')startTarget();
 else if(p==='explore'&&session.data.exercise==='compare'&&session.data.current.part===1){session.data.current.part=2;save();renderSession();say('The second color is on screen. Are the two colors the same or different? Say my answer is, followed by your choice.');}
}
function finish(){clearSessionTimer();if(lessonFor(session.data)&&responses(session.data).length>=session.data.planned)session.data.lessonCompleted=true;session.finish();save();renderSession();releaseWake();onFinished();}
function onFinished(){const s=stats(session.data);say(`Session complete. ${session.data.condition==='Unmasked, closed eyes'?'You can open your eyes.':session.data.condition.includes('Unmasked')?'Take a moment to settle.':'You can remove your blindfold.'} Stay for a reflection if you like. ${session.data.lesson==='known'?'You explored known examples; these are not scored.':`You answered ${s.answered} targets, with ${s.correct} correct, and passed ${s.passed}.`} Say start reflection, then speak freely. Say save reflection when finished. You can also say repeat session, start measurement, or finish session.`);}
function handle(intent){
 if(!session)return;
 const d=session.data,p=d.phase;
 switch(intent.type){
 case 'end':if(p==='reflection'){leave();return;}finish();return;
 case 'pause':if(d.status!=='active')return;clearSessionTimer();session.pause();save();renderSession();say('Paused. Your target and place are saved. Say resume when ready.');return;
 case 'resume':if(audioFault){say('Reconnect the microphone with the button before continuing, or use touch mode.');return;}session.resume();save();renderSession();say(resumeText());return;
 case 'leak':session.flag('User reported a mask or light leak');clearSessionTimer();session.pause('Check the mask before continuing');save();renderSession();say('Paused. Check your mask comfortably. This target is flagged in your record. Say resume when ready.');return;
 case 'quiet':d.quiet=true;save();say('Less talking. I will keep prompts brief.');return;
 case 'more':d.quiet=false;save();say('Full guidance restored.');return;
 case 'startRecording':void resumeSessionRecording();return;
 case 'stopRecording':void stopSessionRecording('Stopped by user');return;
 case 'help':say(helpText());return;
 case 'repeat':say(lastPrompt||helpText());return;
 case 'listening':say('Yes. I listen after each prompt finishes.');return;
 }
 if(p==='paused'){if(intent.type==='note'){session.note(intent.text);save();}else say('The session is paused. Say resume or end session.');return;}
 if(intent.type==='stay'){clearSessionTimer();session.note(intent.text||'More time');save();shortSay('Take your time. Say next when ready, or make an answer.');return;}
 if(p==='reflection'){
  if(intent.type==='again'||intent.type==='measure'){repeatSession(intent.type==='measure'?'measurement':d.mode);return;}
  if(intent.type==='next'){leave();return;}
  say('Say start reflection to dictate, save reflection when finished, or finish session to return home.');return;
 }
 if(intent.type==='ready'){
  if(p==='familiar'){if(learningSteps().at(-1)==='familiar'){if(session.data.familiarIndex+1>=familiarLimit())session.data.lessonCompleted=true;finish();}else startTarget();return;}if(['intro','settle','baseline'].includes(p)){next();return;}
 }
 if(intent.type==='next'||intent.type==='second'){next();return;}
 if(intent.type==='answer'){
  if(!['explore','confirm'].includes(p)){say('Answers are only recorded for an unknown target. Say next to continue.');return;}
  if(d.exercise==='compare'&&d.current.part===1){say('Explore the second color first. Say second.');return;}
  if(!intent.answer){say(`Please choose one answer: ${exerciseFor(d).answers.join(', ')}. Begin with my answer is.`);return;}
  session.propose(intent.answer);save();renderSession();say(`I heard ${intent.answer}. Is that your answer? Say yes, or no to change it.`);return;
 }
 if(intent.type==='no'&&p==='confirm'){d.pending=null;session.phase('explore');save();renderSession();say('Answer not recorded. Take your time, then say my answer is followed by your choice.');return;}
 if((intent.type==='yes'&&p==='confirm')||intent.type==='pass'){
  if(!session.commit(intent.type==='pass')){say('There is no answer waiting to be recorded.');return;}
  save();renderSession();const t=d.trials.at(-1);
  if(d.mode==='measurement')say('Response recorded. Say next when ready.');
  else say(`${t.status==='passed'?'You passed.':`You chose ${t.answer}.`} The target was ${t.target.answer}. Stay with it, or say next.`);
  return;
 }
 if(intent.type==='reflect'){finish();return;}
 if(intent.type==='note'){session.note(intent.text.replace(/^note\s*/i,''),p==='familiar'?familiarTarget():session.data.current?.target);save();return;}
 shortSay('Say help to hear the available commands.');
}
function resumeText(){const p=session.data.phase;if(p==='confirm')return `Your answer ${session.data.pending} is waiting. Say yes to confirm, or no to change it.`;if(p==='explore')return 'Resumed. Your target is still on screen. Take your time.';if(p==='familiar')return `Resumed. The known example is ${familiarTarget().answer}. Say next or start practice.`;if(p==='feedback')return 'Resumed. Your response is recorded. Say next when ready.';return 'Resumed. Say ready or next when you want to continue.';}
function helpText(){const ex=exerciseFor(session.data);return `${ex.description} Your choices are ${ex.answers.join(', ')}. ${session.data.phase==='familiar'?'This is familiarization. Say start practice for unknown targets.':'Describe impressions freely. To answer, say my answer is, followed by your choice. I will ask you to confirm.'} Say pass, more time, pause, less talking, or end session. ${session.data.exercise==='compare'?'Say second to move from the first color to the second.':''}`;}
async function repeatSession(newMode){
 const keepRecording=!!recorder.active;await recorder.stop();session.event('block-left');
 const old=session.data;old.reflectionListening=false;save();session=new Session({exercise:old.exercise,mode:newMode,planned:old.planned,condition:old.condition,conditionNotes:old.conditionNotes,config:old.config});session.data.inputMode=old.inputMode||'touch';session.data.speechEngine=old.speechEngine;session.data.recordingWanted=keepRecording;if(keepRecording){try{await recorder.start(session.data.id);session.data.hasAudio=true;session.data.audioSegments=[{startedAt:recorder.active.startedAt,id:recorder.active.segment,mimeType:recorder.active.recorder.mimeType||'browser-selected'}];}catch(e){toast('New block audio could not start: '+e.message);}}save();requestWake();renderSession();say(`A new ${newMode==='measurement'?'measurement':'practice'} block. ${newMode==='measurement'?'Feedback will wait until the end. ':''}Your previous session is saved. Say ready to begin.`);
}
function renderTarget(){
 const d=session.data,ex=exerciseFor(d),visiblePhase=d.phase==='paused'?d.beforePause:d.phase,active=['familiar','explore','confirm','feedback'].includes(visiblePhase);
 $('#sessionView').classList.toggle('target-active',!!active);const el=$('#target');el.innerHTML='';el.style.background=active?'#f6f5ef':'var(--bg)';
 if(!active)return;
 const t=visiblePhase==='familiar'?familiarTarget():d.current?.target;if(!t)return;
 if(ex.kind==='color')el.style.background=COLORS[t.answer];
 else if(ex.kind==='compare')el.style.background=COLORS[visiblePhase==='familiar'?t.first:(d.current.part===1?t.first:t.second)];
 else if(ex.kind==='symbol')el.innerHTML=`<div class="target-symbol">${t.answer.toUpperCase()}</div>`;
 else if(ex.kind==='location')el.innerHTML=`<div class="target-shape circle" style="left:${t.answer==='left'?'25':'75'}%;width:min(25vw,190px);height:min(25vw,190px)"></div>`;
 else el.innerHTML=`<div class="target-art">${shapeSVG(t)}</div>`;
}
function action(label,action,primary=false){return `<button class="button ${primary?'primary':'secondary'}" data-action="${action}">${label}</button>`;}
function renderSession(){
 $('#resumeRecording').hidden=!!recorder.active||!(session.data.recordingWanted||session.data.hasAudio);
 const focused=document.activeElement,focusWasDynamic=!!focused?.closest('#sessionActions,#touchAnswers,#phaseExtra');const keepFocus=focused?.id;
 const d=session.data,ex=exerciseFor(d),p=d.phase;renderTarget();
 const visible=p==='paused'?d.beforePause:p;const target=['familiar','explore','confirm','feedback'].includes(visible)?(visible==='familiar'?familiarTarget():d.current?.target):null;const frame={phase:p,kind:ex.kind,target:target?structuredClone(target):null,part:d.current?.part||1,number:d.current?.number||null};const signature=JSON.stringify(frame);if(d.lastScreen!==signature){d.lastScreen=signature;session.event('screen',frame);save();}
 $('#sessionMode').textContent=`${ex.name} · ${d.mode==='measurement'?'Measurement':'Practice'}`;
 const titles={intro:'Make yourself comfortable.',settle:'Nothing to force.',baseline:'Notice what is already here.',familiar:'Get to know the target.',explore:'What do you notice?',confirm:'Is that your answer?',feedback:'A moment to notice.',paused:'Take a pause.',reflection:'Make room for reflection.'};
 $('#sessionTitle').textContent=titles[p]||'Take your time.';
 $('#phaseLabel').textContent=p==='explore'||p==='confirm'||p==='feedback'?`TARGET ${d.current?.number||d.trials.length} OF ${d.planned} · ${p==='feedback'?'RECORDED':p==='confirm'?'CONFIRM YOUR ANSWER':'EXPLORE'}`:p==='reflection'?'SESSION COMPLETE':p==='familiar'?'KNOWN EXAMPLE · NOT SCORED':p==='baseline'?'BLANK SCREEN · NOT SCORED':p.toUpperCase();
 $('#phaseExtra').innerHTML='';$('#touchAnswers').innerHTML='';
 let actions='';
 if(p==='intro')actions=action('I’m ready →','ready',true);
 if(p==='settle')actions=action('Continue when ready →','ready',true);
 if(p==='baseline')actions=action('Continue →','next',true);
 if(p==='familiar'){const last=d.familiarIndex+1>=familiarLimit(),only=learningSteps().at(-1)==='familiar';$('#phaseLabel').textContent=`KNOWN EXAMPLE ${d.familiarIndex+1} OF ${familiarLimit()} · NOT SCORED`;actions=action(last?(only?'Finish & reflect →':'Start practice →'):'Next example →','next',true)+(last?'':action(only?'Finish early':'Skip to practice','ready'));}
 if(p==='explore'){
  if(d.exercise==='compare'&&d.current.part===1)actions=action('Show second color →','second',true);
  else $('#touchAnswers').innerHTML=ex.answers.map(a=>`<button data-answer="${a}">${a.length===1?a.toUpperCase():a[0].toUpperCase()+a.slice(1)}</button>`).join('');
  actions+=action('More time','stay')+action('Pass','pass');
 }
 if(p==='confirm')actions=action('Yes, confirm','yes',true)+action('No, change it','no');
 if(p==='feedback')actions=action('Stay with this','stay')+action(d.trials.length>=d.planned?'Finish & reflect →':'Next target →','next',true);
 if(p==='paused')actions=action('Resume →','resume',true)+action('Finish session','end');
 if(p==='reflection'){
  $('#phaseExtra').innerHTML=summaryMarkup(d)+`<label for="reflectionText">What would you like to remember?</label><textarea id="reflectionText" maxlength="4000" placeholder="Something you noticed, or something to try next time…">${escape(d.reflectionDraft||'')}</textarea><button class="button secondary small-button" id="startReflection" ${voiceMode?'':'hidden'}>Start dictation</button><button class="button secondary small-button" id="saveReflection">Save reflection</button><p class="small">${d.notes.length} note${d.notes.length===1?'':'s'} saved. ${d.reflectionListening?'Dictating into your draft. Say “save reflection” to finish.':(voiceMode?'Say “start reflection” to dictate, then “save reflection”. Silence never saves a reflection.':'Type your reflection above and save it, or use start reflection and save reflection in the command field.')}</p>`;
  const nextChoice=recommendation(records);$('#phaseExtra').insertAdjacentHTML('beforeend',`<div class="session-next"><h3>${d.lessonCompleted?'Lesson complete.':'Your practice is recorded.'}</h3><p>${escape(nextChoice.reason)}</p><button class="button secondary" data-next-lesson="${nextChoice.lesson}">Suggested next: ${LESSONS[nextChoice.lesson].name}</button><button class="button secondary" data-next-lesson="${variety(records)}">Try something different</button></div>`);actions=`<button class="button primary" data-replay="${escape(d.id)}">▶ Replay</button>`+action('Practice again','again')+action('Quiet measurement','measure')+action('Return to overview','home')+`<button class="button secondary" data-export="${escape(d.id)}">Export files</button>`;
 }
 $('#sessionActions').innerHTML=actions;$('#pauseButton').textContent=p==='paused'?'Resume':'Pause';$('#pauseButton').hidden=p==='reflection';
 $('#endButton').textContent=p==='reflection'?'Back to overview':'End session';
 if(d.inputMode==='keyboard'&&keepFocus!=='reflectionText')focusCommand();
 else if(focusWasDynamic){const same=keepFocus?document.getElementById(keepFocus):null;const next=same||$('#touchAnswers button')||$('#sessionActions .primary')||$('#sessionActions button');next?.focus({preventScroll:true});}
}
async function requestWake(){try{if(navigator.wakeLock)wake=await navigator.wakeLock.request('screen');}catch{}}
function releaseWake(){try{wake?.release();}catch{}wake=null;}
async function leave(){await recorder.stop();session?.event('session-left');if(session)session.data.reflectionListening=false;save();clearSessionTimer();voice.dispose();releaseWake();session=null;$('#sessionView').hidden=true;$('#shell').hidden=false;location.hash='home';route();}
function download(data,name){const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function saveReflection(){const d=session.data;const t=(d.reflectionDraft||'').trim();d.reflectionListening=false;if(t){session.note(t);d.reflectionDraft='';save();renderSession();say('Reflection saved.');}else {save();renderSession();toast('Your reflection draft is empty.');}}
 document.addEventListener('input',e=>{if(e.target.id==='reflectionText'&&session){session.data.reflectionDraft=e.target.value;save();}});
 async function exportSession(id){try{if(recorder.active?.id===id){session.event('recording-stopped');await recorder.stop();save();}const r=records.find(r=>r.id===id);$('#exportDescription').textContent=r.hasAudio?'Includes personal notes and microphone audio. Sharing is your choice.':'Includes targets, responses, prompts and personal notes.';$('#exportDialog').showModal();$('#exportJSON').onclick=()=>download(r,`mindsight-${id}.json`);$('#exportTranscript').onclick=()=>saveBlob(new Blob(['UNVERIFIED LIVE RECOGNITION — not a transcript generated from the recording.\n\n'+r.events.filter(e=>e.type==='utterance').map(e=>e.at+'  '+e.text).join('\n')],{type:'text/plain'}),`mindsight-${id}-recognition.txt`);$('#watchReplay').disabled=r.status==='active';$('#watchReplay').onclick=()=>watchReplay(id);$('#exportReplay').onclick=async()=>{try{const audio=r.hasAudio?await audioSegments(id):[];if(r.hasAudio&&!audio.length)toast('No saved audio was found. Exporting the screen replay only.');saveBlob(new Blob([await replayDocument(r,audio)],{type:'text/html'}),`mindsight-${id}-replay.html`);}catch(e){toast('Replay export failed: '+e.message);}};$('#exportAudio').hidden=!r.hasAudio;$('#exportAudio').onclick=async()=>{try{const segments=await audioSegments(id);if(!segments.length)toast('No saved audio found.');segments.forEach((s,i)=>saveBlob(s.blob,`mindsight-${id}-${i+1}.${s.blob.type.includes('ogg')?'ogg':s.blob.type.includes('mp4')?'m4a':'webm'}`));}catch(e){toast('Audio export failed: '+e.message);}};}catch(e){toast('Export failed: '+e.message);}}
 $('#stopRecording').onclick=()=>stopSessionRecording('Stopped by user');$('#resumeRecording').onclick=resumeSessionRecording;
 const systemTheme=window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme(){document.documentElement.dataset.theme=preferences.theme==='dark'||(preferences.theme!=='light'&&systemTheme.matches)?'dark':'light';}
systemTheme.addEventListener('change',applyTheme);
function applyPrefs(){applyTheme();$('#themeMode').value=preferences.theme||'system';document.documentElement.classList.toggle('large-text',preferences.large);$('#speechRate').value=String(preferences.rate);$('#spokenPrompts').checked=preferences.spoken;$('#largeText').checked=preferences.large;}
$('#allExercises').innerHTML=GROUPS.map(g=>`<section class="exercise-group"><h2>${g.name}</h2><div class="exercise-grid all">${g.ids.map(exerciseCard).join('')}</div></section>`).join('');
applyPrefs();renderPresets();renderProgram();route();
window.addEventListener('hashchange',route);
document.addEventListener('click',e=>{
 const start=e.target.closest('[data-start]');if(start){openSetup({exercise:start.dataset.start,mode:start.dataset.mode||mode,guided:start.dataset.guided==='true'});return;}
 const repeat=e.target.closest('[data-repeat]');if(repeat){const r=records.find(r=>r.id===repeat.dataset.repeat);openSetup({exercise:r.exercise,mode:r.mode,config:r.config,...cleanSetup({...preferences.setup,...r})});return;}
 const lesson=e.target.closest('[data-lesson]');if(lesson){openSetup(lessonOptions(lesson.dataset.lesson));return;}
 const preset=e.target.closest('[data-preset]');if(preset){openSetup(presets.find(p=>p.id===preset.dataset.preset));return;}
 const following=e.target.closest('[data-next-lesson]');if(following){const id=following.dataset.nextLesson;void leave().then(()=>openSetup(lessonOptions(id)));return;}
 const replay=e.target.closest('[data-replay]');if(replay){void watchReplay(replay.dataset.replay);return;}
 const resume=e.target.closest('[data-resume]');if(resume){const r=records.find(r=>r.id===resume.dataset.resume);openSetup({exercise:r.exercise,mode:r.mode,guided:r.guided,existing:r});return;}
 const exp=e.target.closest('[data-export]');if(exp){void exportSession(exp.dataset.export);return;}
 const act=e.target.closest('[data-action]');if(act){if(act.dataset.action==='home'){leave();return;}handle({type:act.dataset.action});return;}
 const answer=e.target.closest('[data-answer]');if(answer){handle({type:'answer',answer:answer.dataset.answer});return;}
 if(e.target.id==='startReflection')receive('start reflection');
 if(e.target.id==='saveReflection')saveReflection();
});
$('#practiceMode').onclick=()=>setMode('practice');$('#measureMode').onclick=()=>setMode('measurement');
function setMode(value){mode=value;$('#practiceMode').classList.toggle('selected',mode==='practice');$('#measureMode').classList.toggle('selected',mode==='measurement');$('#practiceMode').setAttribute('aria-pressed',String(mode==='practice'));$('#measureMode').setAttribute('aria-pressed',String(mode==='measurement'));$('#modeDescription').textContent=mode==='practice'?'Time to describe impressions, hear feedback, and stay with each target.':'One confirmed response per target. Feedback waits until the end. All passes and interruptions stay in your record.';}
$('#speechEngine').onchange=()=>{readiness.reset();voice.engine=$('#speechEngine').value;updateSetup();};
$('#checkVoice').onclick=checkVoice;$('#comfortCheck').onchange=updateSetup;
$('#inputMode').onchange=()=>{readiness.reset();updateSetup();};
$('#beginButton').onclick=begin;
$('#setupDialog').addEventListener('close',()=>{if(!session)readiness.reset();});
$('#settingsButton').onclick=()=>$('#settingsDialog').showModal();
for(const id of ['speechRate','spokenPrompts','largeText','themeMode'])$('#'+id).onchange=()=>{preferences={...preferences,theme:$('#themeMode').value,rate:Number($('#speechRate').value),spoken:$('#spokenPrompts').checked,large:$('#largeText').checked};applyPrefs();try{localStorage.setItem(prefKey,JSON.stringify(preferences));}catch{toast('Preferences could not be saved.');}};
$('#endButton').onclick=()=>handle({type:'end'});$('#pauseButton').onclick=()=>handle({type:session.data.phase==='paused'?'resume':'pause'});$('#helpButton').onclick=()=>handle({type:'help'});
$('#sessionBrand').onclick=e=>{e.preventDefault();handle({type:'end'});};
$('#reconnectButton').onclick=()=>{audioFault=false;voice.dispose();voice.enabled=voiceMode;$('#reconnectButton').hidden=true;say('Reconnecting. Say resume when the listening indicator is ready.');};
$('#commandForm').onsubmit=e=>{e.preventDefault();const value=$('#commandInput').value.trim();if(!value)return;$('#commandInput').value='';receive(value,'keyboard');focusCommand();};
$('#exportAll').onclick=()=>download({version:3,exportedAt:stamp(),sessions:records},'mindsight-journal.json');
$('#favoritePractice').onclick=()=>{const r=favorite(records);if(r)openSetup({exercise:r.exercise,mode:r.mode,config:r.config,...cleanSetup({...preferences.setup,...r})});else {location.hash='practice';route();}};
$('#savePreset').onclick=()=>{
 try{if(!presetsOK)throw Error('Existing saved setups could not be read. Export a backup before changing them.');const p=cleanPreset({id:crypto.randomUUID(),name:$('#presetName').value,exercise:setup.exercise,config:setup.config||setup.existing?.config,mode:setup.mode,...currentSetupValues()});const next=[...presets,p];localStorage.setItem(presetKey,JSON.stringify(next));presets=next;renderPresets();$('#presetStatus').textContent='Saved. Find it in Practice or Go to.';}
 catch(e){$('#presetStatus').textContent=e.message;}
};
for(const id of ['journalArea','journalCondition','journalMode','journalAudio'])$('#'+id).onchange=renderJournal;
$('#journalSearch').oninput=renderJournal;$('#comparisonGroup').onchange=renderComparison;
$('#showObservationTargets').onchange=()=>{preferences.showTargets=$('#showObservationTargets').checked;persistPreferences();renderJournal();};
$('#completeBackup').onclick=async()=>{
 $('#completeBackup').disabled=true;const status=$('#backupStatus');
 try{if(storageBlocked||!presetsOK)throw Error('Existing data could not be read. It has been left unchanged.');const archiveRows=JSON.parse(localStorage.getItem(archiveKey)||'[]'),legacy=JSON.parse(localStorage.getItem('ml2-sessions')||'null');const backup=await makeBackup({sessions:structuredClone(records),preferences,presets,archives:archiveRows,legacy},audioSegments,t=>status.textContent=t);const blob=new Blob([JSON.stringify(backup)],{type:'application/json'});if(blob.size>BACKUP_LIMIT)throw Error('The combined backup exceeds 256 MB. Export individual sessions and recordings separately.');saveBlob(blob,`mindsight-backup-${new Date().toISOString().slice(0,10)}.json`);status.textContent=`Backup downloaded: ${backup.sessions.length} sessions, ${backup.audio.length} audio segments, ${backup.presets.length} saved setups, preferences and earlier archives.${backup.missingAudio.length?' Audio could not be found for '+backup.missingAudio.length+' sessions; those recordings are missing from this file.':''}`;}
 catch(e){status.textContent='Backup could not finish: '+e.message;}finally{$('#completeBackup').disabled=false;}
};
async function refreshOfflineStatus(){const s=await offline.status();$('#offlineStatus').textContent=s.error||`App: ${s.app?'saved for offline use':'not saved offline yet'}. English recognition: ${s.voice?'saved offline':'not saved offline'}.`;}
async function prepareOffline(withVoice=false){
 $('#prepareOffline').disabled=true;$('#prepareOfflineVoice').disabled=true;$('#cancelOffline').hidden=false;
 try{const result=await offline.prepare(withVoice);$('#offlineStatus').textContent=`${withVoice?'English recognition':'The app'} is saved offline.${withVoice&&!result.app?' Save the app offline too before disconnecting.':''}${result.pending?' Close all MindSight tabs and reopen to use the update.':' Ready on this device.'}`;}
 catch(e){$('#offlineStatus').textContent=e.message;}finally{$('#prepareOffline').disabled=false;$('#prepareOfflineVoice').disabled=false;$('#cancelOffline').hidden=true;}
}
$('#prepareOffline').onclick=()=>void prepareOffline();
$('#prepareOfflineVoice').onclick=()=>{downloadIntent='offline';$('#downloadExplanation').textContent='Download about 46 MB of English recognition files from jsDelivr and the Vosk Browser project, and save them on this device for offline use. You can cancel now or while downloading. This does not start the microphone.';$('#downloadDialog').showModal();};
$('#cancelOffline').onclick=()=>{offline.cancel();$('#offlineStatus').textContent='Cancelling download…';};
$('#offlineSettings').addEventListener('toggle',()=>{if($('#offlineSettings').open&&!offline.job)void refreshOfflineStatus();});
$('#exportLegacy').onclick=()=>{try{const raw=localStorage.getItem('ml2-sessions');if(!raw){$('#legacyStatus').textContent='No earlier records found in this browser.';return;}download({legacy:true,rawSessions:JSON.parse(raw)},'mindsight-lab-earlier-records.json');}catch{$('#legacyStatus').textContent='Earlier records could not be read.';}};
document.addEventListener('keydown',e=>{
 if(!session||document.querySelector('dialog[open]')||e.altKey||e.ctrlKey||e.metaKey||e.isComposing)return;
 const focus=document.activeElement,p=session.data.phase;
 if(e.key==='Escape'&&!e.repeat){e.preventDefault();voice.cancel();if(p!=='reflection')handle({type:p==='paused'?'resume':'pause'});return;}
 if(focus?.matches('input,textarea,select,[contenteditable="true"]'))return;
 if(session.data.inputMode==='keyboard'&&e.key.length===1){e.preventDefault();focusCommand();const input=$('#commandInput');if(input.value.length<input.maxLength)input.setRangeText(e.key,input.selectionStart,input.selectionEnd,'end');return;}
 const answers=$$('#touchAnswers button');if(answers.includes(focus)&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();answers[(answers.indexOf(focus)+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)+answers.length)%answers.length].focus();}
});
window.addEventListener('focus',focusCommand);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&session){if(recorder.active)void stopSessionRecording('Page moved to the background');if(session.data.status==='active'){clearSessionTimer();session.pause('Page moved to the background');voice.dispose();session.event('backgrounded');save();renderSession();$('#sessionPrompt').textContent='Paused while the page was in the background. Resume when ready. If recording stopped, choose Resume recording.';$('#reconnectButton').hidden=!voiceMode;audioFault=voiceMode;releaseWake();}else voice.dispose();}else if(!document.hidden&&session)requestWake();});
window.addEventListener('pagehide',()=>{void recorder.stop();if(session?.data.status==='active'){session.pause('Page closed or refreshed');save();}voice.dispose();releaseWake();});
if(!storageOK)toast('Storage could not be read. Your existing data has not been overwritten.');

let readerTools=[];
function readerConfig(){return {mode:$('#readerMode').value,url:$('#readerURL').value.trim(),model:$('#readerModel').value.trim()||'tts-1',voice:$('#readerVoice').value.trim()||'alloy',tool:$('#readerTool').value,arguments:$('#readerArguments').value};}
function saveReader(){preferences.reader=readerConfig();voice.reader.configure(preferences.reader,$('#readerToken').value);try{localStorage.setItem(prefKey,JSON.stringify(preferences));}catch{toast('Reader preferences could not be saved.');}}
function applyReaderPreferences(){const r=preferences.reader||{mode:'browser'};for(const [id,field] of [['readerMode','mode'],['readerURL','url'],['readerModel','model'],['readerVoice','voice'],['readerArguments','arguments']])$('#'+id).value=r[field]||(field==='arguments'?'{}':'');$('#readerToken').value='';$('#readerTool').replaceChildren(new Option(r.tool||'Discover, then select a speech tool',r.tool||''));voice.reader.configure(r);}
const savedReader=preferences.reader||{mode:'browser'};for(const [id,field] of [['readerMode','mode'],['readerURL','url'],['readerModel','model'],['readerVoice','voice'],['readerArguments','arguments']]){if(savedReader[field])$('#'+id).value=savedReader[field];$('#'+id).onchange=saveReader;}if(savedReader.tool){const option=new Option(savedReader.tool,savedReader.tool);$('#readerTool').add(option);$('#readerTool').value=savedReader.tool;}voice.reader.configure(savedReader);$('#readerToken').onchange=saveReader;$('#readerTool').onchange=()=>{saveReader();$('#readerSchema').textContent=JSON.stringify(readerTools.find(t=>t.name===$('#readerTool').value)?.inputSchema||{},null,2);};
$('#discoverReader').onclick=async()=>{saveReader();$('#readerStatus').textContent='Connecting…';try{if($('#readerMode').value!=='mcp')throw Error('Select Local MCP first.');readerTools=await voice.reader.list();$('#readerTool').replaceChildren(new Option('Select a speech tool',''));for(const t of readerTools)$('#readerTool').add(new Option(t.name,t.name));$('#readerStatus').textContent='Choose a speech tool and match its input schema below. Discovery does not invoke tools.';}catch(e){$('#readerStatus').textContent=e.message+' Check the endpoint, CORS and local-network permissions.';}};
$('#testReader').onclick=async()=>{saveReader();$('#readerStatus').textContent='Testing selected voice…';try{if(voice.reader.config.mode==='browser'){await voice.speak('Your MindSight voice reader is ready.',{rate:preferences.rate});}else await voice.reader.speak('Your MindSight voice reader is ready.');$('#readerStatus').textContent='Test finished. Confirm that you heard the phrase before starting a voice session.';}catch(e){$('#readerStatus').textContent='Could not play: '+e.message+' Check CORS and local-network permissions.';}};
$('#settingsDialog').addEventListener('close',()=>voice.reader.cancel());

function customConfig(){const family=$('#customFamily').value,answers=$$('#customChoices input:checked').map(e=>e.value);return family==='shapes'?{shapes:answers,colors:$$('#customColors input:checked').map(e=>e.value),style:$('#customStyle').value,ask:$('#customAsk').value}:{answers};}
function updateCustom(){try{const ex=exerciseFor($('#customFamily').value,customConfig());$('#customSummary').textContent=ex.answers.length+' possible answers · '+percent(1/ex.answers.length)+' chance baseline. '+ex.answers.join(', ');$('#startCustom').disabled=false;}catch(e){$('#customSummary').textContent=e.message;$('#startCustom').disabled=true;}}
function renderCustom(){const id=$('#customFamily').value;$('#customChoices').innerHTML='<fieldset><legend>Include these '+(id==='shapes'?'shapes':'choices')+'</legend><div class="choice-grid">'+EXERCISES[id].answers.map(a=>`<label class="checkbox"><input type="checkbox" value="${a}" checked> ${a}</label>`).join('')+'</div></fieldset>';$('#customShapeOptions').hidden=id!=='shapes';updateCustom();}
$('#customColors').innerHTML=['black',...Object.keys(COLORS)].map(c=>`<label class="checkbox"><input type="checkbox" value="${c}" ${c==='black'?'checked':''}> ${c}</label>`).join('');
$('#customFamily').onchange=renderCustom;for(const id of ['customChoices','customColors','customStyle','customAsk'])$('#'+id).addEventListener('change',updateCustom);
$('#startCustom').onclick=()=>{try{const config=customConfig();exerciseFor($('#customFamily').value,config);openSetup({exercise:$('#customFamily').value,config,mode});}catch(e){toast(e.message);}};renderCustom();

let pendingImport=null;
const archiveKey='mindsight-imported-legacy';
function legacySummary(rows){if(!rows.every(r=>r&&typeof r.title==='string'&&Array.isArray(r.records)))return '';return '<table class="trial-table"><thead><tr><th>Date</th><th>Exercise</th><th>Condition</th><th>Original score</th></tr></thead><tbody>'+rows.map(r=>`<tr><td>${escape(r.finishedAt||r.startedAt||'Unknown')}</td><td>${escape(r.title)}</td><td>${escape(r.condition||'')}</td><td>${r.records.filter(t=>t.correct===true).length}/${r.records.length}</td></tr>`).join('')+'</tbody></table>';}
function renderImportedArchives(){const holder=$('#importedArchives');try{const archives=JSON.parse(localStorage.getItem(archiveKey)||'[]');holder.innerHTML=archives.map((a,i)=>`<details class="legacy"><summary>Imported earlier history · ${escape(a.name)} · ${a.rawSessions.length} records</summary><p>Preserved in its original format. Not mixed into current scoring or replay.</p>${legacySummary(a.rawSessions)}<button class="button secondary" data-archive="${i}">Export this archive</button><pre style="white-space:pre-wrap;max-height:350px;overflow:auto">${escape(JSON.stringify(a.rawSessions,null,2))}</pre></details>`).join('');}catch{holder.textContent='Imported archives could not be read. Existing storage was left unchanged.';}}
$('#importHistory').onclick=()=>{pendingImport=null;$('#historyFile').value='';$('#confirmImport').disabled=true;$('#restoreSettingsRow').hidden=true;$('#restoreSettings').checked=false;$('#importStatus').textContent='Choose a file to preview the import.';$('#importDialog').showModal();};
$('#historyFile').onchange=async()=>{
 pendingImport=null;$('#confirmImport').disabled=true;$('#restoreSettingsRow').hidden=true;const file=$('#historyFile').files[0];if(!file)return;
 try{if(file.size>BACKUP_LIMIT)throw Error('Choose a backup smaller than 256 MB.');const value=JSON.parse(await file.text()),preview=value?.format==='mindsight-backup'?previewBackup(value,records):previewHistory(value,records);pendingImport={...preview,name:file.name};$('#restoreSettingsRow').hidden=preview.kind!=='backup';$('#restoreSettings').checked=false;
 $('#importStatus').textContent=preview.kind==='legacy'?`${preview.count} earlier records will be preserved as a separate archive.`:preview.kind==='backup'?`${preview.additions.length} new sessions, ${preview.audio.length} audio segments, ${preview.presets.length} saved setups and ${preview.archives.length+(preview.legacy?1:0)} earlier archives. ${preview.duplicates} existing session IDs will be retained. Audio segments already present are skipped. Preferences and setups are restored only if you select the option above.${preview.missingAudio?' The source backup reports missing audio for '+preview.missingAudio+' sessions.':''}`:`${preview.additions.length} sessions ready to import. ${preview.duplicates} duplicate IDs will be skipped. Existing history will not be overwritten. Audio is not included in a text journal.`;
 $('#confirmImport').disabled=preview.kind==='sessions'&&!preview.additions.length;
 }catch(e){$('#importStatus').textContent='Import not started: '+e.message;}
};
$('#confirmImport').onclick=async()=>{
 if(!pendingImport)return;const incoming=pendingImport;$('#confirmImport').disabled=true;$('#historyFile').disabled=true;
 try{
  if(storageBlocked)throw Error('Existing storage could not be read; import cannot overwrite it.');
  const archives=JSON.parse(localStorage.getItem(archiveKey)||'[]'),nextArchives=[...archives],values={};let nextRecords=records,nextPreferences=preferences,nextPresets=presets,audioCount=0;
  const addArchive=a=>{if(!nextArchives.some(old=>JSON.stringify(old.rawSessions)===JSON.stringify(a.rawSessions)))nextArchives.push(a);};
  if(incoming.kind==='legacy')addArchive({name:incoming.name,importedAt:stamp(),rawSessions:incoming.rawSessions});
  else {
   const ids=new Set(records.map(r=>r.id));nextRecords=[...incoming.additions.filter(r=>!ids.has(r.id)),...records].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
   if(incoming.kind==='backup'){
    incoming.archives.forEach(addArchive);if(incoming.legacy)addArchive({name:'Earlier history from '+incoming.name,importedAt:stamp(),rawSessions:incoming.legacy});
    if($('#restoreSettings').checked){if(!presetsOK)throw Error('Existing saved setups could not be read. Uncheck preference restoration to import history only.');const presetIDs=new Set(presets.map(p=>p.id));nextPresets=[...presets,...incoming.presets.filter(p=>!presetIDs.has(p.id))];nextPreferences=incoming.preferences;values[prefKey]=nextPreferences;values[presetKey]=nextPresets;}
    $('#importStatus').textContent='Restoring audio…';audioCount=await importAudioSegments(incoming.audio);const recorded=new Set(incoming.audio.map(s=>s.session));nextRecords=nextRecords.map(r=>recorded.has(r.id)?{...r,hasAudio:true}:r);
   }
   values[key]=nextRecords;
  }
  values[archiveKey]=nextArchives;writeStorageBatch(localStorage,values);records=nextRecords;preferences=nextPreferences;presets=nextPresets;
  applyPrefs();applyReaderPreferences();renderPresets();renderImportedArchives();renderJournal();renderOverview();renderProgram();$('#importStatus').textContent=`Import complete. Existing records were preserved.${incoming.kind==='backup'?' '+audioCount+' missing audio segments restored.':''}`;pendingImport=null;
 }catch(e){$('#importStatus').textContent='Import could not finish: '+e.message+' Keep your backup; already restored audio will be reused on retry.';$('#confirmImport').disabled=false;}
 finally{$('#historyFile').disabled=false;}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-archive]');if(b){try{const a=JSON.parse(localStorage.getItem(archiveKey)||'[]')[Number(b.dataset.archive)];download({legacy:true,rawSessions:a.rawSessions},'mindsight-imported-earlier-history.json');}catch{toast('Archive could not be exported.');}}});
renderImportedArchives();

$('#replayDialog').addEventListener('close',()=>{$('#replayFrame').srcdoc='';if(session&&voiceMode)voice.listen();});

let navigationItems=[],navigationIndex=0;
const navigationActions=[...['Overview','Your path','Practice','Journal','About'].map((label,i)=>({label,run:()=>{location.hash=['home','program','practice','journal','about'][i];route();$('#main').focus();}})),{label:'Custom session',run:()=>{location.hash='practice';route();$('#practice .custom-builder').open=true;$('#customFamily').focus();}},{label:'Settings',run:()=>$('#settingsDialog').showModal()},...Object.entries(EXERCISES).map(([id,ex])=>({label:ex.name+' · '+ex.category,run:()=>openSetup({exercise:id,mode})}))];
function renderNavigation(reset=false){if(reset)navigationIndex=0;const q=$('#navigationSearch').value.toLowerCase().trim();navigationItems=[...navigationActions,...presets.map(p=>({label:'Saved setup · '+p.name,run:()=>openSetup(p)}))].filter(a=>a.label.toLowerCase().includes(q));navigationIndex=Math.max(0,Math.min(navigationIndex,navigationItems.length-1));$('#navigationResults').innerHTML=navigationItems.map((a,i)=>`<button class="button secondary navigation-result ${i===navigationIndex?'selected':''}" data-navigation="${i}" aria-current="${i===navigationIndex?'true':'false'}">${escape(a.label)}</button>`).join('');$('#navigationStatus').textContent=navigationItems.length?`${navigationItems.length} choices. Selected: ${navigationItems[navigationIndex].label}`:'No matching pages or exercises.';}
function openNavigation(){if(session&&!$('#sessionView').hidden)return;$('#navigationSearch').value='';renderNavigation(true);$('#navigationDialog').showModal();$('#navigationSearch').focus();}
function chooseNavigation(i){const action=navigationItems[i];if(!action)return;$('#navigationDialog').close();action.run();}
$('#navigateButton').onclick=openNavigation;$('#navigationSearch').oninput=()=>renderNavigation(true);$('#navigationSearch').onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();navigationIndex=(navigationIndex+(e.key==='ArrowDown'?1:-1)+navigationItems.length)%Math.max(1,navigationItems.length);renderNavigation();}else if(e.key==='Enter'){e.preventDefault();chooseNavigation(navigationIndex);}};
$('#navigationResults').onclick=e=>{const b=e.target.closest('[data-navigation]');if(b)chooseNavigation(Number(b.dataset.navigation));};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!session&&!document.querySelector('dialog[open]')){e.preventDefault();openNavigation();}});
