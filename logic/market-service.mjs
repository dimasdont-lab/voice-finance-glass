/** Headless extraction of main 193dedf index.html:458–460, 641–647, 653.
 * No charts, ticker animation, HTML, navigation or dock code is included.
 * Market selection belongs to the caller's finance state; callbacks persist it.
 */
export const MARKET_CACHE_KEY = 'voice-finance-market-cache';
export const SELECTED_MARKET_KEY = 'voice-finance-selected-market';
export const MARKET_PERIODS = ['1D', '7D', '1M', '3M', '1Y', 'ALL'];
export const FIAT_CURRENCIES = ['PLN','EUR','USD','GBP','CHF','UAH','CZK','SEK','NOK','DKK','CAD','AUD','NZD','JPY','CNY','HKD','SGD','HUF','RON','BGN','TRY','ILS','INR','BRL','MXN','ZAR'];
// Preserve the source's first-100 truncation, rather than inventing more pairs.
export const FIAT_PAIRS = FIAT_CURRENCIES.flatMap(base =>
  FIAT_CURRENCIES.filter(quote => quote !== base).map(quote => ({
    id: `fx:${base}${quote}`, kind: 'fx', base, quote, label: `${base}/${quote}`,
  })),
).slice(0, 100);
export const CRYPTO_MARKETS = [
  ['XBTUSD','BTC','Bitcoin'], ['ETHUSD','ETH','Ethereum'], ['USDTUSD','USDT','Tether'],
  ['SOLUSD','SOL','Solana'], ['XRPUSD','XRP','XRP'], ['USDCUSD','USDC','USD Coin'],
  ['DOGEUSD','DOGE','Dogecoin'], ['ADAUSD','ADA','Cardano'],
  ['LTCUSD','LTC','Litecoin'], ['DOTUSD','DOT','Polkadot'],
].map(([pair, symbol, name]) => ({
  id: `crypto:${pair}`, kind: 'crypto', pair, symbol, name, label: `${symbol}/USD`,
}));
export const DEFAULT_MARKETS = ['fx:EURPLN','fx:USDPLN','fx:EURUSD', ...CRYPTO_MARKETS.map(m => m.id)];

export function marketCatalog() { return [...FIAT_PAIRS, ...CRYPTO_MARKETS]; }
export function searchMarkets(query = '') {
  const q = String(query).trim().toLowerCase();
  return marketCatalog().filter(m => !q || `${m.label} ${m.name || ''}`.toLowerCase().includes(q));
}
export function periodStart(period, now = Date.now()) {
  const d = new Date(now);
  if (period === '1D') d.setHours(d.getHours() - 24);
  else if (period === '7D') d.setDate(d.getDate() - 7);
  else if (period === '1M') d.setMonth(d.getMonth() - 1);
  else if (period === '3M') d.setMonth(d.getMonth() - 3);
  else if (period === 'YTD') return new Date(d.getFullYear(), 0, 1);
  else if (period === '1Y') d.setFullYear(d.getFullYear() - 1);
  else return new Date(0);
  return d;
}
export function marketNumber(value) {
  return Number(value).toLocaleString('uk-UA', {maximumFractionDigits: Number(value) < 10 ? 5 : 2});
}

/** Uses the same previous-boundary point and ticker fallback as the source.
 * Fallback timestamps are synthetic daily positions, not actual traded dates.
 */
export function marketDetailSummary(market, period = '1M', now = Date.now()) {
  if (!market) return null;
  const start = periodStart(period, now), all = market.detailHistory || [];
  const firstInPeriod = all.findIndex(point => new Date(point.timestamp) >= start);
  const series = firstInPeriod < 0 ? [] : all.slice(Math.max(0, firstInPeriod - 1));
  const fallback = (market.history || []).map((value, i, values) => ({
    timestamp: new Date(now - (values.length - 1 - i) * 86400000).toISOString(), value: Number(value),
  }));
  const points = (series.length ? series : fallback).filter(point => Number.isFinite(Number(point.value)));
  const values = points.map(point => Number(point.value));
  const first = values[0], last = values.at(-1) ?? Number(market.value);
  const change = first ? (last - first) / first * 100 : Number(market.change || 0);
  return {
    id: market.id, kind: market.kind, label: market.label, period, points, values,
    historyOrigin: series.length ? 'detail-history' : 'ticker-fallback',
    value: last, open: first, change,
    minimum: values.length ? Math.min(...values) : null,
    maximum: values.length ? Math.max(...values) : null,
    updated: market.updated || null, hasHistory: values.length > 1,
    source: market.kind === 'crypto' ? 'Kraken' : 'Frankfurter',
  };
}

