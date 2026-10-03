import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as logic from '../index.mjs';
import {createVoiceFinanceLogic} from '../integration-example.mjs';

test('single entry point exports complete headless capabilities without initialization effects',()=>{
  for(const name of ['createFinance','createApplication','createNavigation','createInputParser','createVoiceCapture','createMarketService','createBankingClient','createChartGesture','createTickerGesture'])assert.equal(typeof logic[name],'function',name);
});

test('runtime files contain no copied dock/visual rendering mechanisms',()=>{
  for(const path of ['finance-core.mjs','input-parser.mjs','navigation.mjs','application.mjs','interaction-helpers.mjs','market-service.mjs','banking-client.mjs','voice-capture.mjs','integration-example.mjs']){
    const code=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    assert.doesNotMatch(code,/<(?:style|svg|canvas|section|div)\b/i,path);
    assert.doesNotMatch(code,/function\s+(?:setDockCompact|moveDockIndicator|positionQuickEntry|renderBalanceChart|fitBalanceText|refreshJellyItems)\b/,path);
    assert.doesNotMatch(code,/document\.(?:querySelector|createElement|addEventListener)/,path);
  }
});

test('integration startup is offline and does not overwrite original storage',()=>{
  const calls=[];
  const storage={getItem:key=>{calls.push(['read',key]);return null},setItem:(...args)=>calls.push(['write',...args])};
  const app=createVoiceFinanceLogic({storage,sessionStorage:null,storageKey:'separate-test-state',fetchImpl:()=>{throw new Error('Unexpected request')}});
  assert.equal(calls.some(([type])=>type==='write'),false);
  assert.deepEqual(calls[0],['read','separate-test-state']);
  app.application.openTransaction({amount:20});app.application.saveForm();
  assert.equal(calls.filter(([type])=>type==='write').every(([,key])=>key==='separate-test-state'),true);
  app.dispose();
});

test('home financial control and merged insights share the same goal/balance logic',()=>{
  const app=logic.createApplication();app.openTransaction({type:'income',amount:100});app.saveForm();
  app.openTransaction({amount:25});app.saveForm();
  const home=app.pageModel();assert.equal(home.goals.savings,75);assert.equal(home.balanceMovement.change,75);
  app.activateButton('analytics');const merged=app.pageModel();
  assert.deepEqual(merged.sections.map(s=>s.id),['goals','analytics']);
  assert.deepEqual(merged.sections[0].data,home.goals);app.dispose();
});
