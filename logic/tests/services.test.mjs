import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  createMarketService, marketCatalog, searchMarkets, marketDetailSummary, periodStart,
  DEFAULT_MARKETS, FIAT_PAIRS, CRYPTO_MARKETS, MARKET_PERIODS,
  MARKET_CACHE_KEY, SELECTED_MARKET_KEY,
} from '../market-service.mjs';
import {
  createBankingClient, normalizeBankAccount, normalizeApiBase, BankingApiError,
} from '../banking-client.mjs';

const NOW = Date.parse('2026-10-15T12:00:00.000Z');
const reply = (payload, status = 200) => ({ok: status >= 200 && status < 300, status, json: async () => payload});
function memoryStorage(initial = {}) {
  const entries = new Map(Object.entries(initial));
  return {getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, String(value)), entries};
}
function marketOptions(options = {}) {
  return {storage: memoryStorage(), sessionStorage: memoryStorage(), now: () => NOW, selection: [], ...options};
}

test('market catalog preserves first 100 fiat pairs, 10 crypto and 13 defaults', () => {
  assert.equal(FIAT_PAIRS.length, 100);
  assert.equal(CRYPTO_MARKETS.length, 10);
  assert.equal(marketCatalog().length, 110);
  assert.equal(DEFAULT_MARKETS.length, 13);
  assert.equal(new Set(marketCatalog().map(m => m.id)).size, 110);
  assert.ok(FIAT_PAIRS.every(m => m.base !== m.quote));
  assert.equal(FIAT_PAIRS[0].id, 'fx:PLNEUR');
  assert.ok(!FIAT_PAIRS.some(m => m.base === 'ZAR'));
  assert.deepEqual(searchMarkets('  bItCoIn ').map(m => m.id), ['crypto:XBTUSD']);
  assert.ok(searchMarkets('EUR/PLN').some(m => m.id === 'fx:EURPLN'));
});

test('selection is unique, insertion ordered, capped at 20 and caller persisted', () => {
  const changes = [], ids = marketCatalog().slice(0, 22).map(m => m.id);
  const service = createMarketService(marketOptions({onSelectionChange: value => changes.push(value)}));
  assert.deepEqual(service.setSelection([...ids, ids[0]]), ids.slice(0, 20));
  assert.deepEqual(service.toggleSelection(ids[21], true), ids.slice(0, 20));
  service.toggleSelection(ids[0], false);
  service.toggleSelection(ids[21], true);
  assert.deepEqual(service.selection, [...ids.slice(1, 20), ids[21]]);
  assert.deepEqual(changes.at(-1), service.selection);
  const copy = service.selection; copy.pop();
  assert.equal(service.selection.length, 20);
});

test('FX ticker uses latest plus 14-day history and stores source date/cache', async () => {
  const calls = [], storage = memoryStorage();
  const service = createMarketService(marketOptions({selection: ['fx:EURPLN'], storage, fetchImpl: async url => {
    calls.push(url);
    return url.includes('/v2/rate/') ? reply({rate: '4.4', date: '2026-10-15'}) : reply([{rate: '4'}, {rate: 'bad'}, {rate: '4.2'}]);
  }}));
  await service.loadMarketData();
  assert.ok(calls.includes('https://api.frankfurter.dev/v2/rate/eur/pln'));
  assert.ok(calls.includes('https://api.frankfurter.dev/v2/rates?from=2026-10-01&base=eur&quotes=pln'));
  const row = service.data['fx:EURPLN'];
  assert.deepEqual(row.history, [4, 4.2]);
  assert.equal(row.value, 4.4);
  assert.ok(Math.abs(row.change - 10) < 1e-9);
  assert.equal(row.updated, '2026-10-15');
  assert.deepEqual(JSON.parse(storage.getItem(MARKET_CACHE_KEY)), {updated: NOW, data: service.data});
});

test('FX short-history status remains unchecked as in source', async () => {
  const service = createMarketService(marketOptions({selection: ['fx:EURPLN'], fetchImpl: async url =>
    url.includes('/v2/rate/') ? reply({rate: 4, date: 'today'}) : reply([{rate: 2}], 503)}));
  await service.loadMarketData();
  assert.equal(service.data['fx:EURPLN'].change, 100);
});

