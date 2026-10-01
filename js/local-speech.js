import {offlineVoiceURLs} from './offline.js?v=3.5.0';
// Vosk runs in a worker. Only final transcripts leave this adapter; no audio upload.
const ENGINE_URL='https://cdn.jsdelivr.net/npm/vosk-browser@0.0.8/dist/vosk.js';
const MODEL_URL='https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz';
let library;
function loadLibrary(engineURL=ENGINE_URL){
 if(window.Vosk)return Promise.resolve(window.Vosk);
 if(!library)library=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=engineURL;script.crossOrigin='anonymous';script.integrity='sha384-nqyY8clHf93uBYFkgkACShMTuvE3U57yXSJaf0Ws+XgzcoUe6OB/1BiOfHqKOWeg';
  const timer=setTimeout(()=>{script.remove();reject(Error('Speech engine download timed out.'));},45000);
  script.onload=()=>{clearTimeout(timer);window.Vosk?resolve(window.Vosk):reject(Error('Speech engine did not load.'));};
  script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('Speech engine download was blocked. Check your connection or content blocker.'));};
  document.head.append(script);
 }).catch(error=>{library=null;throw error;});
 return library;
}
export class LocalSpeech {
 constructor(){this.model=null;this.context=null;this.loading=null;this.cancelPending=null;}
 get supported(){return !!(window.isSecureContext&&window.WebAssembly&&window.Worker&&window.AudioContext&&window.AudioWorkletNode&&navigator.mediaDevices?.getUserMedia);}
 get ready(){return !!this.model?.ready;}
 async prepare(){
  if(this.ready)return;
  if(this.loading)return this.loading;
  let cancelled=false,model;
  this.cancelPending=()=>{cancelled=true;model?.terminate();};
  this.loading=(async()=>{
   const offline=await offlineVoiceURLs();const Vosk=await loadLibrary(offline?.engine||ENGINE_URL);if(cancelled)throw Error('Voice download cancelled.');
   model=new Vosk.Model(offline?.model||MODEL_URL,-1);
   await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{model.terminate();reject(Error('Voice model download timed out. Check your connection and retry.'));},180000);
    const done=error=>{clearTimeout(timer);error?reject(error):resolve();};
    this.cancelPending=()=>{cancelled=true;model.terminate();done(Error('Voice download cancelled.'));};
    model.on('load',message=>done(message.result?null:Error('Voice model could not load. Check available memory and retry.')));
    model.on('error',()=>done(Error('Voice model download failed. Check your connection or content blocker.')));
   });
   if(cancelled)throw Error('Voice download cancelled.');
   this.model=model;
  })().finally(()=>{this.loading=null;this.cancelPending=null;});
  return this.loading;
 }
 cancelLoad(){this.cancelPending?.();}
 async audioContext(){
  if(!this.context||this.context.state==='closed'){
   this.context=new AudioContext();
   this.worklet=this.context.audioWorklet.addModule(new URL('./speech-worklet.js',import.meta.url));
  }
  await this.context.resume();await this.worklet;return this.context;
 }
 createRecognition(){
  const owner=this;
  return new class {
   constructor(){this.cancelled=false;this.suspended=false;this.stream=null;this.recognizer=null;this.node=null;this.source=null;}
   freshRecognizer(context){
    const recognizer=this.recognizer=new owner.model.KaldiRecognizer(context.sampleRate);
    recognizer.on('result',message=>{
     const text=message.result?.text?.trim();if(this.cancelled||this.suspended||this.recognizer!==recognizer||!text)return;
     const result=[{transcript:text}];result.isFinal=true;this.onresult?.({resultIndex:0,results:[result]});
    });
    recognizer.on('error',()=>{if(!this.cancelled&&!this.suspended&&this.recognizer===recognizer)this.onerror?.({error:'local-recognition'});});
   }
   suspend(){this.suspended=true;this.recognizer?.remove();this.recognizer=null;}
   resume(){if(this.cancelled)return;this.suspended=false;if(this.node&&!this.recognizer)this.freshRecognizer(owner.context);if(this.node)this.onstart?.();}
   async start(){
    try{
     if(!owner.ready)throw Error('model-not-ready');
     const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1},video:false});
     if(this.cancelled){stream.getTracks().forEach(t=>t.stop());return;}
     this.stream=stream;
     stream.getAudioTracks().forEach(t=>t.onended=()=>{if(!this.cancelled)this.onerror?.({error:'audio-capture'});});
     const context=await owner.audioContext();if(this.cancelled)return;
     if(!this.suspended)this.freshRecognizer(context);
     this.node=new AudioWorkletNode(context,'mindsight-capture',{numberOfInputs:1,numberOfOutputs:1,channelCount:1});
     this.node.port.onmessage=event=>{if(!this.cancelled&&!this.suspended&&this.recognizer)try{this.recognizer.acceptWaveformFloat(event.data,context.sampleRate);}catch{this.onerror?.({error:'local-recognition'});}};
     this.source=context.createMediaStreamSource(stream);this.source.connect(this.node);this.node.connect(context.destination);
     this.onstart?.();
    }catch(error){if(!this.cancelled){this.onerror?.({error:error.name==='NotAllowedError'?'not-allowed':'audio-capture'});this.abort();}}
   }
   abort(){
    if(this.cancelled)return;this.cancelled=true;
    this.source?.disconnect();if(this.node){this.node.port.onmessage=null;this.node.disconnect();this.node.port.close();}
    this.stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});this.recognizer?.remove();this.onend?.();
   }
  }();
 }
}
