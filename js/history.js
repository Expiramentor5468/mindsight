import {EXERCISES,exerciseFor,SHAPES,COLORS} from './core.js?v=3.4.0';
const phases=['intro','settle','baseline','familiar','explore','confirm','feedback','paused','reflection'];
const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
function assert(ok,message){if(!ok)throw Error(message);}
function target(t,ex){assert(t&&typeof t==='object'&&ex.answers.includes(t.answer),'Invalid target answer.');if(ex.kind==='compare')assert(Object.hasOwn(COLORS,t.first)&&Object.hasOwn(COLORS,t.second),'Invalid comparison colors.');if(t.shape!==undefined)assert(SHAPES.includes(t.shape),'Invalid shape.');if(t.color!==undefined)assert(['black',...Object.keys(COLORS)].includes(t.color),'Invalid shape color.');if(t.style!==undefined)assert(['solid','outline'].includes(t.style),'Invalid shape style.');}
export function validateSession(raw){
 assert(raw&&typeof raw==='object'&&!Array.isArray(raw),'Invalid session.');
 assert(typeof raw.id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(raw.id),'Invalid session ID.');
 assert(Object.hasOwn(EXERCISES,raw.exercise),'Unknown exercise.');const ex=exerciseFor(raw);
 assert(['practice','measurement'].includes(raw.mode)&&['active','complete'].includes(raw.status),'Invalid session mode or status.');
 assert(date(raw.createdAt)&&integer(raw.planned,1,10000)&&phases.includes(raw.phase),'Invalid session date, length or phase.');
 assert(Array.isArray(raw.trials)&&raw.trials.length<=10000&&Array.isArray(raw.notes)&&Array.isArray(raw.events),'Missing session history arrays.');
 assert(typeof raw.condition==='string'&&(raw.conditionNotes===undefined||typeof raw.conditionNotes==='string'),'Invalid conditions.');
 const numbers=new Set();for(const t of raw.trials){assert(integer(t.number,1,10000)&&!numbers.has(t.number)&&['answered','passed','interrupted'].includes(t.status),'Invalid or duplicate trial.');numbers.add(t.number);target(t.target,ex);assert(t.status!=='answered'||ex.answers.includes(t.answer),'Invalid recorded answer.');assert(Array.isArray(t.flags)&&t.flags.every(x=>typeof x==='string'),'Invalid trial flags.');assert(date(t.at),'Invalid trial timestamp.');}
 for(const n of raw.notes)assert(typeof n.text==='string'&&date(n.at)&&(n.trial==null||integer(n.trial,1,10000)),'Invalid note.');
 for(const e of raw.events){assert(e&&typeof e.type==='string'&&date(e.at),'Invalid event.');if(e.type==='screen'){assert(['color','compare','shape','orientation','symbol','location'].includes(e.kind)&&phases.includes(e.phase),'Invalid screen event.');if(e.target)target(e.target,ex);}}
 if(raw.current){assert(integer(raw.current.number,1,10000)&&Array.isArray(raw.current.flags),'Invalid current target.');target(raw.current.target,ex);}
 assert(raw.pending==null||ex.answers.includes(raw.pending),'Invalid pending answer.');
 if(raw.status==='active'){assert(raw.phase!=='reflection','Invalid active session phase.');const p=raw.phase==='paused'?raw.beforePause:raw.phase;assert(phases.includes(p),'Invalid resume phase.');if(['explore','confirm','feedback'].includes(p))assert(!!raw.current,'Missing current target.');}
 const copy=structuredClone(raw);copy.reflectionListening=false;copy.familiarIndex=integer(copy.familiarIndex,0,10000)?copy.familiarIndex:0;return copy;
}
export function previewHistory(value,existing=[]){
 if(value?.legacy===true&&Array.isArray(value.rawSessions))return {kind:'legacy',rawSessions:value.rawSessions,count:value.rawSessions.length};
 const list=Array.isArray(value)?value:Array.isArray(value?.sessions)?value.sessions:value?.id?[value]:null;
 assert(list&&list.length>0&&list.length<=1000,'Choose a MindSight session/journal JSON export or an earlier Mindsight Lab export.');
 // Older unversioned arrays are preserved as an archive; never guess their scoring schema.
 if(list.every(r=>r&&typeof r==='object'&&!Object.hasOwn(r,'exercise')&&!String(r.version||'').startsWith('3')))return {kind:'legacy',rawSessions:list,count:list.length};
 const valid=list.map(validateSession),ids=new Set(existing.map(r=>r.id)),additions=[];let duplicates=0;
 for(const r of valid){if(ids.has(r.id)){duplicates++;continue;}ids.add(r.id);additions.push(r);}
 return {kind:'sessions',additions,duplicates,count:valid.length};
}
