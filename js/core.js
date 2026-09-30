export const VERSION = '3.4';
export const COLORS = {red:'#e14640',blue:'#3076dc',yellow:'#f4cb38',green:'#359b68'};
export const EXERCISES = {
  color2:{name:'First colors',kind:'color',answers:['red','blue'],description:'Start with two distinct colors. Notice an impression, then make your choice.',icon:'colors',category:'FOUNDATION'},
  color4:{name:'Four colors',kind:'color',answers:['red','blue','yellow','green'],description:'Explore the differences between red, blue, yellow, and green.',icon:'four',category:'COLOR'},
  compare:{name:'Same or different',kind:'compare',answers:['same','different'],description:'Explore two colors in sequence. Do they feel the same or different?',icon:'compare',category:'COMPARISON'},
  location:{name:'Find the position',kind:'location',answers:['left','right'],description:'One circle, two possible positions. Bring your attention to space.',icon:'location',category:'SPACE'},
  shapes:{name:'Shape study',kind:'shape',answers:['circle','triangle','square','star'],description:'Notice curves, edges, and points before choosing a shape.',icon:'shapes',category:'FORM'},
  orientation:{name:'Lines & direction',kind:'orientation',answers:['horizontal','vertical'],description:'A single line. Explore the difference between across and upright.',icon:'lines',category:'DIRECTION'},
  numbers:{name:'Numbers',kind:'symbol',answers:['1','2','3','4'],description:'Work with four large, clearly defined numbers, one at a time.',icon:'numbers',category:'SYMBOLS'},
  letters:{name:'Letters',kind:'symbol',answers:['a','b','c','d'],description:'Explore the outlines of A, B, C, and D without changing their location.',icon:'letters',category:'SYMBOLS'}
};
Object.assign(EXERCISES,{
 coloredShapes:{name:'Colored solid shapes',kind:'shape',answers:['red circle','red triangle','red square','red star','blue circle','blue triangle','blue square','blue star'],description:'Identify both the color and the solid shape.',category:'COLOR + FORM',defaults:{colors:['red','blue'],shapes:['circle','triangle','square','star'],style:'solid',ask:'both'}},
 outlines:{name:'Black outlines',kind:'shape',answers:['circle','triangle','square','star'],description:'Explore open shapes with a black outline and an unfilled center.',category:'OUTLINES',defaults:{colors:['black'],shapes:['circle','triangle','square','star'],style:'outline',ask:'shape'}},
 coloredOutlines:{name:'Colored outlines',kind:'shape',answers:['red circle','red triangle','red square','red star','blue circle','blue triangle','blue square','blue star'],description:'Identify both the color and the outline shape.',category:'COLOR + OUTLINES',defaults:{colors:['red','blue'],shapes:['circle','triangle','square','star'],style:'outline',ask:'both'}}
});
export const GROUPS=[{name:'1 · Colors & comparison',ids:['color2','color4','compare']},{name:'2 · Solid shapes',ids:['shapes','coloredShapes']},{name:'3 · Open shapes & outlines',ids:['outlines','coloredOutlines']},{name:'4 · Position, direction & symbols',ids:['location','orientation','numbers','letters']}];
export const SHAPES=['circle','triangle','square','star'];
export function exerciseFor(source,config){
 const id=typeof source==='string'?source:source.exercise,c=config??(typeof source==='object'?source.config:null),base=EXERCISES[id];
 if(!base)throw Error('Unknown exercise.');
 const settings={...(base.defaults||{}),...(c||{})};
 if(base.kind==='shape'){
  const shapes=settings.shapes||SHAPES,colors=settings.colors||['black'],style=settings.style||'solid',ask=settings.ask||'shape';
  if(!shapes.length||shapes.some(x=>!SHAPES.includes(x))||new Set(shapes).size!==shapes.length||!colors.length||colors.some(x=>!['black',...Object.keys(COLORS)].includes(x))||new Set(colors).size!==colors.length||!['solid','outline'].includes(style)||!['shape','color','both'].includes(ask))throw Error('Choose valid shapes, colors and answer type.');
  const answers=ask==='shape'?shapes:ask==='color'?colors:colors.flatMap(c=>shapes.map(s=>c+' '+s));
  if(answers.length<2)throw Error('Choose at least two possible answers.');
  return {...base,answers,settings:{shapes,colors,style,ask}};
 }
 const answers=settings.answers||base.answers;
 if(answers.length<2||answers.some(a=>!base.answers.includes(a))||new Set(answers).size!==answers.length)throw Error('Choose at least two valid answers.');
 return {...base,answers,settings:{answers}};
}
export const WEEKS = [
 {title:'Find your rhythm',subtitle:'Setup, quiet attention, and first colors.',exercise:'color2',lessons:['Meet your practice companion','Explore known colors','Make room for impressions','Repeat & reflect']},
 {title:'Explore the differences',subtitle:'Add color, comparison, and simple forms.',exercise:'color4',lessons:['Meet four colors','Compare two impressions','Notice curves & edges','Return to your favorite'],exercises:['color4','compare','shapes','color4']},
 {title:'Learn what helps',subtitle:'Keep the task steady. Vary the preparation.',exercise:'color4',lessons:['Short settling practice','Add known-color familiarization','Repeat short settling','Repeat familiarization']},
 {title:'Practice with consistency',subtitle:'Repeat the same conditions and review honestly.',exercise:'color4',lessons:['Choose your conditions','Repeat the same practice','A quiet measurement block','Reflect on the whole month']}
];
export const normalize = s => String(s).toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
export function randomInt(n) {
 const a = new Uint32Array(1), limit = Math.floor(4294967296/n)*n;
 do { crypto.getRandomValues(a); } while(a[0]>=limit);
 return a[0]%n;
}
export function makeTarget(id, rand=randomInt, config) {
 const ex=exerciseFor(id,config), answer=ex.answers[rand(ex.answers.length)];
 if(ex.kind==='shape'){const c=ex.settings;let shape,color;if(c.ask==='both')[color,shape]=answer.split(' ');else {shape=c.ask==='shape'?answer:c.shapes[rand(c.shapes.length)];color=c.ask==='color'?answer:c.colors[rand(c.colors.length)];}return {answer,shape,color,style:c.style};}
 if(id==='compare'){
  const keys=Object.keys(COLORS), first=keys[rand(4)];
  const others=keys.filter(k=>k!==first);
  return {answer,first,second:answer==='same'?first:others[rand(3)]};
 }
 return {answer};
}
export function parseAnswer(text,id,config) {
 let t=normalize(text).replace(/^(no )?(i said |my answer is |my answer |i choose |i pick |i think it is |i think its |its |it is )/,'').replace(/^(the )/,'');
 const aliases={blu:'blue',read:'red',blew:'blue',to:'2',two:'2',one:'1',three:'3',four:'4',for:'4',won:'1',ay:'a',bee:'b',be:'b',see:'c',sea:'c',dee:'d','up and down':'vertical',upright:'vertical',across:'horizontal','the same':'same','not the same':'different'};
 t=aliases[t]||t;
 return exerciseFor(id,config).answers.includes(t)?t:null;
}
export function parseIntent(text,id,phase,config) {
 const t=normalize(text);
 const commands={pause:['pause','pause session','stop','wait'],resume:['resume','continue','continue session'],end:['end session','and session','end the session','and the session','end this session','finish session','finish the session','finish','quit session','stop session'],next:['next','next target','next one','move on'],second:['second','show second','next color','target two'],pass:['pass','skip','skip this'],help:['help','help me','explain that','what am i doing','what are my options'],repeat:['repeat','repeat that','say that again'],quiet:['less talking','quiet mode'],more:['more talking','full guidance'],stay:['more time','stay','stay with this','nothing yet','i dont see anything'],ready:['im ready','i am ready','begin','start practice','ready'],yes:['yes','correct','confirm','thats right'],no:['no','cancel answer','you misheard me'],reflect:['reflection','reflect'],again:['repeat session','repeat exercise','another session'],measure:['start measurement','measurement'],listening:['are you listening','listening status'],leak:['i can see around the mask','light leak','mask problem']};
 for(const [type,values] of Object.entries(commands)) if(values.includes(t)) return {type,text};
 if(/^(my answer(?: is)?|i choose|i pick)\b/.test(t) || (phase==='confirm' && /^(no )?i said\b/.test(t))) {
  return {type:'answer',answer:parseAnswer(t,id,config),text};
 }
 return {type:'note',text};
}
export function stats(session) {
 const trials=session.trials||[];
 const committed=trials.filter(t=>t.status==='answered');
 const correct=committed.filter(t=>t.answer===t.target.answer).length;
 const n=committed.length,p=n?correct/n:0,z=1.96,den=1+z*z/(n||1);
 const center=(p+z*z/(2*(n||1)))/den;
 const half=z*Math.sqrt(p*(1-p)/(n||1)+z*z/(4*(n||1)**2))/den;
 return {correct,answered:n,passed:trials.filter(t=>t.status==='passed').length,interrupted:trials.filter(t=>t.status==='interrupted').length,flagged:trials.filter(t=>t.flags?.length).length,accuracy:n?p:null,interval:n?[Math.max(0,center-half),Math.min(1,center+half)]:null,coverage:trials.length/session.planned,chance:1/exerciseFor(session).answers.length};
}
export class Session {
 constructor(options, existing=null) {
  exerciseFor(existing||options);
  this.data=existing?structuredClone(existing):{id:crypto.randomUUID(),version:VERSION,exercise:options.exercise,config:options.config?structuredClone(options.config):null,mode:options.mode||'practice',guided:!!options.guided,skipFamiliar:!!options.skipFamiliar,lesson:options.lesson??null,planned:options.planned||8,condition:options.condition||'Mask, eyes closed',conditionNotes:options.conditionNotes||'',createdAt:new Date().toISOString(),status:'active',phase:'intro',trials:[],notes:[],events:[],current:null,pending:null,quiet:false,familiarIndex:0};
 }
 event(type,detail={}){this.data.events.push({type,at:new Date().toISOString(),...detail});}
 phase(value){this.data.phase=value;this.event('phase',{value});}
 note(text){this.data.notes.push({text,at:new Date().toISOString(),phase:this.data.phase,trial:this.data.current?.number??null,afterFeedback:this.data.phase==='feedback'});}
 target(){
  if(this.data.trials.length>=this.data.planned){this.finish();return false;}
  this.data.current={number:this.data.trials.length+1,target:makeTarget(this.data.exercise,randomInt,this.data.config),startedAt:new Date().toISOString(),flags:[],part:1};
  this.data.pending=null;this.phase('explore');return true;
 }
 propose(answer){if(!['explore','confirm'].includes(this.data.phase)||!exerciseFor(this.data).answers.includes(answer))return false;
  if(this.data.exercise==='compare'&&this.data.current.part!==2)return false;
  this.data.pending=answer;this.event('proposed',{answer});this.phase('confirm');return true;
 }
 commit(pass=false){
  if(!this.data.current||(!pass&&this.data.phase!=='confirm')||(pass&&!['explore','confirm'].includes(this.data.phase)))return false;
  const answer=pass?null:this.data.pending;
  if(!pass&&!answer)return false;
  this.data.trials.push({...structuredClone(this.data.current),answer,status:pass?'passed':'answered',mode:this.data.mode,at:new Date().toISOString()});
  this.data.pending=null;this.phase('feedback');return true;
 }
 pause(reason='User paused'){
  if(this.data.phase==='paused'||this.data.status!=='active')return;
  this.data.beforePause=this.data.phase;this.data.pauseReason=reason;this.phase('paused');
 }
 resume(){if(this.data.phase==='paused'){this.phase(this.data.beforePause||'intro');delete this.data.pauseReason;}}
 flag(reason){if(this.data.current){this.data.current.flags.push(reason);const t=this.data.trials.find(t=>t.number===this.data.current.number);if(t)t.flags.push(reason);}this.event('flag',{reason});}
 finish(){
  if(this.data.current&&!this.data.trials.some(t=>t.number===this.data.current.number))this.data.trials.push({...structuredClone(this.data.current),answer:null,status:'interrupted',mode:this.data.mode,at:new Date().toISOString()});
  this.data.status='complete';this.data.completedAt=new Date().toISOString();this.data.current=null;this.data.pending=null;this.phase('reflection');
 }
}