test('Kraken ticker preserves open/close calculation and pair mapping', async () => {
  const calls = [];
  const service = createMarketService(marketOptions({selection: ['crypto:XBTUSD'], fetchImpl: async url => {
    calls.push(url); return reply({result: {XXBTZUSD: {c: ['105'], o: '100'}}});
  }}));
  await service.loadMarketData();
  assert.deepEqual(calls, ['https://api.kraken.com/0/public/Ticker?pair=XBTUSD']);
  assert.deepEqual(service.data['crypto:XBTUSD'].history, [100, 105]);
  assert.equal(service.data['crypto:XBTUSD'].change, 5);
  assert.equal(service.data['crypto:XBTUSD'].updated, new Date(NOW).toISOString());
});

test('stale cache has no TTL; failed ticker keeps prior value and detail history', async () => {
  const prior = {id: 'crypto:XBTUSD', kind: 'crypto', value: 123, detailHistory: [{timestamp: '2000-01-01', value: 90}]};
  const storage = memoryStorage({[MARKET_CACHE_KEY]: JSON.stringify({updated: 1, data: {'crypto:XBTUSD': prior}})});
  const events = [], snapshots = [];
  const service = createMarketService(marketOptions({storage, selection: ['crypto:XBTUSD'], fetchImpl: async () => {throw new Error('offline');},
    onError: event => events.push(event), onDataChange: data => snapshots.push(structuredClone(data))}));
  await service.loadMarketData();
  assert.deepEqual(service.data['crypto:XBTUSD'], prior);
  assert.equal(snapshots[0]['crypto:XBTUSD'].value, 123);
  assert.equal(events[0].operation, 'ticker');
  assert.equal(events[0].id, 'crypto:XBTUSD');
  assert.equal(JSON.parse(storage.getItem(MARKET_CACHE_KEY)).updated, NOW);
});

test('damaged cache does not prevent refresh; successful ticker discards detailHistory', async () => {
  const storage = memoryStorage({[MARKET_CACHE_KEY]: '{broken'});
  const service = createMarketService(marketOptions({storage, selection: ['crypto:XBTUSD'], fetchImpl: async () => reply({result: {BTC: {c: ['20'], o: '10'}}})}));
  await service.loadMarketData();
  service.data['crypto:XBTUSD'].detailHistory = [{timestamp: '2026-10-01', value: 10}];
  storage.setItem(MARKET_CACHE_KEY, JSON.stringify({updated: NOW, data: service.data}));
  await service.loadMarketData();
  assert.equal(service.data['crypto:XBTUSD'].value, 20);
  assert.ok(!('detailHistory' in service.data['crypto:XBTUSD']));
});

test('FX detail uses five-year calendar horizon and reuses nonempty cache', async () => {
  const calls = [];
  const service = createMarketService(marketOptions({fetchImpl: async url => {
    calls.push(url); return reply([{date: '2021-10-15', rate: '4'}, {date: 'bad-value', rate: 'x'}, {date: '2026-10-15', rate: '5'}]);
  }}));
  await service.loadMarketDetail('fx:EURPLN');
  await service.loadMarketDetail('fx:EURPLN');
  assert.deepEqual(calls, ['https://api.frankfurter.dev/v2/rates?from=2021-10-15&base=eur&quotes=pln']);
  assert.deepEqual(service.data['fx:EURPLN'].detailHistory, [{timestamp: '2021-10-15', value: 4}, {timestamp: '2026-10-15', value: 5}]);
  assert.equal(await service.loadMarketDetail('unknown'), null);
  assert.equal(calls.length, 1);
});

test('Kraken detail uses daily 365-day OHLC, timestamps and close; empty detail retries', async () => {
  const calls = [];
  const service = createMarketService(marketOptions({fetchImpl: async url => {
    calls.push(url); return reply({result: {last: 123, XBT: [[172800, '1', '2', '3', '7'], [259200, '1', '2', '3', 'bad']]}});
  }}));
  await service.loadMarketDetail('crypto:XBTUSD');
  assert.equal(calls[0], `https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1440&since=${Math.floor((NOW - 365 * 86400000) / 1000)}`);
  assert.deepEqual(service.data['crypto:XBTUSD'].detailHistory, [{timestamp: '1970-01-03T00:00:00.000Z', value: 7}]);
  let count = 0;
  const empty = createMarketService(marketOptions({fetchImpl: async () => {count++; return reply({result: {last: 1}});}}));
  await empty.loadMarketDetail('crypto:XBTUSD'); await empty.loadMarketDetail('crypto:XBTUSD');
  assert.equal(count, 2);
});

