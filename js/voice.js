import {LocalSpeech} from './local-speech.js?v=3.2.0';
// Recognition is deliberately suspended during playback: synthesized answers must
// never be interpreted as the user's next answer. Listen after each short prompt.
export class Voice {
 constructor({onText,onState,onFault}) {
  this.onText=onText;this.onState=onState;this.onFault=onFault;
  this.Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  this.local=new LocalSpeech();this.engine='auto';this.failedStarts=0;this.enabled=false;this.speaking=false;this.active=null;this.generation=0;this.restart=null;this.watchdog=null;this.cancelSpeech=null;
 }
 get usesLocal(){return this.engine==='local'||!this.Recognition;}
 get available(){return window.isSecureContext&&(this.usesLocal?this.local.supported:!!this.Recognition);}
 get needsPreparation(){return this.usesLocal&&!this.local.ready;}
 prepare(){return this.local.prepare();}
 listen(){this.failedStarts=0;this.enabled=true;this.start();}
 start(){
  clearTimeout(this.restart);
  if(!this.enabled||this.speaking||this.active||!this.available)return;
  const r=this.usesLocal?this.local.createRecognition():new this.Recognition();this.active=r;
  r.lang='en-US';r.continuous=true;r.interimResults=false;r.maxAlternatives=1;
  let started=false;
  r.onstart=()=>{if(this.active!==r)return;started=true;this.failedStarts=0;clearTimeout(this.watchdog);this.onState('listening');};
  r.onresult=e=>{if(this.active!==r||this.speaking||!this.enabled)return;
   for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)this.onText(e.results[i][0].transcript);
  };
  r.onerror=e=>{
   if(this.active!==r)return;
   if(['no-speech','aborted'].includes(e.error))return;
   this.fail(e.error==='not-allowed'?'Microphone permission was denied. Allow the microphone and try again.':e.error==='network'?'Speech recognition lost its network connection. Check your connection, then reconnect.':`Microphone stopped (${e.error}). Reconnect before continuing.`);
  };
  r.onend=()=>{if(this.active!==r)return;this.active=null;clearTimeout(this.watchdog);
   if(this.enabled&&!this.speaking){if(!started&&++this.failedStarts>=3){this.fail('The microphone did not start. Try reconnecting.');return;}this.onState('reconnecting');this.restart=setTimeout(()=>this.start(),started?300:1200);}
  };
  try {this.onState('connecting');r.start();this.watchdog=setTimeout(()=>{if(this.active===r&&!started)this.fail('The microphone did not start. Try reconnecting.');},this.usesLocal?20000:7000);}catch{this.fail('The microphone could not start. Try reconnecting.');}
 }
 halt(){clearTimeout(this.restart);clearTimeout(this.watchdog);const r=this.active;this.active=null;if(r)try{r.abort();}catch{};}
 stop(){this.enabled=false;this.halt();this.onState('off');}
 fail(message){this.stop();this.onFault(message);}
 async speak(text,{enabled=true,rate=0.94}={}) {
  this.cancel();
  const token=++this.generation;
  if(!enabled)return;
  if(!window.speechSynthesis){this.onFault('Spoken audio is unavailable in this browser. Choose touch mode or another browser.');return;}
  this.speaking=true;this.halt();this.onState('speaking');
  await new Promise(resolve=>{
   let done=false;let timer;
   const finish=error=>{if(done)return;done=true;clearTimeout(timer);this.cancelSpeech=null;this.utterance=null;resolve();if(error&&token===this.generation)this.onFault('Spoken audio could not play. Check that this tab is not muted and your device has a speech voice available, then retry.');};
   this.cancelSpeech=()=>finish(false);
   try{
    const u=new SpeechSynthesisUtterance(text);this.utterance=u;u.lang='en-US';u.rate=rate;
    const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>v.lang==='en-US'&&v.localService)||voices.find(v=>v.lang.startsWith('en'))||null;
    u.onend=()=>finish(false);u.onerror=e=>finish(!['canceled','interrupted'].includes(e.error));
    timer=setTimeout(()=>{finish(true);if(token===this.generation)speechSynthesis.cancel();},Math.max(12000,text.length*130));
    speechSynthesis.resume();speechSynthesis.speak(u);
   }catch{finish(true);}
  });
  if(token!==this.generation)return;
  this.speaking=false;
  this.restart=setTimeout(()=>{if(token===this.generation){if(this.enabled)this.start();else this.onState('off');}},350);
 }
 cancel(){this.generation++;this.cancelSpeech?.();if(window.speechSynthesis)speechSynthesis.cancel();this.speaking=false;}
 dispose(){this.cancel();this.stop();this.local.cancelLoad();}
}
