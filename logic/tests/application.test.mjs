import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinance} from '../finance-core.mjs';
import {createNavigation,canonicalScreen,BUTTON_ACTIONS} from '../navigation.mjs';
import {createApplication} from '../application.mjs';
import {createChartGesture,closestChartPoint,createTickerGesture,createReceiptPreview} from '../interaction-helpers.mjs';
import {createVoiceFinanceLogic} from '../integration-example.mjs';

function setup() {
  let n=0;
  const storage=new Map();
  const adapter={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
  const finance=createFinance({storage:adapter,clock:()=>new Date('2026-10-03T12:00:00Z'),uid:()=>`test-${++n}`});
  const navigation=createNavigation({sessionStorage:adapter});
  return createApplication({finance,navigation});
}

test('new control contract has five actions, Goals aliases merged Analytics',()=>{
  const app=setup();
  assert.deepEqual(Object.keys(BUTTON_ACTIONS),['analytics','debts','input','home','more']);
  app.activateButton('analytics');
  assert.equal(app.navigation.getState().screen,'insights');
  assert.deepEqual(app.pageModel().sections.map(s=>s.id),['goals','analytics']);
  app.navigation.navigate('goals');
  assert.equal(app.pageModel().screen,'insights');
  assert.equal(canonicalScreen('#analytics'),'insights');
  assert.equal(canonicalScreen('missing'),'home');
});

test('input and more are overlays, not new routes; Back preserves current page',()=>{
  const app=setup();app.activateButton('debts');app.activateButton('more');
  assert.equal(app.navigation.getState().screen,'debts');
  assert.equal(app.navigation.getState().overlays.at(-1).kind,'more');
  app.activateButton('more');assert.equal(app.navigation.getState().overlays.length,0);
  app.activateButton('more');
  app.navigation.back();assert.equal(app.navigation.getState().screen,'debts');
  app.activateButton('input');assert.equal(app.navigation.getState().screen,'debts');
  assert.equal(app.navigation.getState().overlays.at(-1).kind,'input');
});

test('detail and person Back semantics retained, selections persisted',()=>{
  const app=setup();
  app.navigation.openAccount('a');app.navigation.back();assert.equal(app.pageModel().screen,'home');
  app.navigation.openFlow('expense');app.navigation.back();assert.equal(app.pageModel().screen,'home');
  app.navigation.openMarket('crypto:ETHUSD');app.navigation.back();assert.equal(app.pageModel().screen,'home');
  app.navigation.openPerson('owed','Олег');app.navigation.back();
  assert.equal(app.pageModel().screen,'people');assert.equal(app.pageModel().direction,'owed');
  app.navigation.back();assert.equal(app.pageModel().screen,'debts');
});

test('transaction form create, edit, cancel, delete and list-to-edit flow',()=>{
  const app=setup();
  app.openTransaction();app.updateForm({amount:'120,50',note:'магазин'});const tx=app.saveForm();
  assert.equal(app.finance.totals().expense,120.5);
  app.openAllTransactions();app.editTransaction(tx.id);
  assert.equal(app.navigation.getState().overlays.some(p=>p.kind==='transactionList'),false);
  app.updateForm({amount:'200'});app.cancelForm();assert.equal(app.finance.totals().expense,120.5);
  app.editTransaction(tx.id);app.updateForm({amount:'150'});app.saveForm();
  assert.equal(app.finance.transactions()[0].date,tx.date);
  app.editTransaction(tx.id);app.deleteFormRecord();assert.equal(app.finance.transactions().length,0);
});

test('text phrase is previewed before saving; parsed edit stays manual',()=>{
  const app=setup();const parsed=app.submitInput('-200 на продукти');
  assert.equal(parsed.amount,200);assert.equal(app.finance.transactions().length,0);
  app.confirmInput();assert.equal(app.finance.totals().expense,200);
  app.submitInput('я винен Олегу 500');assert.equal(app.finance.getState().debts.length,0);
  app.editParsedInput();assert.equal(app.getState().interaction.form.kind,'debt');
  app.saveForm();assert.equal(app.finance.getState().debts.length,1);
});

test('paid debt generates one payment and route row opens person then debt editor',()=>{
  const app=setup();app.openDebt({direction:'receivable',person:'Даня',amount:700,paid:true});
  const debt=app.saveForm();assert.equal(app.finance.totals().income,700);
  app.openDebtPerson(debt.id);assert.equal(app.pageModel().screen,'person');
  assert.equal(app.pageModel().openTotal,0);assert.equal(app.pageModel().paidTotal,700);
  app.editDebt(debt.id);app.updateForm({paid:false});app.saveForm();
  assert.equal(app.finance.totals().income,0);
});

test('periods/search/account expansion and receipt manual path work without DOM',()=>{
  const app=setup();for(let i=0;i<4;i++)app.addManualAccount({name:`Account ${i}`,balance:i,currency:'PLN',type:'manual'});
  assert.equal(app.pageModel().accounts.length,3);app.toggleAccounts();assert.equal(app.pageModel().accounts.length,4);
  app.setPeriod('balance','1D');app.navigation.navigate('balanceAnalysis');assert.equal(app.pageModel().periods.balance,'1D');
  assert.throws(()=>app.setPeriod('balance','WRONG'));
  app.openScan();app.selectScanFile({name:'receipt.jpg',type:'image/jpeg'});app.continueScan();
  assert.equal(app.getState().interaction.form.values.note,'Чек: receipt.jpg');
  assert.equal(app.finance.transactions().length,0);
});

test('settings overlay sequencing and nested categories are preserved without geometry',()=>{
  const app=setup();app.activateButton('more');app.navigation.openSettings();
  assert.deepEqual(app.navigation.getState().overlays.map(x=>x.kind),['settings']);
  app.navigation.openOverlay('categories');app.navigation.back();
  assert.deepEqual(app.navigation.getState().overlays.map(x=>x.kind),['settings']);
});

test('cash account form forwards its type and Back cancels drafts without hidden saves',()=>{
  const app=setup();app.openManualAccount('cash');
  const account=app.addManualAccount({name:'Готівка',balance:50});
  assert.equal(account.provider,'CASH');assert.equal(account.source,'cash');
  app.submitInput('-20 на продукти');app.back();
  assert.equal(app.getState().interaction.parsedInput,null);assert.throws(()=>app.confirmInput());
  app.openTransaction({amount:15});app.back();
  assert.equal(app.getState().interaction.form,null);assert.throws(()=>app.saveForm());
  app.openDebt({person:'Олег',amount:10});app.back();assert.equal(app.finance.getState().debts.length,0);
});

test('integration cancels native voice on input Back and ignores late results',async()=>{
  let recognition;
  class Recognition {
    constructor(){recognition=this;this.aborted=false}
    start(){this.onstart?.()}
    abort(){this.aborted=true}
  }
  const logic=createVoiceFinanceLogic({storage:null,sessionStorage:null,fetchImpl:async()=>{throw new Error('No network expected')}});
  const voice=logic.createVoice({env:{SpeechRecognition:Recognition,setTimeout,clearTimeout,setInterval,clearInterval}});
  logic.application.openInput();await voice.start();const session=voice.session;
  logic.application.back();assert.equal(recognition.aborted,true);assert.ok(voice.session>session);
  recognition.onend?.();assert.equal(logic.navigation.getState().overlays.length,0);
  assert.equal(logic.finance.transactions().length,0);logic.dispose();assert.equal(voice.destroyed,true);
});

test('clear requires explicit host confirmation and does not erase accounts',()=>{
  const app=setup();app.addManualAccount({name:'Cash',balance:50,currency:'PLN',type:'cash'});
  assert.equal(app.clearData().confirmationRequired,true);
  app.openTransaction({amount:5});app.saveForm();app.clearData({confirmed:true});
  assert.equal(app.finance.transactions().length,0);assert.equal(app.finance.activeAccounts().length,1);
  assert.equal(app.exportData().fileName,'voice-finance-data.json');
});

test('chart inspection allows vertical page scrolling and horizontal inspection',()=>{
  const gesture=createChartGesture();gesture.start({x:10,y:10});
  assert.deepEqual(gesture.move({x:12,y:30}),{axis:'vertical',inspect:false,hide:true,blockPageScroll:false});
  gesture.end();gesture.start({x:10,y:10});assert.equal(gesture.move({x:30,y:12}).inspect,true);
  assert.equal(gesture.end().hide,false);
  assert.deepEqual(closestChartPoint([{value:1},{value:2},{value:3}],0.51),{index:1,point:{value:2}});
});

test('ticker opens on ONE tap, never after drag, resumes with delay',()=>{
  let now=0;const gesture=createTickerGesture({clock:()=>now});
  gesture.start({x:100,marketId:'fx:EURPLN',offset:20});now=100;
  assert.deepEqual(gesture.end(),{openMarketId:'fx:EURPLN',resumeAt:800});
  gesture.start({x:100,marketId:'fx:EURPLN',offset:20});assert.equal(gesture.move({x:120}).offset,0);
  now=150;assert.equal(gesture.end().openMarketId,null);
});

test('receipt preview URLs are released, non-images never run OCR',()=>{
  const revoked=[];const preview=createReceiptPreview({urlAPI:{createObjectURL:()=> 'blob:test',revokeObjectURL:value=>revoked.push(value)}});
  assert.equal(preview.select({name:'img.jpg',type:'image/jpeg'}).previewURL,'blob:test');
  assert.equal(preview.select({name:'file.pdf',type:'application/pdf'}).previewURL,null);
  assert.deepEqual(revoked,['blob:test']);preview.dispose();
});

test('manual category choice is learned; synonyms and custom-category vocabulary work',()=>{
  const app=setup();
  const cat=app.finance.addCategory('Куріння');
  // без навчання: слова з розширеного словника для категорії «Куріння» вже працюють
  assert.equal(app.parser.parse('22 кальян').category,cat.id);
  assert.equal(app.parser.parse('мінус 22 терея').category,cat.id);
  // категорія без словника: користувач вручну кладе запис — слова запам'ятовуються
  const hobby=app.finance.addCategory('Хобі');
  assert.notEqual(app.parser.parse('мінус 55 фарби акрил').category,hobby.id);
  app.openTransaction({type:'expense',amount:55,note:'фарби акрил',category:hobby.id});
  app.saveForm();
  assert.equal(app.parser.parse('34 акрил').category,hobby.id);
  assert.equal(app.parser.parse('фарби 12').category,hobby.id);
  // синоніми: навчили на «стіки для Айкоса» — «22 тереа» і «22 стіків» потрапляють туди ж
  app.openTransaction({type:'expense',amount:22,note:'стіки для Айкоса',category:cat.id});
  app.saveForm();
  assert.equal(app.parser.parse('22 тереа').category,cat.id);
  assert.equal(app.parser.parse('-22 стіків').category,cat.id);
  assert.equal(app.parser.parse('22 iqos').category,cat.id);
  // видалення категорії стирає вивчене
  app.finance.deleteCategory(hobby.id);
  assert.notEqual(app.parser.parse('34 акрил').category,hobby.id);
});
