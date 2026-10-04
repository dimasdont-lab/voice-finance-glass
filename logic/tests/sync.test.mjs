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
