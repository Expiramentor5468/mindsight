import {exerciseFor,COLORS,stats} from './core.js?v=3.5.0';
import {shapeSVG} from './targets.js?v=3.5.0';
import {areaFor,responses,fullBlock} from './learning.js?v=3.5.0';
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=n=>n==null?'—':Math.round(n*100)+'%';
export function targetPreview(t,kind){
 if(!t)return '<span class="target-unavailable">No linked target</span>';
 let art='',label=t.answer||'';
 if(kind==='color')art=`<span class="mini-color" style="background:${COLORS[t.answer]||'#777'}"></span>`;
 else if(kind==='compare'){label=`${t.first} → ${t.second} · ${t.answer}`;art=[t.first,t.second].map(c=>`<span class="mini-color" style="background:${COLORS[c]||'#777'}"></span>`).join('<span>→</span>');}
 else if(kind==='symbol')art=`<span class="mini-symbol">${escape(t.answer.toUpperCase())}</span>`;
 else if(kind==='location')art=`<span class="mini-position ${t.answer==='left'?'left':'right'}"><i></i></span>`;
 else {art=shapeSVG(t);if(t.shape)label=`${t.color||'black'} ${t.shape}${t.style==='outline'?' · outline':' · solid'}`;}
 return `<span class="target-preview"><span class="target-thumbnail" aria-hidden="true">${art}</span><span>${escape(label)}</span></span>`;
}
export function observationTarget(r,n){
 if(r.status!=='complete'&&r.mode==='measurement')return null;
 if(n.targetSnapshot)return n.targetSnapshot;
 if(n.trial!=null){const t=r.trials.find(t=>t.number===n.trial);if(t)return t.target;}
 if(n.phase==='familiar'){const frame=r.events.filter(e=>e.type==='screen'&&e.phase==='familiar'&&Date.parse(e.at)<=Date.parse(n.at)).at(-1);return frame?.target||null;}
 return null;
}
export function filterSessions(records,f={}){return records.filter(r=>(!f.area||areaFor(r)===f.area)&&(!f.condition||r.condition===f.condition)&&(!f.mode||r.mode===f.mode)&&(!f.audio||r.hasAudio)&&(!f.query||[exerciseFor(r).name,r.condition,r.conditionNotes,...r.notes.map(n=>n.text)].join(' ').toLowerCase().includes(f.query.toLowerCase())));}
export function journalCard(r,showTargets=false){
 const ex=exerciseFor(r),s=stats(r),sealed=r.status==='active',partial=r.status==='complete'&&!fullBlock(r)&&!r.lessonCompleted;
 const badge=sealed?'In progress':r.lessonCompleted&&!r.trials.length?'Familiarization':partial?'Partial block':'Completed block';
 const notes=r.notes.map(n=>`<li class="observation"><div><span class="eyebrow">${n.phase==='reflection'?'Reflection':n.afterFeedback?'After feedback':'Observation'}${n.trial?' · Target '+n.trial:''}</span><p>${escape(n.text)}</p></div>${showTargets?(sealed&&r.mode==='measurement'?'<span class="target-unavailable">Target sealed until completion</span>':n.phase==='reflection'?'<span class="target-unavailable">Session reflection</span>':targetPreview(observationTarget(r,n),ex.kind)):''}</li>`).join('');
 return `<article class="journal-card" data-session="${escape(r.id)}"><header><span class="journal-icon" aria-hidden="true">${{color:'●',shape:'△',compare:'◐',location:'↔',orientation:'⊥',symbol:'#'}[ex.kind]}</span><div><span class="eyebrow">${new Date(r.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})} · ${escape(r.mode)}</span><h2>${escape(ex.name)}</h2><p>${escape(r.condition)}${r.config?' · Custom set':''}</p></div><span class="status-badge">${badge}</span></header><div class="journal-metrics"><span><strong>${responses(r).length}/${r.planned}</strong> responses</span><span><strong>${sealed?'Sealed':pct(s.accuracy)}</strong> accuracy${sealed?'':` · ${s.correct}/${s.answered} answered`}</span><span><strong>${r.notes.length}</strong> notes</span><span>${r.hasAudio?'◉ Audio recorded':'No audio'} · ${escape(r.inputMode||'Earlier session')}</span></div>${r.conditionNotes?`<p class="condition-note">${escape(r.conditionNotes)}</p>`:''}<div class="session-actions">${sealed?`<button class="button primary" data-resume="${escape(r.id)}">Continue session</button>`:`<button class="button primary" data-replay="${escape(r.id)}">▶ Replay</button>`}<button class="button secondary" data-repeat="${escape(r.id)}">Repeat setup</button><button class="button secondary" data-export="${escape(r.id)}">Export files</button></div>${r.notes.length?`<details class="journal-notes"><summary>${r.notes.length} observations & reflections</summary><ul>${notes}</ul></details>`:'<p class="small">No notes saved for this session.</p>'}${sealed?'<p class="small">Targets and results stay sealed until you finish.</p>':`<details class="trial-details"><summary>Target & answer details · ${s.passed} passed · ${s.interrupted} interrupted</summary><p>Chance baseline ${pct(s.chance)}${s.interval?' · 95% accuracy interval '+pct(s.interval[0])+'–'+pct(s.interval[1]):''}. Small blocks vary widely.</p><div class="table-scroll"><table class="trial-table"><thead><tr><th>Target</th><th>Shown</th><th>Answer</th><th>Result</th></tr></thead><tbody>${r.trials.map(t=>`<tr><td>${t.number}${t.flags?.length?' · flagged':''}</td><td>${escape(t.target.answer)}</td><td>${escape(t.answer||'—')}</td><td>${t.status==='answered'?(t.answer===t.target.answer?'Correct':'Incorrect'):escape(t.status)}</td></tr>`).join('')}</tbody></table></div></details>`}</article>`;
}
export function activityView(records,now=new Date()){
 const day=d=>[d.getFullYear(),d.getMonth()+1,d.getDate()].join('-'),counts=new Map();for(const r of records){const k=day(new Date(r.createdAt));counts.set(k,(counts.get(k)||0)+1);}
 const days=Array.from({length:14},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()-13+i);return {label:d.toLocaleDateString(undefined,{month:'short',day:'numeric'}),count:counts.get(day(d))||0};});
 return `<div class="activity-days" aria-label="Sessions over the last fourteen days">${days.map(d=>`<div class="activity-day ${d.count?'practiced':''}" title="${d.label}: ${d.count} sessions"><span class="activity-count">${d.count}</span><span>${d.label}</span></div>`).join('')}</div>`;
}
export function trendView(group){
 if(!group)return '<p>Complete a block to compare similar sessions here. Different target sets and conditions stay separate.</p>';
 const rows=group.sessions.slice(-12),baseline=stats(rows[0]).chance;
 return `<p class="small">${escape(exerciseFor(rows[0]).answers.join(', '))} · ${escape(rows[0].conditionNotes||'No condition notes')} · Chance baseline ${pct(baseline)}. Last ${rows.length} comparable sessions.</p><div class="trend-bars" role="img" aria-label="Accuracy by comparable session. Chance baseline ${pct(baseline)}. Exact values follow in the table."><div class="chance-line" style="bottom:${baseline*100}%"></div>${rows.map((r,i)=>{const s=stats(r);return `<div class="trend-column"><span class="trend-bar" style="height:${(s.accuracy||0)*100}%"></span><span class="trend-index">${i+1}</span></div>`;}).join('')}</div><details><summary>Read chart values</summary><div class="table-scroll"><table class="trial-table"><thead><tr><th>Session</th><th>Date</th><th>Correct / answered</th><th>Accuracy</th><th>Passed</th></tr></thead><tbody>${rows.map((r,i)=>{const s=stats(r);return `<tr><td>${i+1}</td><td>${new Date(r.createdAt).toLocaleDateString()}</td><td>${s.correct}/${s.answered}</td><td>${pct(s.accuracy)}</td><td>${s.passed}</td></tr>`;}).join('')}</tbody></table></div></details>`;
}
