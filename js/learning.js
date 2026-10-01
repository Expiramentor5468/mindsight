import {EXERCISES,exerciseFor,stats} from './core.js?v=3.5.0';

// Suggestions organize practice; they never unlock exercises or certify ability.
export const LESSONS={
 welcome:{name:'Find your bearings',area:'foundation',exercise:'color2',planned:4,steps:['settle','baseline','familiar','practice'],purpose:'Learn the rhythm: settle, notice a blank screen, explore known colors, then make four deliberate responses.'},
 known:{name:'Get to know two colors',area:'foundation',exercise:'color2',planned:4,steps:['settle','familiar'],purpose:'Explore four announced examples. Compare your observations without scoring or needing to guess.'},
 first:{name:'Make your own choice',area:'foundation',exercise:'color2',planned:8,steps:['settle','practice'],purpose:'Practice committing to red or blue, hearing feedback, and staying with the target before moving on.'},
 color4:{name:'Meet four colors',area:'colors',exercise:'color4',planned:8,steps:['familiar','practice'],purpose:'Add yellow and green. Explore each known color once, then try a short block with four choices.'},
 compare:{name:'Compare two impressions',area:'colors',exercise:'compare',planned:8,steps:['practice'],purpose:'Explore the first color, then the second. Decide whether they are the same or different.'},
 shapes:{name:'Notice curves and edges',area:'form',exercise:'shapes',planned:8,steps:['familiar','practice'],purpose:'Explore circle, triangle, square and star as black solid shapes. Focus on form before adding color.'},
 coloredShapes:{name:'Combine color and form',area:'form',exercise:'coloredShapes',planned:8,steps:['familiar','practice'],purpose:'Compare red and blue solid shapes. Give both parts of your answer, such as red circle.'},
 outlines:{name:'Explore open shapes',area:'outlines',exercise:'outlines',planned:8,steps:['familiar','practice'],purpose:'Explore the same four forms as black outlines, with unfilled centers.'},
 coloredOutlines:{name:'Add color to outlines',area:'outlines',exercise:'coloredOutlines',planned:8,steps:['familiar','practice'],purpose:'Combine red or blue outlines with four shapes. Name both the color and the shape.'},
 location:{name:'Explore position',area:'space',exercise:'location',planned:8,steps:['practice'],purpose:'Keep the circle the same. Explore whether it is on the left or right.'},
 orientation:{name:'Explore direction',area:'space',exercise:'orientation',planned:8,steps:['familiar','practice'],purpose:'Compare a horizontal line with a vertical line, then try unknown directions.'},
 numbers:{name:'Meet four numbers',area:'symbols',exercise:'numbers',planned:8,steps:['familiar','practice'],purpose:'Explore 1, 2, 3 and 4. Keep the position and size steady while changing the symbol.'},
 letters:{name:'Meet four letters',area:'symbols',exercise:'letters',planned:8,steps:['familiar','practice'],purpose:'Explore A, B, C and D. Describe any impressions before committing to one letter.'}
};
export const AREAS=[
 {id:'foundation',name:'Find your rhythm',description:'Learn the process and explore two colors.',lessons:['welcome','known','first']},
 {id:'colors',name:'Colors & comparison',description:'Add choices or compare two impressions.',lessons:['color4','compare']},
 {id:'form',name:'Solid shapes',description:'Explore form, then combine it with color.',lessons:['shapes','coloredShapes']},
 {id:'outlines',name:'Open shapes',description:'Explore black and colored outlines.',lessons:['outlines','coloredOutlines']},
 {id:'space',name:'Position & direction',description:'Vary where a target is or which way it points.',lessons:['location','orientation']},
 {id:'symbols',name:'Numbers & letters',description:'Explore a small, steady set of symbols.',lessons:['numbers','letters']}
];
const legacy={'0-0':'welcome','0-1':'known','0-2':'first','0-3':'first','1-0':'color4','1-1':'compare','1-2':'shapes'};
export const lessonFor=r=>LESSONS[r?.lesson]||null;
export const responses=r=>(r.trials||[]).filter(t=>t.status!=='interrupted');
export const fullBlock=r=>r.status==='complete'&&responses(r).length>=r.planned;
export const hasPractice=r=>responses(r).length>0||(r.events||[]).some(e=>e.type==='screen'&&e.phase==='familiar');
export function areaFor(r){const id=r.exercise;if(id==='color2')return 'foundation';return AREAS.find(a=>a.lessons.some(l=>LESSONS[l].exercise===id))?.id||'foundation';}
export function lessonState(id,records){
 const exact=records.filter(r=>r.lesson===id);
 if(exact.some(r=>r.lessonCompleted||fullBlock(r)))return 'Lesson complete';
 if(records.some(r=>(legacy[r.lesson]===id||r.exercise===LESSONS[id].exercise)&&hasPractice(r)))return 'Practiced';
 if(exact.length)return 'Started';return 'Not tried yet';
}
export function comparisonKey(r){const ex=exerciseFor(r);const settings=Object.fromEntries(Object.entries(ex.settings).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,Array.isArray(v)?[...v].sort():v]));return JSON.stringify([ex.kind,[...ex.answers].sort(),settings,r.condition,r.conditionNotes||'',r.mode]);}
export function comparableGroups(records){
 const groups=new Map();for(const r of records){if(r.status!=='complete'||!responses(r).length)continue;const key=comparisonKey(r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}return [...groups.entries()].map(([key,sessions])=>({key,sessions:sessions.sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)),label:`${exerciseFor(sessions[0]).name}${sessions[0].config?' · custom':''} · ${sessions[0].condition} · ${sessions[0].mode} · ${sessions.length} session${sessions.length===1?'':'s'}`}));
}
const nextExercise={color2:'color4',color4:'compare',compare:'shapes',shapes:'coloredShapes',coloredShapes:'outlines',outlines:'coloredOutlines',coloredOutlines:'location',location:'orientation',orientation:'numbers',numbers:'letters',letters:'first'};
export function recommendation(records){
 const done=records.filter(hasPractice).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)),last=done[0];
 if(!last)return {lesson:'welcome',reason:'Start with the controls, known examples, and a short four-target block.'};
 if(last.lesson==='known'&&last.lessonCompleted)return {lesson:'first',reason:'You explored announced examples. Try making a choice before hearing the answer.'};
 if(last.lesson==='welcome'&&fullBlock(last))return {lesson:'known',reason:'You have tried the session rhythm. Spend a short block comparing known colors.'};
 const similar=done.filter(r=>comparisonKey(r)===comparisonKey(last)&&r.status==='complete').slice(0,5);
 const usable=similar.filter(r=>!r.condition.includes('demo'));
 const trials=usable.flatMap(r=>r.trials.filter(t=>t.status==='answered'&&!t.flags?.length));
 const s=stats({...last,trials}),id=last.exercise==='color2'?'first':Object.hasOwn(LESSONS,last.exercise)?last.exercise:'first';
 if(usable.length>=2&&trials.length>=16&&s.interval?.[0]>s.chance){return {lesson:nextExercise[last.exercise]||'first',reason:`Across ${usable.length} comparable sessions, ${s.correct} of ${s.answered} unflagged answers were correct. This is a reason to try a small change; the estimate is uncertain and does not establish an ability.`,signal:'Results informed'};}
 if(done.filter(r=>r.exercise===last.exercise).length>=2||fullBlock(last))return {lesson:nextExercise[last.exercise]||'first',reason:`You have practiced ${exerciseFor(last).name.toLowerCase()}. Try a different task or return to the same setup whenever you prefer.`,signal:'Experience informed'};
 return {lesson:id,reason:'You have started this area. A short block can help you settle into it; every other activity is available too.'};
}
export function variety(records){const recent=records.filter(hasPractice).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,3).map(areaFor);return AREAS.find(a=>!recent.includes(a.id))?.lessons.find(id=>id!=='welcome'&&id!=='known')||'compare';}
export function favorite(records){const counts=new Map();for(const r of records.filter(hasPractice)){const k=JSON.stringify([r.exercise,r.config]);const x=counts.get(k)||{record:r,count:0};x.count++;counts.set(k,x);}return [...counts.values()].sort((a,b)=>b.count-a.count)[0]?.record||null;}