export function createMarketService({
  fetchImpl = globalThis.fetch, storage = globalThis.localStorage,
  sessionStorage = globalThis.sessionStorage, now = () => Date.now(),
  selection = DEFAULT_MARKETS, onSelectionChange = () => {},
  onDataChange = () => {}, onError = () => {},
} = {}) {
  let data = {}, selected = [...new Set(selection)].slice(0, 20);
  let selectedMarketId = sessionStorage?.getItem(SELECTED_MARKET_KEY) || '', period = '1M';
  const emit = () => onDataChange(data);
  const saveCache = () => storage?.setItem(MARKET_CACHE_KEY, JSON.stringify({updated: now(), data}));
  async function json(url, checkStatus = true) {
    if (typeof fetchImpl !== 'function') throw new Error('Market fetch unavailable');
    const response = await fetchImpl(url);
    if (checkStatus && !response.ok) throw new Error(`Market HTTP ${response.status}`);
    return response.json();
  }
  function setSelection(ids) {
    selected = [...new Set(ids)].slice(0, 20);
    onSelectionChange([...selected]);
    return [...selected];
  }
  function toggleSelection(id, enabled) {
    const set = new Set(selected);
    enabled ? set.add(id) : set.delete(id);
    return setSelection([...set]);
  }
  async function loadMarketData() {
    try {
      const cached = JSON.parse(storage?.getItem(MARKET_CACHE_KEY) || '{}');
      if (cached.data) data = cached.data;
    } catch { /* A damaged cache does not prevent public-data refresh. */ }
    emit();
    const wanted = marketCatalog().filter(m => selected.includes(m.id));
    await Promise.all(wanted.map(async market => {
      try {
        if (market.kind === 'fx') {
          const from = new Date(now() - 14 * 86400000).toISOString().slice(0, 10);
          const [latest, history] = await Promise.all([
            json(`https://api.frankfurter.dev/v2/rate/${market.base.toLowerCase()}/${market.quote.toLowerCase()}`),
            json(`https://api.frankfurter.dev/v2/rates?from=${from}&base=${market.base.toLowerCase()}&quotes=${market.quote.toLowerCase()}`, false),
          ]);
          const values = history.map(row => Number(row.rate)).filter(Number.isFinite);
          const first = values[0] || Number(latest.rate), value = Number(latest.rate);
          // The source overwrites this entry, including any old detailHistory.
          data[market.id] = {...market, value, history: values, change: first ? (value - first) / first * 100 : 0, updated: latest.date};
        } else {
          const response = await json(`https://api.kraken.com/0/public/Ticker?pair=${market.pair}`);
          const row = Object.values(response.result || {})[0];
          if (!row) throw new Error('Kraken ticker unavailable');
          const value = Number(row.c[0]), open = Number(row.o);
          data[market.id] = {...market, value, history: [open, value], change: open ? (value - open) / open * 100 : 0, updated: new Date(now()).toISOString()};
        }
      } catch (error) { onError({id: market.id, operation: 'ticker', error}); }
    }));
    saveCache(); emit();
    return data;
  }
  async function loadMarketDetail(id) {
    const market = marketCatalog().find(m => m.id === id), current = data[id] || market;
    if (!market) return null;
    emit();
    if (current?.detailHistory?.length) return current;
    try {
      let history;
      if (market.kind === 'fx') {
        const from = new Date(now()); from.setFullYear(from.getFullYear() - 5);
        const rows = await json(`https://api.frankfurter.dev/v2/rates?from=${from.toISOString().slice(0, 10)}&base=${market.base.toLowerCase()}&quotes=${market.quote.toLowerCase()}`);
        history = rows.map(row => ({timestamp: row.date, value: Number(row.rate)})).filter(point => Number.isFinite(point.value));
      } else {
        const since = Math.floor((now() - 365 * 86400000) / 1000);
        const response = await json(`https://api.kraken.com/0/public/OHLC?pair=${market.pair}&interval=1440&since=${since}`);
        const rows = Object.entries(response.result || {}).find(([, value]) => Array.isArray(value))?.[1] || [];
        history = rows.map(row => ({timestamp: new Date(Number(row[0]) * 1000).toISOString(), value: Number(row[4])})).filter(point => Number.isFinite(point.value));
      }
      data[id] = {...(data[id] || market), detailHistory: history};
      saveCache(); emit();
    } catch (error) { onError({id, operation: 'detail', error}); }
    return data[id] || market;
  }
  async function openMarketDetail(id) {
    selectedMarketId = id;
    sessionStorage?.setItem(SELECTED_MARKET_KEY, id);
    period = '1M';
    return loadMarketDetail(id);
  }
  function setPeriod(next) {
    if (!MARKET_PERIODS.includes(next)) throw new RangeError('Unsupported market period');
    period = next;
    return marketDetailSummary(data[selectedMarketId] || marketCatalog().find(m => m.id === selectedMarketId), period, now());
  }
  return {
    setSelection, toggleSelection, loadMarketData, loadMarketDetail, openMarketDetail, setPeriod,
    get data() { return data; }, get selection() { return [...selected]; },
    get selectedMarketId() { return selectedMarketId; }, get period() { return period; },
    detailSummary(id = selectedMarketId, requestedPeriod = period) {
      return marketDetailSummary(data[id] || marketCatalog().find(m => m.id === id), requestedPeriod, now());
    },
  };
}
