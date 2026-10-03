/* DOM-free voice adapter extracted from main Voice Finance (193dedf).
 * Safari SpeechRecognition is an optional engine; local MediaRecorder →
 * Whisper remains the fallback. No recognition result saves finance data.
 * Hardware support and actual iPhone accuracy must be tested by the host app.
 */
export const RECORDING_LIMIT_MS=30000;
export const TRANSCRIPTION_LIMIT_MS=240000;
export const SAFARI_START_LIMIT_MS=2500;

export function chooseMimeType(MediaRecorder=globalThis.MediaRecorder){
  const choices=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];
  for(const type of choices)if(MediaRecorder?.isTypeSupported?.(type))return type;
  return '';
}

export async function blobTo16kMono(blob,AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext){
  if(!AudioContext)throw new Error('AudioContext недоступний');
  const ctx=new AudioContext();
  try{
    const ab=await blob.arrayBuffer(),decoded=await ctx.decodeAudioData(ab.slice(0)),channels=decoded.numberOfChannels,len=decoded.length,mono=new Float32Array(len);
    for(let c=0;c<channels;c++){const data=decoded.getChannelData(c);for(let i=0;i<len;i++)mono[i]+=data[i]/channels;}
    if(decoded.sampleRate===16000)return mono;
    const ratio=decoded.sampleRate/16000,outLen=Math.max(1,Math.round(mono.length/ratio)),out=new Float32Array(outLen);
    for(let i=0;i<outLen;i++){const pos=i*ratio,lo=Math.floor(pos),hi=Math.min(mono.length-1,lo+1),f=pos-lo;out[i]=mono[lo]*(1-f)+mono[hi]*f;}
    return out;
  }finally{try{await ctx.close()}catch{}}
}

