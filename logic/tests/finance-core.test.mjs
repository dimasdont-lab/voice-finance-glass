import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFinance,freshState,normalizeState,calculateTotals,calculateFinancialSeries,
  DEFAULT_CATEGORIES,DEFAULT_MARKETS,STORAGE_KEY,periodStart,foldText
} from '../finance-core.mjs';

function fixture(initialState) {
  const map = new Map();
  const storage = {getItem:key => map.get(key) ?? null,setItem:(key,value) => map.set(key,value)};
  let serial=0,current=new Date('2026-10-01T12:00:00.000Z');
  const core=createFinance({storage,initialState,uid:() => 'id-'+(++serial),clock:() => new Date(current)});
  return {core,map,storage,at:value => {current=new Date(value);}};
}
const tx = (amount, extra={}) => ({type:'expense',amount,currency:'PLN',category:'other',...extra});

test('fresh state contains no demo finances and detached default categories', () => {
  const a=freshState(),b=freshState();
  assert.deepEqual(a.transactions,[]);
  assert.deepEqual(a.accounts,[]);
  assert.deepEqual(a.debts,[]);
  assert.equal(a.goal,8000);
  assert.deepEqual(a.marketSelection,DEFAULT_MARKETS);
  a.categories[0].name='changed';
  assert.equal(b.categories[0].name,'Продукти');
  assert.equal(DEFAULT_CATEGORIES[0].name,'Продукти');
});

test('load migration removes only old demo accounts/snapshots and normalizes debt flags', () => {
  const state=normalizeState({accounts:[{id:'real',source:'manual'},{id:'bank-demo'},{id:'x',source:'demo'}],balanceSnapshots:[{source:'demo'},{source:'transaction'}],transactions:[{id:'kept-demo',source:'demo'}],debts:[{paid:0,urgent:1}],goal:0});
  assert.deepEqual(state.accounts,[{id:'real',source:'manual'}]);
  assert.deepEqual(state.balanceSnapshots,[{source:'transaction'}]);
  assert.equal(state.transactions[0].id,'kept-demo');
  assert.equal(state.debts[0].paid,false);
  assert.equal(state.debts[0].urgent,true);
  assert.equal(state.goal,8000);
});

test('local persistence uses original key and corrupt JSON starts with fresh state', () => {
  const {core,storage,map}=fixture();
  core.saveTransaction(tx('12,50'));
  assert.ok(map.has(STORAGE_KEY));
  const reload=createFinance({storage});
  assert.equal(reload.getState().transactions[0].amount,12.5);
  map.set(STORAGE_KEY,'{broken');
  assert.deepEqual(createFinance({storage}).getState().transactions,[]);
});

test('custom storage key and state/event copies never mutate original state', () => {
  const {storage,map}=fixture();
  const core=createFinance({storage,storageKey:'claude-preview',uid:() => 'fixed'});
  let count=0;
  const stop=core.subscribe(event => {count++;event.state.transactions[0].amount=999;});
  core.saveTransaction(tx(10));
  const snapshot=core.state;snapshot.transactions[0].amount=888;
  assert.equal(core.state.transactions[0].amount,10);
  assert.equal(count,1);
  assert.ok(map.has('claude-preview'));
  assert.equal(map.has(STORAGE_KEY),false);
  stop();core.deleteTransaction('fixed');assert.equal(count,1);
});

test('manual transaction amount, dates and account edits retain main semantics', () => {
  const {core,at}=fixture();
  assert.throws(() => core.saveTransaction(tx('0')),/Вкажи суму/);
  assert.throws(() => core.saveTransaction(tx('abc')),/Вкажи суму/);
  const first=core.saveTransaction(tx('4,25',{note:'  coffee ',client:'  Johnny  '}));
  at('2026-10-03T12:00:00Z');
  const edited=core.saveTransaction(tx(5,{note:'updated'}),{id:first.id});
  assert.equal(edited.date,first.date);
  assert.equal(first.note,'coffee');
  assert.equal(first.client,'Johnny');
  assert.deepEqual(core.totals(),{income:0,expense:5,balance:-5});
  assert.equal(core.deleteTransaction(first.id),true);
  assert.equal(core.deleteTransaction(first.id),false);
});

