import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInputParser,parseInput,detectAmount,detectDebt,foldText,findMerchant,wordsToNumber} from '../input-parser.mjs';
import {VoiceCapture,RECORDING_LIMIT_MS,TRANSCRIPTION_LIMIT_MS,SAFARI_START_LIMIT_MS,blobTo16kMono} from '../voice-capture.mjs';

const categories=[['groceries','Продукти'],['transport','Транспорт'],['food','Їжа'],['tech','Техніка'],['home','Дім'],['subscriptions','Підписки'],['business','Бізнес'],['travel','Подорожі'],['other','Інше']].map(([id,name])=>({id,name}));
const parser=createInputParser({getCategories:()=>categories});
const transactionFixtures=[
 ['200 злотих Biedronka','expense',200,'PLN','groceries','','Biedronka'],
 ['Бєдронка, продукти, двісті злотих','expense',200,'PLN','groceries','','Biedronka'],
 ['мінус 45 злотих Uber','expense',45,'PLN','transport','','Uber'],
 ['плюс 3000 злотих від Johnny за зйомку','income',3000,'PLN','business','Johnny',''],
 ['Johnny заплатив мені 2000 за монтаж','income',2000,'PLN','business','Johnny',''],
 ['50 євро hotel Booking','expense',50,'EUR','travel','','Booking'],
 ['dwieście złotych Biedronka','expense',200,'PLN','groceries','','Biedronka'],
 ['Lidl sto pięćdziesiąt złotych','expense',150,'PLN','groceries','','Lidl'],
 ['двісті злотих лідл','expense',200,'PLN','groceries','','Lidl'],
 ['two hundred PLN Uber','expense',200,'PLN','transport','','Uber'],
 ['+12,50 EUR coffee','income',12.5,'EUR','food','',''],
 ['-1 200 USD Apple','expense',1200,'USD','tech','','Apple'],
 // Main's rule defaults to expense without an explicit income cue; do not
 // silently change this behavior while extracting the code.
 ['3000 PLN Johnny montaż','expense',3000,'PLN','business','','']
];
for(const [text,type,amount,currency,category,client,merchant] of transactionFixtures)test('main parser fixture: '+text,()=>{
 assert.deepEqual(parser.parse(text),{kind:'transaction',type,amount,currency,category,client,merchant,note:text,transcript:text});
});

test('debt extraction preserves source direction, name spelling, urgency and original transcript',()=>{
 for(const [text,direction,person,urgent,amount] of [['я винен Олегу 500','owed','Олегу',false,500],['Мені винен Даня - 700зл','receivable','Даня',false,700],['клієнт Johnny 3000 urgent','receivable','Johnny',true,3000]])assert.deepEqual(parser.parse(text),{kind:'debt',direction,person,urgent,amount,currency:'PLN',note:text,transcript:text});
 assert.equal(detectDebt('200 Biedronka'),null);
});

test('number and merchant dictionaries retain multilingual folding and fuzzy alias behavior',()=>{
 assert.equal(foldText('Żabka Łódź'), 'zabka lodz');assert.equal(wordsToNumber('two thousand three hundred fifty'),2350);assert.equal(wordsToNumber('дві тисячі п’ять'),2005);
 assert.equal(findMerchant('200 bjedronka').canonical,'Biedronka');assert.equal(findMerchant('200 biedrnka').canonical,'Biedronka');assert.equal(detectAmount('нічого тут'),null);
});

test('categories are injected dynamically; a custom resolver has no relation to DOM or storage',()=>{
 let current=[{id:'custom',name:'Розвиток'}];const dynamic=createInputParser({getCategories:()=>current});assert.equal(dynamic.parse('20 на розвиток').category,'custom');current=[{id:'other',name:'Інше'}];assert.equal(dynamic.parse('20 на розвиток').category,'other');
 let calls=0;assert.equal(parseInput('30 café',{resolveCategory:()=>{calls++;return 'user-category'}}).category,'user-category');assert.equal(calls,1);parseInput('я винен Олегу 20',{resolveCategory:()=>{calls++;return 'ignored'}});assert.equal(calls,1);
});

