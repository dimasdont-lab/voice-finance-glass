/** Page/overlay semantics only. No dock, layout, animation, or DOM code. */
export const SCREENS = Object.freeze({
  home: {group:'home'},
  insights: {group:'insights',sections:['goals','analytics']},
  debts: {group:'debts'},
  balanceAnalysis: {group:'home',back:'home'},
  accountDetail: {group:'home',back:'home'},
  flowDetail: {group:'home',back:'home'},
  marketDetail: {group:'home',back:'home'},
  people: {group:'debts',back:'debts'},
  person: {group:'debts',back:'people'}
});

export const BUTTON_ACTIONS = Object.freeze({
  analytics: {kind:'navigate',screen:'insights'},
  debts: {kind:'navigate',screen:'debts'},
  input: {kind:'openInput'},
  home: {kind:'navigate',screen:'home'},
  more: {kind:'openMore'}
});

const clone = value => JSON.parse(JSON.stringify(value));
const direction = value => value === 'owed' ? 'owed' : 'receivable';
export function canonicalScreen(value) {
  const id = String(value || 'home').replace(/^#/, '');
  if (id === 'goals' || id === 'analytics') return 'insights';
  return Object.hasOwn(SCREENS,id) ? id : 'home';
}

export function createNavigation({initialScreen='home',sessionStorage=null,onRoute=()=>{}}={}) {
  const listeners = new Set();
  const read = (key,fallback='') => {try {return sessionStorage?.getItem(key) || fallback} catch {return fallback}};
  const write = (key,value) => {try {sessionStorage?.setItem(key,String(value))} catch { /* in-memory navigation still works */ }};
  let screen = canonicalScreen(initialScreen);
  let params = {
    peopleDirection:direction(read('voice-finance-people-direction','receivable')),
    person:read('voice-finance-selected-person'),
    personDirection:direction(read('voice-finance-selected-person-direction','receivable')),
    marketId:read('voice-finance-selected-market'),
    accountId:'',flowType:'income'
  };
  let overlays = [];
  if (screen === 'marketDetail' && !params.marketId) screen = 'home';
  const getState = () => clone({screen,group:SCREENS[screen].group,params,overlays,sections:SCREENS[screen].sections || []});
  const emit = event => {const state=getState();for(const listener of listeners)listener({event,state});return state};
  function navigate(next,patch={}) {
    screen=canonicalScreen(next);
    params={...params,...patch};
    if (screen==='people') {
      params.peopleDirection=direction(params.peopleDirection);
      write('voice-finance-people-direction',params.peopleDirection);
    }
    if (screen==='person') {
      params.personDirection=direction(params.personDirection);
      write('voice-finance-selected-person',params.person);
      write('voice-finance-selected-person-direction',params.personDirection);
    }
    if (screen==='marketDetail') write('voice-finance-selected-market',params.marketId);
    overlays=overlays.filter(overlay=>overlay.kind!=='more');
    onRoute({screen,params:clone(params),resetScroll:true});
    return emit('navigate');
  }
  function openOverlay(kind,data={}) {
    // One instance per semantic panel; nesting is retained, e.g. settings → categories.
    overlays=overlays.filter(overlay=>overlay.kind!==kind);
    overlays.push({kind,data:clone(data)});
    return emit('overlay:open');
  }
  function closeOverlay(kind) {
    if (kind) overlays=overlays.filter(overlay=>overlay.kind!==kind);
    else overlays=overlays.slice(0,-1);
    return emit('overlay:close');
  }
  function back() {
    if (overlays.length) return closeOverlay();
    if (screen==='person') return navigate('people',{peopleDirection:params.personDirection});
    return navigate(SCREENS[screen].back || 'home');
  }
  function activateButton(id) {
    const action=BUTTON_ACTIONS[id];
    if (!action) throw new RangeError(`Unknown control: ${id}`);
    if (action.kind==='navigate') return navigate(action.screen);
    if(action.kind==='openMore'&&overlays.some(panel=>panel.kind==='more'))return closeOverlay('more');
    return openOverlay(action.kind==='openInput'?'input':'more');
  }
  return {
    getState,navigate,back,openOverlay,closeOverlay,activateButton,
    openAccount:id=>navigate('accountDetail',{accountId:id}),
    openFlow:type=>navigate('flowDetail',{flowType:type==='expense'?'expense':'income'}),
    openMarket:id=>navigate('marketDetail',{marketId:id}),
    openPeople:value=>navigate('people',{peopleDirection:direction(value)}),
    openPerson:(value,person)=>navigate('person',{personDirection:direction(value),person:String(person)}),
    openSettings(){closeOverlay('more');return openOverlay('settings')},
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)}
  };
}