test('detail failures expose error without fabricating replacement history', async () => {
  const errors = [], service = createMarketService(marketOptions({fetchImpl: async () => reply({}, 429), onError: event => errors.push(event)}));
  const row = await service.loadMarketDetail('fx:EURPLN');
  assert.equal(row.id, 'fx:EURPLN');
  assert.ok(!row.detailHistory);
  assert.equal(errors[0].operation, 'detail');
});

test('summary retains prior boundary point and labels synthetic ticker fallback', () => {
  const start = periodStart('7D', NOW).getTime();
  const row = {id: 'fx:EURPLN', kind: 'fx', value: 7, history: [5, 7], detailHistory: [
    {timestamp: new Date(start - 172800000).toISOString(), value: 1},
    {timestamp: new Date(start - 86400000).toISOString(), value: 2},
    {timestamp: new Date(start + 86400000).toISOString(), value: 3},
    {timestamp: new Date(NOW).toISOString(), value: 6},
  ]};
  const detail = marketDetailSummary(row, '7D', NOW);
  assert.deepEqual(detail.values, [2, 3, 6]);
  assert.equal(detail.change, 200);
  assert.equal(detail.minimum, 2); assert.equal(detail.maximum, 6);
  assert.equal(detail.historyOrigin, 'detail-history');
  const fallback = marketDetailSummary({...row, detailHistory: row.detailHistory.slice(0, 1)}, '1D', NOW);
  assert.deepEqual(fallback.values, [5, 7]);
  assert.equal(fallback.historyOrigin, 'ticker-fallback');
  assert.deepEqual(fallback.points.map(p => p.timestamp), [new Date(NOW - 86400000).toISOString(), new Date(NOW).toISOString()]);
  assert.equal(marketDetailSummary(null), null);
});

test('open detail persists session selection and resets period; period change makes no fetch', async () => {
  const sessionStorage = memoryStorage({[SELECTED_MARKET_KEY]: 'crypto:XBTUSD'});
  let calls = 0;
  const service = createMarketService(marketOptions({sessionStorage, fetchImpl: async () => {calls++; return reply([{date: '2026-10-15', rate: 4}]);}}));
  assert.equal(service.selectedMarketId, 'crypto:XBTUSD');
  service.setPeriod('ALL');
  await service.openMarketDetail('fx:EURPLN');
  assert.equal(service.period, '1M');
  assert.equal(sessionStorage.getItem(SELECTED_MARKET_KEY), 'fx:EURPLN');
  for (const period of MARKET_PERIODS) assert.equal(service.setPeriod(period).period, period);
  assert.equal(calls, 1);
  assert.throws(() => service.setPeriod('YTD'), RangeError);
  assert.equal(periodStart('ALL', NOW).getTime(), 0);
});

test('bank account normalization preserves ID/source, aliases and nullable available balance', () => {
  const row = normalizeBankAccount({id: 7, provider: 'MONOBANK', bank_name: 'Monobank', display_name: 'Black', account_type: 'current', currency: 'UAH', current_balance: '12.34', available_balance: null, last_synced_at: 'today', is_active: 1, source: 'bank'});
  assert.equal(row.id, '7'); assert.equal(row.currentBalance, 12.34);
  assert.equal(row.availableBalance, null); assert.equal(row.isActive, true);
  assert.equal(row.bankName, 'Monobank'); assert.equal(row.displayName, 'Black');
  assert.equal(row.accountType, 'current'); assert.equal(row.lastSyncedAt, 'today');
  assert.equal(row.currency, 'UAH'); assert.equal(row.source, 'bank');
  assert.equal(normalizeBankAccount({id: 'a', isActive: 0, availableBalance: '2'}).isActive, false);
  assert.equal(normalizeBankAccount({id: 'a', isActive: '1', availableBalance: '2'}).availableBalance, 2);
  assert.equal(normalizeApiBase(' https://backend.example/// '), 'https://backend.example');
});

test('bank client submits trimmed token with cookies, lists DB accounts and only rereads on refresh', async () => {
  const calls = [], client = createBankingClient({baseUrl: 'https://backend.example/', fetchImpl: async (url, options) => {
    calls.push({url, options});
    return reply(url.endsWith('/api/accounts') ? {accounts: [{id: 'a', currentBalance: '10', isActive: 1}]} : {ok: true});
  }});
  await client.connectMonobank('  synthetic-test-token-not-real  ');
  assert.deepEqual(JSON.parse(calls[0].options.body), {token: 'synthetic-test-token-not-real'});
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
  assert.equal(calls[0].url, 'https://backend.example/api/banks/monobank/connect');
  assert.equal((await client.listAccounts())[0].currentBalance, 10);
  await client.refreshAccounts();
  assert.equal(calls[1].options.method, 'GET');
  assert.equal(calls[2].url, 'https://backend.example/api/accounts');
  assert.ok(!('body' in calls[2].options));
});