function deferred(){let resolve;const promise=new Promise(yes=>{resolve=yes});return {promise,resolve}}
function voiceHarness({native=false,nativeAutoStart=true,pendingPermission}={}){
 let now=0,id=0;const timeouts=new Map(),intervals=new Map(),statuses=[],results=[],transcripts=[],streams=[],recorders=[],recognitions=[],workers=[],contexts=[];
 const timers={now:()=>now,setTimeout(fn,ms){const key=++id;timeouts.set(key,{fn,at:now+ms});return key},clearTimeout:key=>timeouts.delete(key),setInterval(fn,ms){const key=++id;intervals.set(key,{fn,ms});return key},clearInterval:key=>intervals.delete(key)};
 const makeStream=()=>{const track={readyState:'live',stops:0,stop(){this.stops++;this.readyState='ended'}};const stream={getTracks:()=>[track],track};streams.push(stream);return stream};
 class Recorder{
  static isTypeSupported(type){return type==='audio/mp4'}
  constructor(stream,options){this.stream=stream;this.mimeType=options?.mimeType||'';this.state='inactive';recorders.push(this)}
  start(){this.state='recording'}requestData(){this.ondataavailable?.({data:new Blob([new Uint8Array(2000)])})}
  stop(){this.state='inactive';queueMicrotask(()=>this.onstop?.())}
 }
 class Recognition{
  constructor(){recognitions.push(this)}start(){if(nativeAutoStart)this.onstart?.()}stop(){this.onend?.()}abort(){this.aborted=true;this.onend?.()}
 }
 class AudioContext{
  constructor(){contexts.push(this)}async decodeAudioData(){return {numberOfChannels:2,length:4,sampleRate:16000,getChannelData:()=>new Float32Array([1,0,-1,0])}}async close(){this.closed=true}
 }
 const env={Blob,MediaRecorder:Recorder,AudioContext,navigator:{mediaDevices:{getUserMedia:()=>pendingPermission?pendingPermission.promise:Promise.resolve(makeStream())}}};if(native)env.webkitSpeechRecognition=Recognition;
 const capture=new VoiceCapture({env,timers,parse:text=>parser.parse(text),onStatus:event=>statuses.push(event),onResult:event=>results.push(event),onTranscript:event=>transcripts.push(event),createWorker(){const worker={messages:[],postMessage(message){this.messages.push(message)},terminate(){this.terminated=true}};workers.push(worker);return worker}});
 const advance=ms=>{const until=now+ms;for(;;){const due=[...timeouts].filter(([,value])=>value.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;timeouts.delete(due[0]);now=due[1].at;due[1].fn()}now=until};
 return {capture,timers,timeouts,intervals,statuses,results,transcripts,streams,recorders,recognitions,workers,contexts,advance,makeStream};
}
async function settle(){for(let i=0;i<20;i++)await Promise.resolve()}

test('Safari native recognition is configured like main and returns a parse without saving anything',async()=>{
 const h=voiceHarness({native:true});assert.equal(await h.capture.start(),true);const recognition=h.recognitions[0];assert.equal(recognition.lang,'uk-UA');assert.equal(recognition.interimResults,true);assert.equal(recognition.continuous,false);assert.equal(recognition.maxAlternatives,3);
 recognition.onresult({resultIndex:0,results:[Object.assign([{transcript:'200 Biedronka'}],{isFinal:true})]});h.capture.stop();assert.equal(h.results.length,1);assert.equal(h.results[0].parsed.amount,200);assert.equal(h.results[0].engine,'safari');assert.equal(h.streams.length,0);h.capture.destroy();
});

test('Safari start timeout falls back to MediaRecorder and ignores late native callbacks',async()=>{
 const h=voiceHarness({native:true,nativeAutoStart:false});await h.capture.start();h.advance(SAFARI_START_LIMIT_MS);await settle();assert.equal(h.capture.getState().engine,'whisper');assert.equal(h.capture.getState().state,'recording');assert.equal(h.streams.length,1);
 h.recognitions[0].onresult({resultIndex:0,results:[Object.assign([{transcript:'late old session'}],{isFinal:true})]});h.recognitions[0].onend();assert.equal(h.results.length,0);h.capture.cancel();assert.equal(h.streams[0].track.readyState,'ended');
});

test('cancel during the permission prompt releases a stream that resolves after cancellation',async()=>{
 const permission=deferred(),h=voiceHarness({pendingPermission:permission});const starting=h.capture.start({engine:'whisper'});h.capture.cancel();const stream=h.makeStream();permission.resolve(stream);await starting;
 assert.equal(stream.track.readyState,'ended');assert.equal(h.recorders.length,0);assert.equal(h.capture.getState().state,'idle');h.capture.destroy();
});

test('five local recording cycles release the microphone, close audio contexts and ignore stale worker responses',async()=>{
 const h=voiceHarness();
 for(let run=0;run<5;run++){
  await h.capture.start({engine:'whisper'});h.capture.stop();await settle();assert.equal(h.streams[run].track.readyState,'ended');assert.equal(h.contexts[run].closed,true);
  const worker=h.workers[0],message=worker.messages.at(-1);assert.equal(message.type,'transcribe');assert.ok(message.audio instanceof Float32Array);
  worker.onmessage({data:{type:'result',requestId:message.requestId-1,text:'wrong'}});assert.equal(h.results.length,run);
  worker.onmessage({data:{type:'result',requestId:message.requestId,text:'200 Biedronka'}});assert.equal(h.results.length,run+1);assert.equal(h.capture.getState().state,'confirmation');
 }
 h.capture.destroy();assert.equal(h.workers[0].terminated,true);assert.equal(h.timeouts.size,0);assert.equal(h.intervals.size,0);
});

test('30-second recording limit stops capture; 240-second recognition limit terminates a stuck worker',async()=>{
 const h=voiceHarness();await h.capture.start({engine:'whisper'});h.advance(RECORDING_LIMIT_MS);await settle();assert.equal(h.recorders[0].state,'inactive');assert.equal(h.streams[0].track.readyState,'ended');assert.equal(h.workers[0].messages.length,1);
 h.advance(TRANSCRIPTION_LIMIT_MS);assert.equal(h.workers[0].terminated,true);assert.equal(h.capture.getState().state,'error');assert.equal(h.capture.getState().activeTracks,0);h.capture.destroy();
});

test('stereo resampling uses the source linear interpolation and always closes AudioContext',async()=>{
 let closed=false;class AC{async decodeAudioData(){return {numberOfChannels:2,length:4,sampleRate:32000,getChannelData:index=>new Float32Array(index?[0,0,0,0]:[0,2,4,6])}}async close(){closed=true}}
 const pcm=await blobTo16kMono(new Blob([new Uint8Array(2000)]),AC);assert.deepEqual(Array.from(pcm),[0,2]);assert.equal(closed,true);
});
