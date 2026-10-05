import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinance} from '../finance-core.mjs';

function mk(){let n=0;return createFinance({uid:()=>'id'+(++n)+Math.random().toString(36).slice(2,6),initialState:{}});}

test('importSnapshot merge adds new items by id and never changes existing', () => {
  const a = mk(), b = mk();
  a.addManualAccount({type:'cash',name:'Готівка',balance:50});
  const t1 = a.saveTransaction({type:'income',amount:100});
  b.importSnapshot(JSON.parse(a.exportJSON()),{mode:'merge'});
  assert.equal(b.getState().transactions.length,1);
  const r = b.importSnapshot(JSON.parse(a.exportJSON()),{mode:'merge'});
  assert.equal(r.transactions,0);
  assert.equal(b.getState().transactions[0].id,t1.id);
});

test('importSnapshot replace swaps data and rejects bad mode', () => {
  const a = mk(), b = mk();
  a.saveTransaction({type:'expense',amount:5});
  b.saveTransaction({type:'expense',amount:7});
  b.importSnapshot(JSON.parse(a.exportJSON()),{mode:'replace'});
  assert.equal(b.getState().transactions.length,1);
  assert.equal(b.getState().transactions[0].amount,5);
  assert.throws(() => b.importSnapshot({}, {mode:'x'}), RangeError);
  assert.throws(() => b.importSnapshot(null), TypeError);
});

test('resetAll requires confirmation and wipes all records', () => {
  const a = mk();
  a.addManualAccount({type:'cash',name:'Готівка',balance:50});
  a.saveTransaction({type:'income',amount:10});
  a.saveDebt({direction:'receivable',person:'Марта',amount:5});
  assert.throws(() => a.resetAll());
  a.resetAll({confirmed:true});
  const s = a.getState();
  assert.equal(s.transactions.length,0); assert.equal(s.debts.length,0); assert.equal(s.accounts.length,0);
  assert.equal(a.totals().balance,0);
});

test('templates, recurring payments and category budgets', () => {
  let t = new Date('2026-10-20T10:00:00Z');
  const f = createFinance({clock:()=>t,uid:(()=>{let n=0;return()=>'u'+(++n);})(),initialState:{}});
  const tpl = f.saveTemplate({name:'Кава',amount:12,category:'food'});
  f.useTemplate(tpl.id);
  assert.equal(f.getState().transactions.length,1);
  assert.equal(f.getState().transactions[0].amount,12);
  f.saveRecurring({name:'Netflix',amount:49.99,category:'subscriptions',day:5});
  f.saveRecurring({name:'Оренда',amount:2000,category:'home',day:25});
  assert.equal(f.runDueRecurring().length,1);
  assert.equal(f.runDueRecurring().length,0);
  t = new Date('2026-10-26T10:00:00Z');
  assert.equal(f.runDueRecurring().length,1);
  f.setCategoryBudget('food',300);
  assert.equal(f.getState().categories.find(c=>c.id==='food').budget,300);
  f.resetAll({confirmed:true});
  assert.equal(f.getState().templates.length,0);
});