test('PLN aggregates combine active account balances plus unlinked PLN effects without double counting', () => {
  const {core}=fixture();
  const account=core.addManualAccount({name:'Cash',balance:1000,type:'cash'});
  core.saveTransaction(tx(200,{type:'income',accountId:account.id}));
  core.saveTransaction(tx(50,{accountId:account.id}));
  core.saveTransaction(tx(70));
  core.saveTransaction(tx(300,{type:'income',currency:'EUR'}));
  assert.deepEqual(core.totals(),{income:200,expense:120,balance:1080});
  assert.equal(core.state.accounts[0].currentBalance,1150);
  assert.equal(core.state.accounts[0].availableBalance,1000);
});

test('moving a transaction between accounts reverses its old balance and applies its new effect', () => {
  const {core}=fixture();
  const a=core.addManualAccount({name:'A',balance:500}),b=core.addManualAccount({name:'B',balance:200});
  const first=core.saveTransaction(tx(50,{accountId:a.id}));
  core.saveTransaction(tx(20,{type:'income',accountId:b.id}),{id:first.id});
  assert.deepEqual(core.state.accounts.map(a => a.currentBalance),[500,220]);
  core.deleteTransaction(first.id);
  assert.deepEqual(core.state.accounts.map(a => a.currentBalance),[500,200]);
});

test('manual and transaction snapshots intentionally have different total conventions in main', () => {
  const {core}=fixture();
  core.saveTransaction(tx(100,{type:'income'}));
  const account=core.addManualAccount({name:'Bank',balance:500});
  core.saveTransaction(tx(50,{type:'income',accountId:account.id}));
  assert.deepEqual(core.state.balanceSnapshots.map(s => s.totalBalance),[600,550]);
  assert.deepEqual(core.state.balanceSnapshots.map(s => s.source),['manual','transaction']);
  assert.equal(core.totals().balance,650);
  assert.deepEqual(core.accountSnapshots(account.id).map(p => p.value),[500,550]);
});

test('non-PLN and inactive accounts are not converted into the total balance', () => {
  const state=freshState();
  state.accounts=[{id:'EUR',currency:'EUR',isActive:true,currentBalance:999},{id:'off',currency:'PLN',isActive:false,currentBalance:100}];
  state.transactions=[{type:'income',amount:100,currency:'EUR'},{type:'expense',amount:12,currency:'PLN',accountId:'off'}];
  assert.deepEqual(calculateTotals(state),{income:0,expense:12,balance:0});
});

test('the original currency-mismatch limitation is preserved instead of silently inventing FX conversion', () => {
  const {core}=fixture();
  const account=core.addManualAccount({name:'PLN',balance:500});
  core.saveTransaction(tx(10,{type:'income',currency:'USD',accountId:account.id}));
  assert.equal(core.state.accounts[0].currentBalance,510);
  assert.deepEqual(core.totals(),{income:0,expense:0,balance:510});
});

test('manual transactions produce useful balance, income and expense series without any connected accounts', () => {
  const {core,at}=fixture();
  at('2026-09-01T12:00:00Z');core.saveTransaction(tx(200,{type:'income'}));
  at('2026-09-02T12:00:00Z');core.saveTransaction(tx(30));
  at('2026-09-03T12:00:00Z');core.saveTransaction(tx(999,{currency:'EUR'}));
  at('2026-10-01T12:00:00Z');
  assert.deepEqual(core.financialSeries('balance','ALL').map(p => p.value),[0,200,170,170]);
  assert.deepEqual(core.financialSeries('income','ALL').map(p => p.value),[0,200,200]);
  assert.deepEqual(core.financialSeries('expense','ALL').map(p => p.value),[0,30,30]);
});

test('1D series carry forward earlier balance and include only in-period effects', () => {
  const {core,at}=fixture();
  at('2026-09-01T12:00:00Z');core.saveTransaction(tx(100,{type:'income'}));
  at('2026-10-01T06:00:00Z');core.saveTransaction(tx(20));
  at('2026-10-01T12:00:00Z');
  assert.deepEqual(core.financialSeries('balance','1D').map(p => p.value),[100,80,80]);
  assert.deepEqual(core.financialSeries('income','1D').map(p => p.value),[0,0]);
  assert.equal(periodStart('1D',new Date('2026-10-01T12:00:00Z')).toISOString(),'2026-09-30T12:00:00.000Z');
});

