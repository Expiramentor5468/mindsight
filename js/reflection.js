import {normalize} from './core.js?v=3.5.0';
// Silence and recognizer sentence boundaries never commit a reflection.
export function reflectionInput(state,text){
 const t=normalize(text);
 if(['start reflection','begin reflection','start dictation'].includes(t))return {...state,listening:true,action:'start'};
 if(['stop reflection','stop dictation','save reflection','finish reflection'].includes(t))return {...state,listening:false,action:'save'};
 if(['cancel reflection','discard reflection'].includes(t))return {draft:'',listening:false,action:'cancel'};
 if(state.listening)return {...state,draft:[state.draft,text.trim()].filter(Boolean).join(' '),action:'append'};
 // Legacy “note …” opens a draft, never saves a sentence prematurely.
 if(/^note\b/.test(t))return {...state,draft:[state.draft,text.replace(/^note\s*/i,'')].filter(Boolean).join(' '),listening:true,action:'append'};
 return {...state,action:'idle'};
}
