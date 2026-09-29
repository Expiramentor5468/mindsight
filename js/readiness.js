// Readiness is cancellable, bounded, and never passes without a spoken response.
export class ReadinessCheck {
 constructor({voice,challenge,onUpdate,rate=()=>.94,timeout=30000}) {
  Object.assign(this,{voice,challenge,onUpdate,rate,timeout});
  this.runId=0;this.running=false;this.listening=false;this.timer=null;
 }
 publish(message,passed=false){this.onUpdate({running:this.running,listening:this.listening,message,passed});}
 reset(message='Not checked yet.'){
  this.runId++;clearTimeout(this.timer);this.running=false;this.listening=false;
  this.voice.dispose();this.publish(message);
 }
 fail(message){this.reset(message);}
 async start(){
  if(this.running){this.reset('Check cancelled. Select Check audio & microphone to try again.');return;}
  this.reset();
  if(!this.voice.available){this.fail('Voice recognition is unavailable in this browser. Microphone access, WebAssembly and Web Audio must be available on HTTPS. You can also choose Touch / keyboard above. The microphone has not been checked.');return;}
  const id=this.runId;
  if(this.voice.needsPreparation){
   this.running=true;this.publish('Downloading and preparing on-device English voice (~40 MB). This can take a few minutes. Cancel is available.');
   try{
    await this.voice.prepare();
    if(id!==this.runId)return;
    this.running=false;this.publish('On-device voice is loaded. Click Check audio & microphone to test your speaker and microphone.');
   }catch(error){if(id===this.runId)this.fail(error.message||'On-device voice could not load. Check your connection and retry.');}
   return;
  }
  this.expected=this.challenge();this.running=true;
  this.publish('Playing the audio check… Listen for a phrase, then repeat it. You can cancel at any time.');
  this.timer=setTimeout(()=>{if(id===this.runId)this.fail('The check timed out. Check site audio and microphone permissions, then try again.');},this.timeout);
  try{
   await this.voice.speak(`Welcome to MindSight. After I finish speaking, say: ready ${this.expected}.`,{rate:this.rate()});
   if(id!==this.runId||!this.running)return;
   this.listening=true;this.publish('Starting microphone… Allow access if your browser asks, then repeat the phrase you heard.');
   this.voice.listen();
  }catch{
   if(id===this.runId)this.fail('The audio or microphone could not start. Check site permissions and try again, or choose Touch / keyboard.');
  }
 }
 started(){if(this.running&&this.listening)this.publish('Listening… Repeat the phrase from the audio check.');}
 hear(text){
  if(!this.running||!this.listening)return;
  const t=String(text).toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
  const digits={one:'1',two:'2',three:'3',four:'4'};
  if(t===`ready ${this.expected}`||t===`ready ${digits[this.expected]}`){
   this.runId++;clearTimeout(this.timer);this.running=false;this.listening=false;this.voice.dispose();
   this.publish('Audio and microphone checked. Your spoken response matched.',true);
  }else this.publish(`Heard “${text}”. Repeat the phrase from the audio check, or cancel and try again.`);
 }
}
