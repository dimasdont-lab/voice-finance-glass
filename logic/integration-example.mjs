/** Integration scaffold, deliberately not an HTML app or dock implementation. */
import {createFinance} from './finance-core.mjs';
import {createNavigation} from './navigation.mjs';
import {createApplication} from './application.mjs';
import {createMarketService} from './market-service.mjs';
import {createBankingClient} from './banking-client.mjs';
import {createVoiceCapture} from './voice-capture.mjs';

export function createVoiceFinanceLogic({storage=null,sessionStorage=null,
  storageKey='voice-finance-v01',initialScreen='home',onRoute=()=>{},
  onMarketData=()=>{},onMarketError=()=>{},fetchImpl=globalThis.fetch,bankApiBase=''}={}) {
  const finance=createFinance({storage,storageKey});
  const navigation=createNavigation({initialScreen,sessionStorage,onRoute});
  const markets=createMarketService({storage,sessionStorage,fetchImpl,
    selection:finance.getState().marketSelection,
    onSelectionChange:ids=>finance.setMarketSelection(ids),
    onDataChange:onMarketData,onError:onMarketError});
  const banking=createBankingClient({baseUrl:bankApiBase,fetchImpl});
  const application=createApplication({finance,navigation,markets});
  const voices=new Set();
  const unsubscribeVoice=application.subscribe(({event})=>{
    if(event==='input:cancel')for(const voice of voices)voice.cancel();
  });
  return {application,finance,navigation,markets,banking,
    // Optional capability adapter: the main UI never auto-starts microphone capture.
    createVoice(options={}) {
      const voice=createVoiceCapture({...options,parse:text=>application.parser.parse(text),
        onResult:result=>{
          if(!navigation.getState().overlays.some(panel=>panel.kind==='input'))return;
          application.submitInput(result.text);options.onResult?.(result);
        }});
      voices.add(voice);return voice;
    },
    dispose(){unsubscribeVoice();for(const voice of voices)voice.destroy();voices.clear();application.dispose()}
  };
}

// Browser host integration example (YOUR new UI supplies render and event bindings):
// const logic=createVoiceFinanceLogic({
//   storage:localStorage,sessionStorage,initialScreen:location.hash,
//   onRoute:({screen})=>history.replaceState(null,'','#'+screen),
//   onMarketData:()=>render(logic.application.pageModel())
// });
// logic.application.subscribe(()=>render(logic.application.pageModel()));
// await logic.markets.loadMarketData();
// onAnalyticsClick => logic.application.activateButton('analytics');
// onDebtClick      => logic.application.activateButton('debts');
// onInputClick     => logic.application.activateButton('input');
// onHomeClick      => logic.application.activateButton('home');
// onMoreClick      => logic.application.activateButton('more');
// onSendText       => logic.application.submitInput(text); // confirmation, NOT save
// onConfirm        => logic.application.confirmInput();
// onTickerTap      => logic.application.openMarket(marketId);
// onBackClick      => logic.application.back(); // also cancels an open draft
// onMicClick       => {logic.application.openInput(); await voice.start();}
// onHashChange     => logic.navigation.navigate(location.hash);
// On unmount: logic.dispose(); unsubscribe host rendering callbacks.
