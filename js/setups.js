import {exerciseFor} from './core.js?v=3.5.0';
export const CONDITIONS=['Mask, eyes closed','Mask, eyes open','Mask and independent barrier','Unmasked, closed eyes','Unmasked familiarization / demo'];
export function cleanSetup(value={}){
 const s={inputMode:['voice','keyboard','touch'].includes(value.inputMode)?value.inputMode:'voice',speechEngine:['auto','local'].includes(value.speechEngine)?value.speechEngine:'auto',condition:CONDITIONS.includes(value.condition)?value.condition:CONDITIONS[0],planned:[4,8,12,20].includes(Number(value.planned))?Number(value.planned):8,conditionNotes:String(value.conditionNotes||'').slice(0,1000)};
 return s;
}
export function cleanPreset(raw){
 if(!raw||typeof raw.id!=='string'||!/^[\w-]{1,100}$/.test(raw.id)||typeof raw.name!=='string'||!raw.name.trim())throw Error('Invalid saved setup.');
 exerciseFor(raw);return {id:raw.id,name:raw.name.trim().slice(0,80),exercise:raw.exercise,config:raw.config?structuredClone(raw.config):null,mode:raw.mode==='measurement'?'measurement':'practice',...cleanSetup(raw)};
}
export function cleanPreferences(p={}){
 const clean={theme:['light','dark','system'].includes(p.theme)?p.theme:'system',rate:[.8,.94,1.1].includes(p.rate)?p.rate:.94,spoken:p.spoken!==false,large:p.large===true,showTargets:p.showTargets===true};
 if(p.setup)clean.setup=cleanSetup(p.setup);
 if(p.reader){const r=p.reader;clean.reader={mode:['browser','api','mcp'].includes(r.mode)?r.mode:'browser'};for(const k of ['url','model','voice','tool','arguments'])if(typeof r[k]==='string')clean.reader[k]=r[k].slice(0,k==='arguments'?10000:1000);}
 return clean;
}
