import {createFinance,PERIODS} from './finance-core.mjs';
import {createInputParser} from './input-parser.mjs';
import {createNavigation} from './navigation.mjs';
import {MARKET_PERIODS} from './market-service.mjs';

const clone = value => JSON.parse(JSON.stringify(value));

/** Headless interaction controller. Host UI chooses every visual/detail. */
export function createApplication({finance=createFinance(),navigation=createNavigation(),markets=null}={}) {
  const parser=createInputParser({getCategories:()=>finance.getState().categories});
  const listeners=new Set();
  const ui={homeQuery:'',debtQuery:'',debtSort:'name-asc',debtView:'owed',accountsExpanded:false,
    periods:{balance:'1M',account:'1M',flow:'1M',market:'1M'},form:null,inputText:'',parsedInput:null,scanFileName:''};
  const getState=()=>({finance:finance.getState(),navigation:navigation.getState(),interaction:clone(ui)});
  const emit=event=>{for(const listener of listeners)listener({event,state:getState()})};
  const unsubscribeFinance=finance.subscribe(()=>emit('finance:change'));
  const unsubscribeNavigation=navigation.subscribe(()=>emit('navigation:change'));
  function openTransaction(prefill={}) {
    ui.form={kind:'transaction',editingId:null,values:{type:'expense',amount:'',currency:'PLN',accountId:'',category:finance.getState().categories[0]?.id||'other',client:'',note:'',...prefill}};
    navigation.openOverlay('transaction');emit('form:open');return clone(ui.form);
  }
  function editTransaction(id) {
    const tx=finance.getState().transactions.find(item=>item.id===id);
    if (!tx) throw new RangeError('Transaction not found');
    navigation.closeOverlay('transactionList');
    openTransaction({type:tx.type,amount:tx.amount,currency:tx.currency,accountId:tx.accountId||'',category:tx.category,client:tx.client||'',note:tx.note||''});
    ui.form.editingId=id;emit('form:edit');return clone(ui.form);
  }
  function openDebt(prefill={}) {
    ui.form={kind:'debt',editingId:null,values:{direction:ui.debtView==='receivable'?'receivable':'owed',person:'',amount:'',currency:'PLN',note:'',urgent:false,paid:false,...prefill}};
    navigation.openOverlay('debt');emit('form:open');return clone(ui.form);
  }
  function editDebt(id) {
    const debt=finance.getState().debts.find(item=>item.id===id);
    if (!debt) throw new RangeError('Debt not found');
    openDebt(debt);ui.form.editingId=id;emit('form:edit');return clone(ui.form);
  }
  function updateForm(patch) {
    if (!ui.form) throw new Error('No open form');
    ui.form.values={...ui.form.values,...patch};emit('form:change');return clone(ui.form);
  }
  function saveForm() {
    if (!ui.form) throw new Error('No open form');
    const form=ui.form;
    if(!navigation.getState().overlays.some(panel=>panel.kind===form.kind))throw new Error('Form is closed');
    const result=form.kind==='debt'
      ?finance.saveDebt(form.values,{id:form.editingId||undefined})
      :finance.saveTransaction(form.values,{id:form.editingId||undefined});
    navigation.closeOverlay(form.kind);ui.form=null;emit('form:saved');return result;
  }
  function deleteFormRecord() {
    const form=ui.form;
    if (!form?.editingId) return false;
    const result=form.kind==='debt'?finance.deleteDebt(form.editingId):finance.deleteTransaction(form.editingId);
    navigation.closeOverlay(form.kind);ui.form=null;emit('form:deleted');return result;
  }
  function cancelForm() {
    if (ui.form) navigation.closeOverlay(ui.form.kind);
    ui.form=null;emit('form:cancel');
  }
  function openInput() {
    ui.inputText='';ui.parsedInput=null;navigation.openOverlay('input');emit('input:open');
  }
  function submitInput(text) {
    const value=String(text||'').trim();
    if (!value) return null;
    ui.inputText=value;ui.parsedInput=parser.parse(value);
    navigation.openOverlay('input');emit('input:confirmation');return clone(ui.parsedInput);
  }
  function closeInput() {
    navigation.closeOverlay('input');ui.parsedInput=null;ui.inputText='';emit('input:cancel');
  }
  function editParsedInput() {
    const parsed=ui.parsedInput;
    closeInput();
    return parsed?.kind==='debt'?openDebt(parsed):openTransaction(parsed||{});
  }
  function confirmInput() {
    if(!navigation.getState().overlays.some(panel=>panel.kind==='input'))throw new Error('Input is closed');
    const parsed=ui.parsedInput;
    if (!parsed?.amount) throw new RangeError('Enter or recognize a positive amount');
    if (parsed.kind==='debt'&&!parsed.person) return editParsedInput();
    const result=finance.saveParsedInput(parsed);
    closeInput();return result;
  }
  function openTransactionList(categoryId) {
    navigation.openOverlay('transactionList',categoryId?{categoryId}:{});
    return finance.transactions(categoryId?{category:categoryId}:{});
  }
  function setPeriod(target,period) {
    const supported=target==='market'?MARKET_PERIODS:PERIODS;
    if (!Object.hasOwn(ui.periods,target)||!supported.includes(period)) throw new RangeError('Invalid chart period');
    if(target==='market'&&markets)markets.setPeriod(period);
    ui.periods[target]=period;emit('period:change');return period;
  }
  async function openMarket(id) {
    ui.periods.market='1M';navigation.openMarket(id);
    const result=await markets?.openMarketDetail(id);
    emit('market:detail');return result||null;
  }
  function openProvider(provider) {
    if (provider!=='MONOBANK') return {supported:false,reason:'Backend provider connection is not configured'};
    navigation.closeOverlay('accountAdd');navigation.openOverlay('monobank');return {supported:true};
  }
  function openManualAccount(type='manual') {
    navigation.closeOverlay('accountAdd');navigation.openOverlay('manualAccount',{type,name:type==='cash'?'Готівка':''});
  }
  function addManualAccount(values) {
    const panel=navigation.getState().overlays.find(item=>item.kind==='manualAccount');
    const result=finance.addManualAccount({type:panel?.data.type||'manual',...values});navigation.closeOverlay('manualAccount');return result;
  }
  function closePanel(kind) {
    const target=kind||navigation.getState().overlays.at(-1)?.kind;
    if(target==='input')return closeInput();
    if(ui.form?.kind===target)return cancelForm();
    return navigation.closeOverlay(target);
  }
  function back() {
    if(navigation.getState().overlays.length)return closePanel();
    return navigation.back();
  }
  function setDebtView(value) {
    if(!['owed','receivable','urgent'].includes(value))throw new RangeError('Invalid debt group');
    ui.debtView=value;emit('debt:view');
  }
  function selectScanFile(file) {
    ui.scanFileName=file?.name||'';emit('scan:selected');return {name:ui.scanFileName,isImage:!!file?.type?.startsWith('image/')};
  }
  function continueScan() {
    navigation.closeOverlay('scan');
    return openTransaction({note:`Чек: ${ui.scanFileName||'чек'}`});
  }
  function pageModel() {
    const route=navigation.getState(),data=finance.getState(),accounts=finance.activeAccounts();
    const base={screen:route.screen,group:route.group,periods:clone(ui.periods)};
    if(route.screen==='home') {
      const balancePoints=finance.financialSeries('balance','1M'),first=balancePoints[0]?.value??finance.totals().balance,last=balancePoints.at(-1)?.value??first,change=last-first;
      return {...base,totals:finance.totals(),goals:finance.goals(),balancePoints,
        balanceMovement:{change,percent:first?change/Math.abs(first)*100:0,period:'1M'},
        transactions:finance.recentTransactions(ui.homeQuery),accounts:ui.accountsExpanded?accounts:accounts.slice(0,3),accountCount:accounts.length};
    }
    if(route.screen==='insights') return {...base,sections:[{id:'goals',data:finance.goals()},{id:'analytics',data:finance.insights()}]};
    if(route.screen==='debts') return {...base,totals:finance.debtTotals(),groups:finance.debtGroups({query:ui.debtQuery,sort:ui.debtSort}),openedGroup:ui.debtView};
    if(route.screen==='people') return {...base,direction:route.params.peopleDirection,people:finance.personProfiles(route.params.peopleDirection)};
    if(route.screen==='person') return {...base,...finance.personProfile(route.params.personDirection,route.params.person)};
    if(route.screen==='balanceAnalysis') return {...base,...finance.balanceAnalysis(ui.periods.balance),accounts};
    if(route.screen==='accountDetail') {
      const account=data.accounts.find(item=>item.id===route.params.accountId)||null;
      const points=finance.accountSnapshots(route.params.accountId,ui.periods.account),values=points.map(p=>p.value);
      return {...base,account,points,metrics:{current:account?.currentBalance??null,change:values.length>1?values.at(-1)-values[0]:null,min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null},transactions:finance.transactions({accountId:route.params.accountId})};
    }
    if(route.screen==='flowDetail') {
      const type=route.params.flowType,transactions=finance.transactions({type,period:ui.periods.flow});
      return {...base,type,total:transactions.filter(t=>t.currency==='PLN').reduce((sum,t)=>sum+t.amount,0),points:finance.financialSeries(type,ui.periods.flow),transactions};
    }
    if(route.screen==='marketDetail') return {...base,marketId:route.params.marketId,period:ui.periods.market,market:markets?.detailSummary(route.params.marketId,ui.periods.market)||null};
    return base;
  }
  function moreModel() {
    return {categories:finance.categorySummary(),clients:finance.personProfiles('receivable').slice(0,4),creditors:finance.personProfiles('owed').slice(0,4)};
  }
  return {
    finance,navigation,parser,markets,getState,pageModel,moreModel,back,closePanel,
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)},
    dispose(){unsubscribeFinance();unsubscribeNavigation();listeners.clear()},
    activateButton(id){return id==='input'?openInput():navigation.activateButton(id)},
    openTransaction,editTransaction,openDebt,editDebt,updateForm,saveForm,deleteFormRecord,cancelForm,
    openInput,submitInput,confirmInput,editParsedInput,closeInput,
    openTransactionList,openCategory:id=>openTransactionList(id),openAllTransactions:()=>openTransactionList(),
    openDebtPerson(id){const debt=finance.getState().debts.find(d=>d.id===id);if(debt)return navigation.openPerson(debt.direction,debt.person)},
    setSearch(target,value){if(target!=='home'&&target!=='debt')throw new RangeError('Invalid search');ui[target+'Query']=String(value);emit('search:change')},
    setDebtSort(value){if(!['name-asc','name-desc'].includes(value))throw new RangeError('Invalid debt sort');ui.debtSort=value;emit('debt:sort')},
    setDebtView,
    focusDebtGroup(value){navigation.navigate('debts');setDebtView(value);return {scrollToGroup:value}},
    toggleAccounts(){ui.accountsExpanded=!ui.accountsExpanded;emit('accounts:expand');return ui.accountsExpanded},
    setPeriod,openMarket,openProvider,openManualAccount,addManualAccount,
    openScan:()=>navigation.openOverlay('scan'),selectScanFile,continueScan,
    clearData({confirmed=false}={}){if(!confirmed)return {confirmationRequired:true,message:'Очистити всі операції та борги?'};finance.clearData();return {cleared:true}},
    exportData:()=>({fileName:'voice-finance-data.json',mimeType:'application/json',contents:finance.exportJSON()})
  };
}