test('unconfigured/empty token/unsupported/disconnect never call network', async () => {
  let calls = 0;
  const fetchImpl = async () => {calls++; return reply({});};
  await assert.rejects(createBankingClient({fetchImpl}).health(), {code: 'backend_not_configured'});
  const client = createBankingClient({baseUrl: 'https://backend.example', fetchImpl});
  await assert.rejects(client.connectMonobank('   '), {code: 'token_required'});
  await assert.rejects(client.connectProvider('MONOBANK'), {code: 'unsupported_provider'});
  await assert.rejects(client.disconnect('a'), {code: 'disconnect_not_implemented'});
  assert.equal(calls, 0);
});

test('provider scaffolds are typed failures, sync status is passed through without pretending to sync', async () => {
  const calls = [], client = createBankingClient({baseUrl: 'https://backend.example', fetchImpl: async (url, options) => {
    calls.push({url, options});
    if (url.endsWith('/api/sync')) return reply({ok: true, status: 'sync_queued'}, 202);
    const provider = JSON.parse(options.body).provider;
    return provider === 'PKO' ? reply({status: 'authorization_scaffold_ready', provider, state: 'synthetic'}, 501) : reply({error: 'provider_not_configured'}, 503);
  }});
  await assert.rejects(client.connectProvider('PKO'), error => error instanceof BankingApiError && error.status === 501 && error.code === 'authorization_scaffold_ready');
  await assert.rejects(client.connectProvider('REVOLUT'), {code: 'provider_not_configured', status: 503});
  assert.deepEqual(await client.requestSync(), {ok: true, status: 'sync_queued'});
  assert.equal(calls[2].options.method, 'POST');
  assert.ok(!('body' in calls[2].options));
});

test('invalid JSON backend reply gives explicit transport error', async () => {
  const client = createBankingClient({baseUrl: 'https://backend.example', fetchImpl: async () => ({ok: true, status: 200, json: async () => {throw new Error('not-json');}})});
  await assert.rejects(client.health(), {code: 'invalid_backend_response', status: 200});
});