export class VoiceCapture{
  constructor({env=globalThis,workerUrl=new URL('./whisper-worker.js',import.meta.url),createWorker,parse=text=>null,onStatus=()=>{},onResult=()=>{},onTranscript=()=>{},onModelStatus=()=>{},onTimer=()=>{},timers}={}){
    this.env=env;this.workerUrl=workerUrl;this.createWorker=createWorker||(()=>new env.Worker(workerUrl,{type:'module'}));
    this.parse=parse;this.onStatus=onStatus;this.onResult=onResult;this.onTranscript=onTranscript;this.onModelStatus=onModelStatus;this.onTimer=onTimer;
    this.timers=timers||{setTimeout:(fn,ms)=>env.setTimeout(fn,ms),clearTimeout:id=>env.clearTimeout(id),setInterval:(fn,ms)=>env.setInterval(fn,ms),clearInterval:id=>env.clearInterval(id),now:()=>Date.now()};
    this.state='idle';this.session=0;this.engine='';this.recognition=null;this.recorder=null;this.stream=null;this.worker=null;this.whisperReady=false;this.whisperBusy=false;this.model='';this.destroyed=false;
    this.startTimer=null;this.recordTimer=null;this.transcribeTimer=null;this.elapsedTimer=null;
  }
  getState(){return {state:this.state,session:this.session,engine:this.engine,model:this.model,activeTracks:this.stream?.getTracks().filter(t=>t.readyState==='live').length||0,whisperReady:this.whisperReady}}
  _status(state,status,text){this.state=state;this.onStatus({state,status,text,engine:this.engine,session:this.session});}
  _clearTimers(){for(const key of ['startTimer','recordTimer','transcribeTimer']){this.timers.clearTimeout(this[key]);this[key]=null}this.timers.clearInterval(this.elapsedTimer);this.elapsedTimer=null;}
  _releaseStream(stream=this.stream){if(stream)for(const track of stream.getTracks())try{track.stop()}catch{}if(stream===this.stream)this.stream=null;}
  _cleanupRecorder(){this._releaseStream();this.recorder=null;this.timers.clearInterval(this.elapsedTimer);this.elapsedTimer=null;this.timers.clearTimeout(this.recordTimer);this.recordTimer=null;this.onTimer(0);}
  _result(text,engine){const value=String(text||'').trim();this._status('confirmation',engine==='whisper'?'Розпізнано локально':'Розпізнано','“'+value+'”');this.onResult({text:value,parsed:this.parse(value),engine,session:this.session});}
  supportsBrowserRecognition(){return !!(this.env.SpeechRecognition||this.env.webkitSpeechRecognition)}
  async start({engine='auto'}={}){
    if(this.destroyed)throw new Error('VoiceCapture destroyed');
    if(this.state==='recording'){this.stop();return false}
    if(!['idle','confirmation','error'].includes(this.state))return false;
    if(engine!=='whisper'&&this.supportsBrowserRecognition())return this._startBrowser();
    return this.startRecording();
  }
  _startBrowser(){
    this._clearTimers();const Recognition=this.env.SpeechRecognition||this.env.webkitSpeechRecognition,session=++this.session;
    const recognition=new Recognition();this.recognition=recognition;this.engine='safari';let finalText='',shown='';
    recognition.lang='uk-UA';recognition.interimResults=true;recognition.continuous=false;recognition.maxAlternatives=3;
    this._status('requesting','Запускаю розпізнавання Safari…','Safari може показати системний запит.');
    const current=()=>session===this.session&&this.recognition===recognition&&!this.destroyed;
    const fallback=()=>{
      if(!current())return;this.recognition=null;this.session++;try{recognition.abort()}catch{}this._clearTimers();
      this._status('idle','Перехід на локальний Whisper','Safari не відповів.');this.onModelStatus({text:'Safari не відповів — переходжу на локальний Whisper',progress:null});this.startRecording();
    };
    this.startTimer=this.timers.setTimeout(fallback,SAFARI_START_LIMIT_MS);
    recognition.onstart=()=>{if(!current())return;this.timers.clearTimeout(this.startTimer);this.startTimer=null;this._status('recording','Слухаю українською…','Англійські та польські назви можна казати в цій самій фразі.');this.onModelStatus({text:'Розпізнавання Safari · без платного API',progress:null});};
    recognition.onresult=event=>{
      if(!current())return;let interim='',final='';for(let i=event.resultIndex;i<event.results.length;i++){const text=event.results[i][0]?.transcript||'';if(event.results[i].isFinal)final+=text;else interim+=text;}
      if(final)finalText=(finalText+' '+final).trim();shown=(finalText+' '+interim).trim();if(shown)this.onTranscript({text:shown,final:!!final,engine:'safari'});
    };
    recognition.onerror=event=>{
      if(!current())return;this._clearTimers();this.recognition=null;const messages={'not-allowed':'Дозволь мікрофон у налаштуваннях Safari для цього сайту.','no-speech':'Не почув мовлення. Натисни мікрофон і спробуй ще раз.','network':'Safari не зміг запустити розпізнавання. Можна ввести фразу текстом.'};
      this._status('error','Не вдалося розпізнати',messages[event.error]||'Натисни мікрофон і спробуй ще раз.');
    };
    recognition.onend=()=>{if(!current())return;this._clearTimers();this.recognition=null;const text=(finalText||shown).trim();if(text)this._result(text,'safari');else if(['recording','stopping'].includes(this.state))this._status('error','Не почув мовлення','Натисни мікрофон і спробуй ще раз.');};
    try{recognition.start();return true}catch{fallback();return false}
  }
  async startRecording(){
    if(this.destroyed)return false;if(this.recorder?.state==='recording'){this.stop();return false}
    if(!['idle','confirmation','error'].includes(this.state))return false;
    const session=++this.session;this.engine='whisper';this._clearTimers();this._status('requesting','Дозвіл на мікрофон…','Safari може показати системний запит.');
    try{
      if(!this.env.navigator?.mediaDevices?.getUserMedia)throw new Error('У цьому браузері немає доступу до мікрофона.');
      const stream=await this.env.navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false});
      if(session!==this.session||this.destroyed){this._releaseStream(stream);return false}
      this.stream=stream;const chunks=[],mimeType=chooseMimeType(this.env.MediaRecorder),recorder=new this.env.MediaRecorder(stream,mimeType?{mimeType}:undefined);this.recorder=recorder;
      recorder.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data)};
      recorder.onerror=event=>{if(session!==this.session)return;this._cleanupRecorder();this._status('error','Помилка запису',event.error?.message||'Можна одразу спробувати ще раз.');};
      recorder.onstop=async()=>{
        if(session!==this.session||this.destroyed)return;const BlobClass=this.env.Blob||Blob,blob=new BlobClass(chunks,{type:recorder.mimeType||mimeType||'audio/mp4'});this._cleanupRecorder();
        if(blob.size<1200){this._status('error','Запис занадто короткий','Натисни ще раз і скажи фразу.');return}
        await this._transcribeBlob(blob,session);
      };
      recorder.start(250);const started=this.timers.now();this.elapsedTimer=this.timers.setInterval(()=>this.onTimer((this.timers.now()-started)/1000),100);this.recordTimer=this.timers.setTimeout(()=>this.stop(),RECORDING_LIMIT_MS);
      this._status('recording','Слухаю… натисни ще раз, щоб зупинити','Говори природно: «Biedronka, двісті злотих, продукти»');return true;
    }catch(error){if(session!==this.session||this.destroyed)return false;this._cleanupRecorder();this._status('error','Немає доступу до мікрофона',(error?.name==='NotAllowedError'?'У Safari: aA → Website Settings → Microphone → Allow. ':'')+(error?.message||''));return false;}
  }
  stop(){
    if(this.recognition){const recognition=this.recognition;this._status('stopping','Завершую…','Обробляю сказане.');try{recognition.stop()}catch{try{recognition.abort()}catch{}}return;}
    if(this.recorder?.state==='recording'){
      this.timers.clearTimeout(this.recordTimer);this.recordTimer=null;this._status('stopping','Готую аудіо…','Мікрофон уже вимикається.');
      try{this.recorder.requestData();this.recorder.stop();this._releaseStream()}catch{this._cleanupRecorder();this._status('error','Не вдалося зупинити запис','Спробуй ще раз.');}
    }
  }
  _ensureWorker(){
    if(this.worker)return this.worker;const worker=this.createWorker();this.worker=worker;
    worker.onmessage=event=>{
      if(this.worker!==worker||this.destroyed)return;const msg=event.data||{};if(msg.requestId!=null&&msg.requestId!==this.session)return;
      if(msg.type==='progress'){if(this.whisperBusy)this._status('model-loading','Завантажую модель…','Перший запуск потребує інтернету; потім модель береться з кешу.');this.onModelStatus({text:msg.text||'Завантажую локальну модель…',progress:Number.isFinite(msg.progress)?Math.round(msg.progress):null});}
      else if(msg.type==='ready'){this.whisperReady=true;this.model=msg.model||'Whisper';this.onModelStatus({text:'Готово: '+this.model,progress:null});}
      else if(msg.type==='result'){this._clearTimers();this.whisperBusy=false;this.onTranscript({text:msg.text||'',final:true,engine:'whisper'});this._result(msg.text||'','whisper');}
      else if(msg.type==='error'){this._clearTimers();this.whisperBusy=false;this._status('error','Не вдалося розпізнати',msg.error||'Спробуй ще раз або введи фразу текстом.');}
    };
    worker.onerror=()=>{if(this.worker!==worker)return;this._resetWorker();this._status('error','Помилка локальної моделі','Текстове поле та ручне додавання продовжують працювати.');};return worker;
  }
  _resetWorker(message){if(this.worker)try{this.worker.terminate()}catch{}this.worker=null;this.whisperReady=false;this.whisperBusy=false;this._clearTimers();if(message)this._status('error','Розпізнавання зупинено',message);}
  async _transcribeBlob(blob,session){
    try{
      this.whisperBusy=true;this._status('decoding','Обробляю аудіо…','Запис залишається лише на цьому пристрої.');
      const pcm=await blobTo16kMono(blob,this.env.AudioContext||this.env.webkitAudioContext);if(session!==this.session||this.destroyed)return;
      this._status(this.whisperReady?'transcribing':'model-loading',this.whisperReady?'Розпізнаю локально…':'Завантажую модель…','Перший запуск може бути довшим. Ручне введення доступне завжди.');
      const worker=this._ensureWorker();this.transcribeTimer=this.timers.setTimeout(()=>{if(session===this.session)this._resetWorker('Час очікування минув. Спробуй коротшу фразу або введи її текстом.');},TRANSCRIPTION_LIMIT_MS);
      worker.postMessage({type:'transcribe',audio:pcm,requestId:session},[pcm.buffer]);
    }catch(error){if(session!==this.session||this.destroyed)return;this.whisperBusy=false;this._status('error','Не вдалося обробити аудіо',(error?.message||String(error))+' Можна одразу записати ще раз.');}
  }
  warmup(){if(this.destroyed)return;this._ensureWorker().postMessage({type:'warmup'});}
  cancel(){
    this.session++;this._clearTimers();const recognition=this.recognition;this.recognition=null;if(recognition)try{recognition.abort()}catch{}
    const recorder=this.recorder;if(recorder?.state==='recording')try{recorder.stop()}catch{}this._cleanupRecorder();if(this.whisperBusy)this._resetWorker();this._status('idle','','');
  }
  destroy(){this.cancel();this._resetWorker();this.destroyed=true;}
}

export const createVoiceCapture=options=>new VoiceCapture(options);