test('empty source data returns real zero-value endpoints and never synthetic demonstration growth', () => {
  const state=freshState(),now=new Date('2026-10-01T12:00:00Z');
  assert.deepEqual(calculateFinancialSeries(state,'balance','ALL',now),[{timestamp:now.toISOString(),value:0}]);
  assert.deepEqual(calculateFinancialSeries(state,'income','ALL',now).map(p => p.value),[0,0]);
});

test('paid receivable debt creates one income payment; repeated edits update it without duplication', () => {
  const {core,at}=fixture();
  const debt=core.saveDebt({person:' Johnny ',amount:500,direction:'receivable',paid:true,note:'work'});
  const first=core.state.transactions[0];
  assert.equal(first.type,'income');
  assert.equal(first.category,'business');
  assert.equal(first.client,'Johnny');
  assert.equal(first.note,'Оплата боргу · Johnny · work');
  assert.equal(core.totals().balance,500);
  at('2026-10-02T12:00:00Z');
  core.saveDebt({...debt,amount:700},{id:debt.id});
  assert.equal(core.state.transactions.length,1);
  assert.equal(core.state.transactions[0].id,first.id);
  assert.equal(core.state.transactions[0].date,first.date);
  assert.equal(core.state.debts[0].date,debt.date);
  assert.equal(core.totals().balance,700);
});

test('unpaying and deleting debts remove linked payments; deleting a payment marks its debt unpaid', () => {
  const {core}=fixture();
  const debt=core.saveDebt({person:'Oleg',amount:100,direction:'owed',paid:true});
  assert.equal(core.totals().balance,-100);
  assert.equal(core.state.transactions[0].category,'other');
  core.deleteTransaction(core.state.transactions[0].id);
  assert.equal(core.state.debts[0].paid,false);
  core.saveDebt({...debt,paid:true},{id:debt.id});
  core.saveDebt({...debt,paid:false},{id:debt.id});
  assert.deepEqual(core.state.transactions,[]);
  core.saveDebt({...debt,paid:true},{id:debt.id});
  core.deleteDebt(debt.id);
  assert.deepEqual(core.state.debts,[]);
  assert.deepEqual(core.state.transactions,[]);
});

test('known source gap: manual editing of a debt payment drops debtId instead of claiming corrected parity', () => {
  const {core}=fixture();
  const debt=core.saveDebt({person:'Oleg',amount:100,direction:'owed',paid:true});
  const payment=core.state.transactions[0];
  core.saveTransaction(tx(90),{id:payment.id});
  assert.equal(core.state.transactions[0].debtId,undefined);
  core.deleteTransaction(payment.id);
  assert.equal(core.state.debts.find(d => d.id === debt.id).paid,true);
});

test('person grouping folds Polish spelling/case, preserves latest display name and counts PLN only', () => {
  const {core,at}=fixture();
  core.saveDebt({person:'Łukasz',amount:100,direction:'receivable'});
  at('2026-10-02T12:00:00Z');core.saveDebt({person:'lukasz',amount:50,direction:'receivable',currency:'EUR',paid:true});
  const profiles=core.personProfiles('receivable');
  assert.equal(profiles.length,1);
  assert.equal(profiles[0].name,'lukasz');
  assert.equal(profiles[0].open.length,1);
  assert.equal(profiles[0].paid.length,1);
  assert.equal(core.personProfile('receivable','ŁUKASZ').openTotal,100);
  assert.equal(core.personProfile('receivable','ŁUKASZ').paidTotal,0);
  assert.equal(foldText('Żabka ŁÓDŹ'),'zabka lodz');
});

test('debt search, alphabetical grouping, urgent counts and paid status mirror main', () => {
  const {core}=fixture();
  core.saveDebt({person:'Zorro',amount:50,direction:'owed',urgent:true});
  core.saveDebt({person:'Anna',amount:30,direction:'receivable',paid:true,urgent:true});
  const groups=core.debtGroups({sort:'name-desc'});
  assert.equal(groups.find(g => g.key === 'urgent').items.length,2);
  assert.equal(groups.find(g => g.key === 'urgent').open.length,1);
  assert.deepEqual(core.debtTotals(),{owed:50,receivable:0,net:-50,urgent:1,paid:1});
  assert.equal(core.debtGroups({query:'anna'}).find(g => g.key === 'receivable').items[0].person,'Anna');
});