// Import the unchanged ESM worker without requiring package.json or deployment.
const workerText = await readFile(new URL('../backend/worker.js', import.meta.url), 'utf8');
const {default: worker} = await import(`data:text/javascript;base64,${Buffer.from(workerText).toString('base64')}`);
const ORIGIN = 'https://frontend.example';
function fakeDb(accounts = []) {
  const log = [];
  return {log, prepare(sql) {
    const entry = {sql, values: []}; log.push(entry);
    return {bind(...values) {entry.values = values; return this;},
      async first() {return {user_id: 'user-test', expires_at: new Date(Date.now() + 60000).toISOString()};},
      async all() {return {results: accounts};}, async run() {entry.written = true; return {success: true};}};
  }};
}
function workerRequest(path, {method = 'GET', body, authenticated = true, origin = ORIGIN} = {}) {
  const headers = {Origin: origin};
  if (authenticated) headers.Cookie = 'vf_session=synthetic-session';
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return new Request(`https://backend.example${path}`, {method, headers, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
}

test('worker health/CORS/session gates are real and DELETE route is absent', async () => {
  const env = {FRONTEND_ORIGIN: ORIGIN, DB: fakeDb()};
  assert.equal((await worker.fetch(workerRequest('/api/health', {authenticated: false}), env)).status, 200);
  assert.equal((await worker.fetch(workerRequest('/api/health', {origin: 'https://other.example'}), env)).status, 403);
  assert.equal((await worker.fetch(workerRequest('/api/accounts', {authenticated: false}), env)).status, 401);
  const options = await worker.fetch(workerRequest('/api/accounts', {method: 'OPTIONS', authenticated: false}), env);
  assert.equal(options.status, 204);
  assert.match(options.headers.get('Access-Control-Allow-Methods'), /DELETE/);
  assert.equal((await worker.fetch(workerRequest('/api/banks/disconnect', {method: 'DELETE'}), env)).status, 404);
});

test('worker accounts reads active DB snapshots; sync performs no DB writes', async () => {
  const accounts = [{id: 'bank-a', currentBalance: 20, isActive: 1}], db = fakeDb(accounts), env = {FRONTEND_ORIGIN: ORIGIN, DB: db};
  const result = await worker.fetch(workerRequest('/api/accounts'), env);
  assert.deepEqual(await result.json(), {accounts});
  assert.ok(db.log.some(row => row.sql.includes('is_active=1')));
  const sync = await worker.fetch(workerRequest('/api/sync', {method: 'POST'}), env);
  assert.equal(sync.status, 202);
  assert.deepEqual(await sync.json(), {ok: true, status: 'sync_queued'});
  assert.ok(db.log.every(row => !row.written));
  assert.ok(db.log[0].values[0] !== 'synthetic-session');
  assert.match(db.log[0].values[0], /^[0-9a-f]{64}$/);
});

test('worker unsupported banks return 503 or state-only 501, never completed connection', async () => {
  const db = fakeDb(), env = {FRONTEND_ORIGIN: ORIGIN, DB: db};
  const unconfigured = await worker.fetch(workerRequest('/api/banks/connect', {method: 'POST', body: {provider: 'PKO'}}), env);
  assert.equal(unconfigured.status, 503);
  assert.deepEqual(await unconfigured.json(), {error: 'provider_not_configured'});
  const configured = await worker.fetch(workerRequest('/api/banks/connect', {method: 'POST', body: {provider: 'ERSTE'}}), {...env, ENABLE_BANKING_APPLICATION_ID: 'synthetic-id', ENABLE_BANKING_PRIVATE_KEY: 'synthetic-test-placeholder'});
  assert.equal(configured.status, 501);
  const payload = await configured.json();
  assert.equal(payload.status, 'authorization_scaffold_ready');
  assert.equal(payload.provider, 'ERSTE');
  const writes = db.log.filter(row => row.written);
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /authorization_states/);
  assert.notEqual(writes[0].values[0], payload.state);
});

test('worker Monobank validates token, encrypts server-side and imports minor-unit balances', async () => {
  const originalFetch = globalThis.fetch, db = fakeDb();
  const token = 'synthetic-monobank-test-token-not-real';
  const material = Buffer.alloc(32, 1); // Generated fixture only; not a deployed secret.
  const env = {FRONTEND_ORIGIN: ORIGIN, DB: db, MONOBANK_TOKEN_ENCRYPTION_KEY: material.toString('base64')};
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++; assert.equal(url, 'https://api.monobank.ua/personal/client-info');
    assert.equal(options.headers['X-Token'], token);
    return reply({accounts: [{id: 'external-fixture-id', type: 'black', currencyCode: 985, balance: 12345}]});
  };
  try {
    const invalid = await worker.fetch(workerRequest('/api/banks/monobank/connect', {method: 'POST', body: {token: 'short'}}), env);
    assert.equal(invalid.status, 400); assert.equal(calls, 0);
    const result = await worker.fetch(workerRequest('/api/banks/monobank/connect', {method: 'POST', body: {token}}), env);
    assert.equal(result.status, 201);
    assert.equal((await result.json()).accountsImported, 1);
    const connection = db.log.find(row => row.sql.startsWith('INSERT INTO bank_connections'));
    assert.notEqual(connection.values[3], token);
    const iv = Buffer.from(connection.values[4], 'base64'); assert.equal(iv.length, 12);
    const key = await crypto.subtle.importKey('raw', material, 'AES-GCM', false, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt({name: 'AES-GCM', iv}, key, Buffer.from(connection.values[3], 'base64'));
    assert.equal(new TextDecoder().decode(decrypted), token);
    const account = db.log.find(row => row.sql.startsWith('INSERT OR REPLACE INTO accounts'));
    assert.equal(account.values[7], 'PLN');
    assert.equal(account.values[8], 123.45); assert.equal(account.values[9], 123.45);
    assert.match(account.values[10], /^[0-9a-f]{64}$/);
    assert.notEqual(account.values[10], 'external-fixture-id');
    assert.equal(calls, 1);
  } finally {globalThis.fetch = originalFetch;}
});

test('unchanged worker async helper errors bypass fetch catch: documented scaffold limitation', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => reply({accounts: []});
  try {
    await assert.rejects(worker.fetch(workerRequest('/api/banks/monobank/connect', {method: 'POST', body: {token: 'synthetic-monobank-test-token-not-real'}}), {FRONTEND_ORIGIN: ORIGIN, DB: fakeDb()}), /encryption_key_missing/);
  } finally {globalThis.fetch = originalFetch;}
});
