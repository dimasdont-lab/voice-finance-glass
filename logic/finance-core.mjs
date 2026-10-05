/** Headless finance logic extracted from Voice Finance main 193dedf.
 * No DOM, CSS, rendering, dock, HTML strings, network or automatic demos.
 * Aggregates and financial charts intentionally remain PLN-only, as in main.
 */
export const STORAGE_KEY = 'voice-finance-v01';
export const DEFAULT_CATEGORIES = Object.freeze([
  {id:'groceries',name:'Продукти',icon:'🛒'},
  {id:'transport',name:'Транспорт',icon:'🚕'},
  {id:'food',name:'Їжа',icon:'🍴'},
  {id:'tech',name:'Техніка',icon:'💻'},
  {id:'home',name:'Дім',icon:'⌂'},
  {id:'subscriptions',name:'Підписки',icon:'◉'},
  {id:'business',name:'Бізнес',icon:'◫'},
  {id:'travel',name:'Подорожі',icon:'✈︎'},
  {id:'other',name:'Інше',icon:'•••'}
].map(Object.freeze));
export const DEFAULT_MARKETS = Object.freeze([
  'fx:EURPLN','fx:USDPLN','fx:EURUSD',
  'crypto:XBTUSD','crypto:ETHUSD','crypto:USDTUSD','crypto:SOLUSD',
  'crypto:XRPUSD','crypto:USDCUSD','crypto:DOGEUSD','crypto:ADAUSD',
  'crypto:LTCUSD','crypto:DOTUSD'
]);
export const PERIODS = Object.freeze(['1D','7D','1M','3M','YTD','1Y','ALL']);
const copy = value => JSON.parse(JSON.stringify(value));
const asDate = value => new Date(value);
const dateNow = () => new Date();
const amountInput = value => parseFloat(String(value ?? '').replace(',', '.'));
const iso = date => asDate(date).toISOString();
const positiveAmount = value => {
  const number = amountInput(value);
  if (!(number > 0) || !Number.isFinite(number)) throw new Error('Вкажи суму');
  return number;
};
const defaultUid = () => {
  try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID(); } catch (_) {}
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
};

export function freshState() {
  return {
    categories:copy(DEFAULT_CATEGORIES), transactions:[], debts:[], goal:8000,
    speechLang:'uk-UA', accounts:[], balanceSnapshots:[], marketSelection:[...DEFAULT_MARKETS], templates:[], recurring:[], learned:[]
  };
}

/** Load-compatible migration: original demo accounts/snapshots are removed.
 * Existing transactions are retained; there is no demo-data generator.
 */
export function normalizeState(input) {
  if (!input || typeof input !== 'object') return freshState();
  const list = value => Array.isArray(value) ? copy(value) : [];
  return {
    categories:input.categories?.length ? list(input.categories) : copy(DEFAULT_CATEGORIES),
    transactions:list(input.transactions),
    debts:list(input.debts).map(debt => ({...debt, paid:!!debt.paid, urgent:!!debt.urgent})),
    goal:input.goal || 8000,
    speechLang:input.speechLang || 'uk-UA',
    accounts:list(input.accounts).filter(account => account.source !== 'demo' && !String(account.id).endsWith('-demo')),
    balanceSnapshots:list(input.balanceSnapshots).filter(snapshot => snapshot.source !== 'demo'),
    marketSelection:input.marketSelection?.length ? [...input.marketSelection] : [...DEFAULT_MARKETS],
    templates:list(input.templates), recurring:list(input.recurring), learned:list(input.learned)
  };
}