test('category deletion reassigns operations and refuses removal of the final category', () => {
  const {core}=fixture();
  const category=core.addCategory(' Studio ');
  core.saveTransaction(tx(10,{category:category.id}));
  core.deleteCategory(category.id);
  assert.equal(core.state.transactions[0].category,'groceries');
  while(core.state.categories.length>1)core.deleteCategory(core.state.categories.at(-1).id);
  assert.throws(() => core.deleteCategory(core.state.categories[0].id),/хоча б одна категорія/);
});

test('search, top categories, client insights and goal percentage are data-only selectors', () => {
  const {core}=fixture();
  core.saveTransaction(tx(9000,{category:'groceries',note:'Żabka'}));
  core.saveTransaction(tx(100,{currency:'EUR',category:'food'}));
  core.saveTransaction(tx(1200,{type:'income',category:'business',client:'Johnny'}));
  assert.equal(core.transactions({query:'zabka'})[0].note,'Żabka');
  assert.equal(core.categorySummary()[0].id,'groceries');
  assert.equal(core.categorySummary()[0].amount,9000);
  assert.deepEqual(core.insights().clients,[{name:'Johnny',amount:1200}]);
  assert.deepEqual(core.goals(),{limit:8000,expense:9000,percent:100,savings:-7800});
});

test('confirmed input is persisted only on explicit save, prefixes merchant and creates unlinked operations', () => {
  const {core}=fixture();
  const parsed={kind:'transaction',type:'expense',amount:20,currency:'PLN',category:'groceries',merchant:'Biedronka',note:'original'};
  assert.deepEqual(core.state.transactions,[]);
  const saved=core.saveParsedInput(parsed);
  assert.equal(saved.note,'Biedronka — original');
  assert.equal(saved.accountId,undefined);
  core.saveParsedInput({kind:'debt',person:'Oleg',direction:'owed',amount:30,currency:'PLN',paid:true});
  assert.equal(core.state.debts[0].paid,false);
  assert.throws(() => core.saveParsedInput({kind:'debt',amount:20}),/Вкажи ім’я/);
});

test('export is plain JSON; clear preserves accounts, snapshots, categories and settings exactly like main', () => {
  const {core}=fixture();
  const account=core.addManualAccount({name:'Cash',balance:-50});
  core.saveTransaction(tx(10,{type:'income',accountId:account.id}));
  core.saveDebt({person:'Oleg',amount:20,direction:'owed'});
  const before=JSON.parse(core.exportJSON());
  core.clearData();
  const after=core.state;
  assert.deepEqual(after.transactions,[]);
  assert.deepEqual(after.debts,[]);
  assert.deepEqual(after.accounts,before.accounts);
  assert.deepEqual(after.balanceSnapshots,before.balanceSnapshots);
  assert.deepEqual(after.categories,before.categories);
  assert.equal(after.accounts[0].currentBalance,-40);
});

test('market selection is unique and capped at twenty, as the original checkbox handler', () => {
  const {core}=fixture();
  const selected=core.setMarketSelection(['same','same',...Array.from({length:30},(_,i) => 'm'+i)]);
  assert.equal(selected.length,20);
  assert.equal(selected.filter(id => id === 'same').length,1);
  core.setMarketSelection([]);
  assert.deepEqual(core.state.marketSelection,[]);
});

// Portable parity reference extracted from index.html at main 193dedf.
// Only clock/state dependencies are injected; no source HTML must ship with
// the new application or exist on the machine that runs these tests.
function sourceTotals(state) {
  const tx=state.transactions.filter(t=>t.currency==='PLN');
  const income=tx.filter(t=>t.type==='income').reduce((a,b)=>a+b.amount,0);
  const expense=tx.filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount,0);
  const accountBalance=(state.accounts||[]).filter(a=>a.isActive&&a.currency==='PLN').reduce((sum,a)=>sum+Number(a.currentBalance||0),0);
  const unlinked=tx.filter(t=>!t.accountId).reduce((sum,t)=>sum+(t.type==='income'?t.amount:-t.amount),0);
  return {income,expense,balance:accountBalance+unlinked};
}
function sourceSeries(state,kind,period,now) {
  const all=state.transactions.filter(t=>t.currency==='PLN').filter(t=>Number.isFinite(Number(t.amount))).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const start=periodStart(period,now),current=sourceTotals(state).balance,effect=t=>t.type==='income'?Number(t.amount):-Number(t.amount);
  if(kind==='balance'){
    let value=current-all.reduce((sum,t)=>sum+effect(t),0);const points=[];
    all.forEach(t=>{if(new Date(t.date)<start)value+=effect(t)});
    points.push({timestamp:start.getTime()?start.toISOString():(all[0]?.date||now.toISOString()),value});
    all.filter(t=>new Date(t.date)>=start).forEach(t=>{value+=effect(t);points.push({timestamp:t.date,value})});
    if(points.at(-1)?.timestamp!==now.toISOString())points.push({timestamp:now.toISOString(),value:current});
    return points;
  }
  let value=0;const points=[{timestamp:start.getTime()?start.toISOString():(all[0]?.date||now.toISOString()),value:0}];
  all.filter(t=>t.type===kind&&new Date(t.date)>=start).forEach(t=>{value+=Number(t.amount);points.push({timestamp:t.date,value})});
  points.push({timestamp:now.toISOString(),value});return points;
}
test('portable source-reference parity covers unsorted dated transactions, accounts and every period', () => {
  const now=new Date('2026-10-01T12:00:00Z'),state=freshState();
  state.accounts=[{id:'a',isActive:true,currency:'PLN',currentBalance:2300},{id:'inactive',isActive:false,currency:'PLN',currentBalance:500},{id:'eur',isActive:true,currency:'EUR',currentBalance:200}];
  state.transactions=[
    {...tx(17),id:'latest',date:'2026-10-01T08:00:00Z'},
    {...tx(900,{type:'income',accountId:'a'}),id:'oldest',date:'2025-01-01T09:00:00Z'},
    {...tx(400,{type:'income'}),id:'middle',date:'2026-09-26T09:00:00Z'},
    {...tx(77,{currency:'USD'}),id:'ignored',date:'2026-09-30T09:00:00Z'},
    {...tx(200,{accountId:'a'}),id:'linked',date:'2026-08-20T09:00:00Z'}
  ];
  assert.deepEqual(calculateTotals(state),sourceTotals(state));
  for(const period of ['1D','7D','1M','3M','YTD','1Y','ALL'])for(const kind of ['balance','income','expense']){
    assert.deepEqual(calculateFinancialSeries(state,kind,period,now),sourceSeries(state,kind,period,now),kind+' '+period);
  }
});

test('copied existing finance data survives the headless extraction and snapshot order matches source filtering', () => {
  const original=freshState();
  original.categories.push({id:'custom',name:'Особисте',icon:'!'});
  original.transactions=[{...tx(50,{category:'custom'}),id:'historic',date:'2026-08-01T12:00:00Z'}];
  original.accounts=[{id:'bank',provider:'MANUAL',bankName:'Bank',displayName:'Bank',currency:'PLN',currentBalance:450,isActive:true,source:'manual'}];
  original.balanceSnapshots=[
    {id:'later',timestamp:'2026-09-28T12:00:00Z',accountBalances:{bank:450},source:'manual'},
    {id:'earlier',timestamp:'2026-09-20T12:00:00Z',accountBalances:{bank:500},source:'transaction'},
    {id:'missing',timestamp:'2026-09-29T12:00:00Z',accountBalances:{},source:'transaction'}
  ];
  original.debts=[{id:'debt',direction:'owed',person:'Oleg',amount:20,currency:'PLN',paid:false,urgent:true,date:'2026-08-01T12:00:00Z'}];
  const {core}=fixture(original);
  assert.deepEqual(core.getState(),original);
  assert.deepEqual(core.accountSnapshots('bank','1M'),[
    {timestamp:'2026-09-28T12:00:00Z',value:450},
    {timestamp:'2026-09-20T12:00:00Z',value:500}
  ]);
  assert.deepEqual(original.transactions,[{...tx(50,{category:'custom'}),id:'historic',date:'2026-08-01T12:00:00Z'}]);
});