export function normalizeWords(value) {
  return String(value ?? '').toLowerCase().replace(/[’`]/g,"'").replace(/[–—]/g,'-')
    .replace(/[.,!?;:()[\]{}]/g,' ').replace(/\s+/g,' ').trim();
}
export function foldText(value) {
  return normalizeWords(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/ł/g,'l').replace(/ż|ź/g,'z').replace(/ś/g,'s').replace(/ć/g,'c').replace(/ń/g,'n')
    .replace(/ą/g,'a').replace(/ę/g,'e').replace(/ó/g,'o')
    .replace(/[^\p{L}0-9'\s-]/gu,' ').replace(/\s+/g,' ').trim();
}
export function periodStart(period, now = dateNow()) {
  const date = asDate(now);
  if (period === '1D') date.setHours(date.getHours()-24);
  else if (period === '7D') date.setDate(date.getDate()-7);
  else if (period === '1M') date.setMonth(date.getMonth()-1);
  else if (period === '3M') date.setMonth(date.getMonth()-3);
  else if (period === 'YTD') return new Date(date.getFullYear(),0,1);
  else if (period === '1Y') date.setFullYear(date.getFullYear()-1);
  else return new Date(0);
  return date;
}
export function formatMoney(number, currency = 'PLN') {
  try { return new Intl.NumberFormat('uk-UA',{style:'currency',currency,maximumFractionDigits:2}).format(number); }
  catch (_) { return `${Number(number).toFixed(2)} ${currency}`; }
}
export function formatMovement(number, currency = 'PLN') {
  return `${number>0?'+':number<0?'−':''}${formatMoney(Math.abs(number),currency)}`;
}
export function dateLabel(value, now = dateNow()) {
  const date = asDate(value), current = asDate(now);
  const delta = Math.floor((new Date(current.getFullYear(),current.getMonth(),current.getDate()) - new Date(date.getFullYear(),date.getMonth(),date.getDate()))/86400000);
  if (delta === 0) return 'Сьогодні';
  if (delta === 1) return 'Вчора';
  return date.toLocaleDateString('uk-UA',{day:'2-digit',month:'short'});
}
export function transactionEffect(transaction) {
  return transaction ? (transaction.type === 'income' ? Number(transaction.amount || 0) : -Number(transaction.amount || 0)) : 0;
}
export function calculateTotals(state) {
  const transactions = state.transactions.filter(tx => tx.currency === 'PLN');
  const income = transactions.filter(tx => tx.type === 'income').reduce((sum,tx) => sum+tx.amount,0);
  const expense = transactions.filter(tx => tx.type === 'expense').reduce((sum,tx) => sum+tx.amount,0);
  const accountBalance = state.accounts.filter(a => a.isActive && a.currency === 'PLN').reduce((sum,a) => sum+Number(a.currentBalance || 0),0);
  const unlinked = transactions.filter(tx => !tx.accountId).reduce((sum,tx) => sum+transactionEffect(tx),0);
  return {income,expense,balance:accountBalance+unlinked};
}
export function calculateFinancialSeries(state, kind = 'balance', period = 'ALL', now = dateNow()) {
  const all = state.transactions.filter(tx => tx.currency === 'PLN' && Number.isFinite(Number(tx.amount))).sort((a,b) => asDate(a.date)-asDate(b.date));
  const start = periodStart(period,now), current = calculateTotals(state).balance, end = iso(now);
  if (kind === 'balance') {
    let value = current-all.reduce((sum,tx) => sum+transactionEffect(tx),0);
    all.forEach(tx => { if (asDate(tx.date)<start) value+=transactionEffect(tx); });
    const points = [{timestamp:start.getTime()?start.toISOString():(all[0]?.date || end),value}];
    all.filter(tx => asDate(tx.date)>=start).forEach(tx => { value+=transactionEffect(tx); points.push({timestamp:tx.date,value}); });
    if (points.at(-1)?.timestamp !== end) points.push({timestamp:end,value:current});
    return points;
  }
  let value = 0;
  const points = [{timestamp:start.getTime()?start.toISOString():(all[0]?.date || end),value:0}];
  all.filter(tx => tx.type === kind && asDate(tx.date)>=start).forEach(tx => { value+=Number(tx.amount); points.push({timestamp:tx.date,value}); });
  points.push({timestamp:end,value});
  return points;
}

/** The only effects are writes to the injected local storage and subscription
 * events. State getters return detached objects so a new UI cannot mutate it
 * accidentally. Provide a separate storageKey to avoid touching original data.
 */
export function createFinance({storage = null, storageKey = STORAGE_KEY, clock = dateNow, uid = defaultUid, initialState} = {}) {
  let state;
  if (initialState !== undefined) state = normalizeState(initialState);
  else {
    try { const saved = storage?.getItem(storageKey); state = saved ? normalizeState(JSON.parse(saved)) : freshState(); }
    catch (_) { state = freshState(); }
  }
  const listeners = new Set();
  const now = () => asDate(clock());
  const getState = () => copy(state);
  const categoryById = id => state.categories.find(category => category.id === id) || {name:'Інше',icon:'•••'};
  const commit = (type, detail) => {
    storage?.setItem(storageKey,JSON.stringify(state));
    const event = {type,detail:copy(detail ?? {}),state:getState()};
    for (const listener of [...listeners]) listener(event);
    return event;
  };
  function addSnapshot(source, accountOnly = false) {
    const accountBalances = Object.fromEntries(state.accounts.map(a => [a.id,Number(a.currentBalance || 0)]));
    const total = accountOnly ? state.accounts.filter(a => a.isActive && a.currency === 'PLN').reduce((sum,a) => sum+Number(a.currentBalance || 0),0) : calculateTotals(state).balance;
    const snapshot = {id:uid(),timestamp:now().toISOString(),totalBalance:total,convertedTotalBalance:total,baseCurrency:'PLN',accountBalances,source};
    state.balanceSnapshots.push(snapshot);
    return snapshot;
  }
  function applyAccountTransaction(next, previous) {
    if (previous?.accountId) {
      const account = state.accounts.find(a => a.id === previous.accountId);
      if (account) account.currentBalance = Number(account.currentBalance || 0)-transactionEffect(previous);
    }
    if (next?.accountId) {
      const account = state.accounts.find(a => a.id === next.accountId);
      if (account) account.currentBalance = Number(account.currentBalance || 0)+transactionEffect(next);
    }
    if (previous?.accountId || next?.accountId) addSnapshot('transaction',true);
  }
  function saveTransaction(input, {id = input.id} = {}) {
    const previous = id ? state.transactions.find(tx => tx.id === id) : null;
    if (id && !previous) throw new Error('Операцію не знайдено');
    const amount = positiveAmount(input.amount);
    const tx = {
      id:id || uid(),type:input.type || 'expense',amount,currency:input.currency || 'PLN',
      accountId:input.accountId || '',category:input.category || state.categories[0]?.id || 'other',
      client:String(input.client || '').trim(),note:String(input.note || '').trim(),date:previous?.date || now().toISOString()
    };
    if (!['income','expense'].includes(tx.type)) throw new Error('Некоректний тип операції');
    applyAccountTransaction(tx,previous);
    state.transactions = previous ? state.transactions.map(item => item.id === id ? tx : item) : [...state.transactions,tx];
    commit('transaction:save',{id:tx.id});
    return copy(tx);
  }
  function deleteTransaction(id) {
    const removed = state.transactions.find(tx => tx.id === id);
    if (!removed) return false;
    applyAccountTransaction(null,removed);
    state.transactions = state.transactions.filter(tx => tx.id !== id);
    if (removed.debtId) state.debts = state.debts.map(d => d.id === removed.debtId ? {...d,paid:false} : d);
    commit('transaction:delete',{id});
    return true;
  }
  function syncDebtPayment(debt) {
    const existing = state.transactions.find(tx => tx.debtId === debt.id);
    if (!debt.paid) {
      if (existing) state.transactions = state.transactions.filter(tx => tx.debtId !== debt.id);
      return;
    }
    const payment = {
      id:existing?.id || uid(),debtId:debt.id,type:debt.direction === 'receivable' ? 'income' : 'expense',
      amount:debt.amount,currency:debt.currency,category:debt.direction === 'receivable' ? 'business' : 'other',
      client:debt.direction === 'receivable' ? debt.person : '',
      note:`Оплата боргу · ${debt.person}${debt.note?' · '+debt.note:''}`,date:existing?.date || now().toISOString()
    };
    state.transactions = existing ? state.transactions.map(tx => tx.id === existing.id ? payment : tx) : [...state.transactions,payment];
  }
  function saveDebt(input, {id = input.id} = {}) {
    const person = String(input.person || '').trim();
    if (!person) throw new Error('Вкажи ім’я');
    const amount = positiveAmount(input.amount), previous = id ? state.debts.find(d => d.id === id) : null;
    if (id && !previous) throw new Error('Борг не знайдено');
    const direction = input.direction || 'owed';
    if (!['owed','receivable'].includes(direction)) throw new Error('Некоректний напрямок боргу');
    const debt = {id:id || uid(),direction,person,amount,currency:input.currency || 'PLN',note:String(input.note || '').trim(),urgent:!!input.urgent,paid:!!input.paid,date:previous?.date || now().toISOString()};
    state.debts = previous ? state.debts.map(item => item.id === id ? debt : item) : [...state.debts,debt];
    syncDebtPayment(debt);
    commit('debt:save',{id:debt.id});
    return copy(debt);
  }
  function deleteDebt(id) {
    if (!state.debts.some(debt => debt.id === id)) return false;
    state.debts = state.debts.filter(debt => debt.id !== id);
    state.transactions = state.transactions.filter(tx => tx.debtId !== id);
    commit('debt:delete',{id});
    return true;
  }
  function saveParsedInput(parsed) {
    if (parsed?.kind === 'debt') return saveDebt({...parsed,paid:false});
    if (!parsed?.amount) throw new Error('Вкажи суму');
    const tx = {
      type:parsed.type,amount:positiveAmount(parsed.amount),currency:parsed.currency || 'PLN',category:parsed.category,
      client:parsed.client || '',note:parsed.merchant ? `${parsed.merchant} — ${parsed.note}` : parsed.note,
      id:uid(),date:now().toISOString()
    };
    // Typed/voice confirmations are deliberately unlinked, as voiceSave in main.
    state.transactions.push(tx);
    commit('transaction:confirm-input',{id:tx.id});
    return copy(tx);
  }
  function addManualAccount({name,balance,currency = 'PLN',type = 'manual'}) {
    name = String(name || '').trim();
    if (!name) throw new Error('Вкажи назву рахунку');
    const amount = amountInput(balance);
    if (!Number.isFinite(amount)) throw new Error('Вкажи баланс');
    const account = {id:uid(),provider:type === 'cash' ? 'CASH' : 'MANUAL',bankName:name,displayName:name,shortName:name.slice(0,5).toUpperCase(),currency,currentBalance:amount,availableBalance:amount,isActive:true,source:type};
    state.accounts.push(account);
    addSnapshot('manual');
    commit('account:add',{id:account.id});
    return copy(account);
  }
  function addCategory(name) {
    name = String(name || '').trim();
    if (!name) throw new Error('Вкажи назву категорії');
    const category = {id:'custom-'+now().getTime(),name,icon:'•'};
    state.categories.push(category);
    commit('category:add',{id:category.id});
    return copy(category);
  }
  function deleteCategory(id) {
    if (state.categories.length <= 1) throw new Error('Потрібна хоча б одна категорія');
    if (!state.categories.some(category => category.id === id)) return false;
    state.categories = state.categories.filter(category => category.id !== id);
    state.learned = (state.learned || []).filter(e => e.c !== id);
    state.transactions = state.transactions.map(tx => tx.category === id ? {...tx,category:state.categories[0].id} : tx);
    commit('category:delete',{id});
    return true;
  }
  function transactions({query = '',limit,category,type,accountId,period} = {}) {
    const needle = foldText(query), start = period ? periodStart(period,now()) : null;
    let results = state.transactions.filter(tx => (!needle || foldText([tx.client,tx.note,categoryById(tx.category).name,tx.amount,tx.currency].join(' ')).includes(needle)) &&
      (category === undefined || tx.category === category) && (type === undefined || tx.type === type) &&
      (accountId === undefined || tx.accountId === accountId) && (!start || asDate(tx.date)>=start))
      .sort((a,b) => asDate(b.date)-asDate(a.date));
    if (limit !== undefined) results = results.slice(0,limit);
    return copy(results);
  }
  function categorySummary({limit = 6} = {}) {
    const sums = {};
    state.transactions.filter(tx => tx.currency === 'PLN' && tx.type === 'expense').forEach(tx => sums[tx.category] = (sums[tx.category] || 0)+tx.amount);
    return copy([...state.categories].sort((a,b) => (sums[b.id] || 0)-(sums[a.id] || 0)).slice(0,limit).map(c => ({...c,amount:sums[c.id] || 0})));
  }
  function debtTotals() {
    const total = direction => state.debts.filter(d => d.direction === direction && !d.paid && d.currency === 'PLN').reduce((sum,d) => sum+d.amount,0);
    const owed = total('owed'), receivable = total('receivable');
    return {owed,receivable,net:receivable-owed,urgent:state.debts.filter(d => d.urgent && !d.paid).length,paid:state.debts.filter(d => d.paid).length};
  }
  function debtGroups({query = '',sort = 'name-asc'} = {}) {
    const needle = foldText(query), order = sort === 'name-desc' ? -1 : 1;
    const sorted = state.debts.filter(d => !needle || foldText([d.person,d.note,d.amount,d.currency].join(' ')).includes(needle)).sort((a,b) => order*a.person.localeCompare(b.person,'uk',{sensitivity:'base'}));
    return copy([{key:'owed',items:sorted.filter(d => d.direction === 'owed')},{key:'receivable',items:sorted.filter(d => d.direction === 'receivable')},{key:'urgent',items:sorted.filter(d => d.urgent)}].map(group => ({...group,open:group.items.filter(d => !d.paid),paid:group.items.filter(d => d.paid)})));
  }
  const profileAmount = items => items.filter(d => d.currency === 'PLN').reduce((sum,d) => sum+d.amount,0);
  function personProfiles(direction) {
    const grouped = new Map();
    state.debts.filter(d => d.direction === direction && d.person).forEach(debt => {
      const key = foldText(debt.person);
      if (!key) return;
      const profile = grouped.get(key) || {key,name:debt.person,items:[],latest:''};
      profile.items.push(debt);
      if (!profile.latest || asDate(debt.date)>asDate(profile.latest)) { profile.name=debt.person; profile.latest=debt.date; }
      grouped.set(key,profile);
    });
    return copy([...grouped.values()].map(p => ({...p,open:p.items.filter(d => !d.paid),paid:p.items.filter(d => d.paid)})).sort((a,b) => a.name.localeCompare(b.name,'uk',{sensitivity:'base'})));
  }
  function personProfile(direction,person) {
    const key = foldText(person), items = state.debts.filter(d => d.direction === direction && foldText(d.person) === key).sort((a,b) => asDate(b.date)-asDate(a.date));
    const open = items.filter(d => !d.paid), paid = items.filter(d => d.paid);
    return copy({direction,name:person,key,items,open,paid,openTotal:profileAmount(open),paidTotal:profileAmount(paid)});
  }
  function insights() {
    const by = {}, clients = {};
    state.transactions.filter(tx => tx.currency === 'PLN').forEach(tx => {
      if (tx.type === 'expense') by[tx.category]=(by[tx.category] || 0)+tx.amount;
      if (tx.type === 'income' && tx.client) clients[tx.client]=(clients[tx.client] || 0)+tx.amount;
    });
    return {totals:calculateTotals(state),debts:debtTotals(),categories:Object.entries(by).sort((a,b) => b[1]-a[1]).slice(0,6).map(([id,amount]) => ({id,...copy(categoryById(id)),amount})),clients:Object.entries(clients).sort((a,b) => b[1]-a[1]).map(([name,amount]) => ({name,amount}))};
  }
  function goals() {
    const totals = calculateTotals(state);
    return {limit:state.goal,expense:totals.expense,percent:Math.min(100,totals.expense/state.goal*100),savings:totals.balance};
  }
  function accountSnapshots(id, period = 'ALL') {
    const start = periodStart(period,now());
    return copy(state.balanceSnapshots.filter(s => asDate(s.timestamp)>=start).map(s => ({timestamp:s.timestamp,value:Number(s.accountBalances?.[id])})).filter(p => Number.isFinite(p.value)));
  }
  function balanceAnalysis(period = '1M') {
    const points = calculateFinancialSeries(state,'balance',period,now()), values = points.map(p => p.value), current = values.at(-1) ?? calculateTotals(state).balance, first = values[0] ?? current;
    const inPeriod = state.transactions.filter(tx => tx.currency === 'PLN' && asDate(tx.date)>=periodStart(period,now()));
    return {points,current,change:current-first,min:Math.min(...values),max:Math.max(...values),income:inPeriod.filter(tx => tx.type === 'income').reduce((sum,tx) => sum+tx.amount,0),expense:inPeriod.filter(tx => tx.type === 'expense').reduce((sum,tx) => sum+tx.amount,0)};
  }
  function clearData() {
    // Original button clears transactions/debts ONLY; account balances and
    // snapshots/categories/settings survive. This is not a factory reset.
    state.transactions = [];
    state.debts = [];
    commit('data:clear',{});
  }
  /** Додано у Voice Finance Glass (не в оригінальній логіці): імпорт даних з іншого пристрою.
   * merge — об’єднання за id (нове додається, наявне не змінюється; видалення НЕ синхронізуються);
   * replace — повна заміна операцій, боргів, рахунків і категорій даними з іншого пристрою. */
  /** Додано у Voice Finance Glass: повний скид записів — операції, борги (а з ними й клієнти/кредитори), рахунки, знімки балансу; категорії повертаються до стандартних.
   * Налаштування (ліміт, мова, вибір ринків) зберігаються. Вимагає явного підтвердження. */
  function resetAll({confirmed = false} = {}) {
    if (!confirmed) throw new Error('Потрібне підтвердження');
    state.templates = []; state.recurring = []; state.learned = [];
    state.transactions = []; state.debts = []; state.accounts = []; state.balanceSnapshots = []; state.categories = copy(DEFAULT_CATEGORIES);
    commit('data:reset',{});
    return true;
  }
  /* Додано у Voice Finance Glass: шаблони операцій, повторювані платежі, бюджети категорій. */
  function cleanPlan(input) {
    const type = input.type || 'expense';
    if (!['income','expense'].includes(type)) throw new Error('Некоректний тип операції');
    return {type,amount:positiveAmount(input.amount),currency:input.currency || 'PLN',category:input.category || state.categories[0]?.id || 'other',
      accountId:input.accountId || '',client:String(input.client || '').trim(),note:String(input.note || '').trim()};
  }
  function saveTemplate(input, {id = input.id} = {}) {
    const name = String(input.name || input.note || '').trim();
    if (!name) throw new Error('Вкажи назву шаблону');
    const tpl = {id:id || uid(),name,...cleanPlan(input)};
    state.templates = state.templates.some(t => t.id === tpl.id) ? state.templates.map(t => t.id === tpl.id ? tpl : t) : [...state.templates,tpl];
    commit('template:save',{id:tpl.id});
    return copy(tpl);
  }
  function deleteTemplate(id) {
    if (!state.templates.some(t => t.id === id)) return false;
    state.templates = state.templates.filter(t => t.id !== id);
    commit('template:delete',{id});
    return true;
  }
  function useTemplate(id) {
    const tpl = state.templates.find(t => t.id === id);
    if (!tpl) throw new Error('Шаблон не знайдено');
    const {type,amount,currency,category,accountId,client,note} = tpl;
    return saveTransaction({type,amount,currency,category,accountId,client,note:note || tpl.name});
  }
  function saveRecurring(input, {id = input.id} = {}) {
    const name = String(input.name || input.note || '').trim();
    if (!name) throw new Error('Вкажи назву платежу');
    const day = Math.min(31,Math.max(1,Math.round(Number(input.day) || 1)));
    const prev = id ? state.recurring.find(r => r.id === id) : null;
    const rec = {id:id || uid(),name,day,lastRun:prev?.lastRun || '',...cleanPlan(input)};
    state.recurring = prev ? state.recurring.map(r => r.id === rec.id ? rec : r) : [...state.recurring,rec];
    commit('recurring:save',{id:rec.id});
    return copy(rec);
  }
  function deleteRecurring(id) {
    if (!state.recurring.some(r => r.id === id)) return false;
    state.recurring = state.recurring.filter(r => r.id !== id);
    commit('recurring:delete',{id});
    return true;
  }
  /** Створює операції для повторюваних платежів, чий день у поточному місяці вже настав (без заднього числа за минулі місяці). */
  function runDueRecurring() {
    const d = now(), ym = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'), last = new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    const made = [];
    for (const r of state.recurring) {
      if (r.lastRun === ym || d.getDate() < Math.min(r.day,last)) continue;
      const {type,amount,currency,category,accountId,client,note} = r;
      made.push(saveTransaction({type,amount,currency,category,accountId,client,note:note || r.name}));
      state.recurring = state.recurring.map(x => x.id === r.id ? {...x,lastRun:ym} : x);
    }
    if (made.length) commit('recurring:run',{count:made.length});
    return made;
  }
  /** Запам'ятовує, що слова (ключі з learnKeys) належать до категорії: наступні подібні записи визначаються автоматично. */
  function learnCategory(keys, categoryId) {
    if (!state.categories.some(c => c.id === categoryId)) return 0;
    const ks = [...new Set((keys || []).map(String).filter(k => k.length >= 2))].slice(0,12);
    if (!ks.length) return 0;
    const map = new Map(state.learned.map(e => [e.w,e]));
    for (const k of ks) {
      const e = map.get(k);
      if (e) { if (e.c === categoryId) e.n = Math.min(50,(e.n || 1)+1); else { e.c = categoryId; e.n = 1; } }
      else state.learned.push({w:k,c:categoryId,n:1});
    }
    if (state.learned.length > 600) state.learned = state.learned.slice(-600);
    commit('category:learn',{count:ks.length});
    return ks.length;
  }
  function setCategoryBudget(id, amount) {
    const cat = state.categories.find(c => c.id === id);
    if (!cat) throw new Error('Категорію не знайдено');
    const v = amount === '' || amount == null || Number(amountInput(amount)) <= 0 ? 0 : positiveAmount(amount);
    state.categories = state.categories.map(c => c.id === id ? {...c,budget:v} : c);
    commit('category:budget',{id,budget:v});
    return v;
  }
  function importSnapshot(remote, {mode = 'merge'} = {}) {
    if (!remote || typeof remote !== 'object') throw new TypeError('Некоректні дані синхронізації');
    if (!['merge','replace'].includes(mode)) throw new RangeError('Некоректний режим синхронізації');
    const incoming = normalizeState(remote);
    if (mode === 'replace') {
      state.transactions = incoming.transactions; state.debts = incoming.debts; state.accounts = incoming.accounts;
      state.categories = incoming.categories; state.balanceSnapshots = incoming.balanceSnapshots;
      commit('sync:replace',{});
      return {mode,transactions:state.transactions.length,debts:state.debts.length,accounts:state.accounts.length};
    }
    const has = (list,id) => list.some(x => x.id === id);
    const newAccounts = incoming.accounts.filter(a => !has(state.accounts,a.id));
    const fresh = new Set(newAccounts.map(a => a.id));
    state.accounts = [...state.accounts,...newAccounts];
    state.categories = [...state.categories,...incoming.categories.filter(c => !has(state.categories,c.id))];
    const txs = incoming.transactions.filter(t => !has(state.transactions,t.id));
    const debts = incoming.debts.filter(d => !has(state.debts,d.id));
    txs.forEach(t => {
      const account = t.accountId ? state.accounts.find(a => a.id === t.accountId) : null;
      if (account && !fresh.has(account.id)) account.currentBalance = Number(account.currentBalance || 0)+transactionEffect(t);
    });
    state.transactions = [...state.transactions,...txs];
    state.debts = [...state.debts,...debts];
    if (txs.length || debts.length || newAccounts.length) addSnapshot('sync',true);
    commit('sync:merge',{});
    return {mode,transactions:txs.length,debts:debts.length,accounts:newAccounts.length};
  }
  const api = {
    get state() { return getState(); },getState,storageKey,
    subscribe(listener) { if (typeof listener !== 'function') throw new TypeError('Listener must be a function'); listeners.add(listener); return () => listeners.delete(listener); },
    saveTransaction,deleteTransaction,saveDebt,deleteDebt,saveParsedInput,addManualAccount,addCategory,deleteCategory,
    totals:() => calculateTotals(state),financialSeries:(kind,period) => calculateFinancialSeries(state,kind,period,now()),
    transactions,recentTransactions:(query = '') => transactions({query,limit:query?30:5}),
    categoryById:id => copy(categoryById(id)),categorySummary,debtTotals,debtGroups,personProfiles,personProfile,insights,goals,
    accountSnapshots,balanceAnalysis,activeAccounts:() => copy(state.accounts.filter(a => a.isActive)),
    exportJSON:() => JSON.stringify(state,null,2),clearData,importSnapshot,resetAll,saveTemplate,deleteTemplate,useTemplate,saveRecurring,deleteRecurring,runDueRecurring,setCategoryBudget,learnCategory,
    setMarketSelection(ids) { state.marketSelection=[...new Set(ids)].slice(0,20); commit('markets:select',{ids:state.marketSelection}); return [...state.marketSelection]; },
    // Goal/language are persisted settings in main's schema; no new UI is supplied.
    setGoal(value) { state.goal=positiveAmount(value); commit('goal:set',{goal:state.goal}); },
    setSpeechLanguage(language) { state.speechLang=String(language || 'uk-UA'); commit('language:set',{language:state.speechLang}); }
  };
  return api;
}
