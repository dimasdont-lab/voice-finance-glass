/** Headless transport adapter for the routes actually present in worker/src/index.js.
 * Added GET/sync wrappers expose existing backend routes; the original frontend
 * only submitted Monobank tokens and did not hydrate local finance state.
 * No credentials are persisted and no missing backend capability is simulated.
 */
export const BANKING_PROVIDERS = ['MONOBANK', 'PKO', 'REVOLUT', 'ERSTE'];
export class BankingApiError extends Error {
  constructor(code, {status = 0, details = null} = {}) {
    super(code); this.name = 'BankingApiError'; this.code = code;
    this.status = status; this.details = details;
  }
}
export function normalizeApiBase(value = '') { return String(value).trim().replace(/\/+$/, ''); }

/** Adapt D1 integer flags / SQL names to the app's camelCase account contract.
 * This is response normalization, not an FX conversion or finance-state merge.
 */
export function normalizeBankAccount(row) {
  const value = (camel, sql, fallback) => row[camel] ?? row[sql] ?? fallback;
  const active = value('isActive', 'is_active', false);
  const available = value('availableBalance', 'available_balance', null);
  return {
    ...row, id: String(row.id), provider: String(row.provider || ''),
    bankName: value('bankName', 'bank_name', ''),
    displayName: value('displayName', 'display_name', ''),
    accountType: value('accountType', 'account_type', null),
    currency: String(row.currency || 'PLN'),
    currentBalance: Number(value('currentBalance', 'current_balance', 0)),
    availableBalance: available === null ? null : Number(available),
    lastSyncedAt: value('lastSyncedAt', 'last_synced_at', null),
    isActive: active === true || active === 1 || active === '1',
    source: row.source || 'bank',
  };
}

export function createBankingClient({baseUrl = '', fetchImpl = globalThis.fetch} = {}) {
  const base = normalizeApiBase(baseUrl);
  async function request(path, {method = 'GET', body} = {}) {
    if (!base) throw new BankingApiError('backend_not_configured');
    if (typeof fetchImpl !== 'function') throw new BankingApiError('transport_unavailable');
    const options = {method, credentials: 'include'};
    if (body !== undefined) {
      options.headers = {'Content-Type': 'application/json'};
      options.body = JSON.stringify(body);
    }
    const response = await fetchImpl(`${base}${path}`, options);
    let payload;
    try { payload = await response.json(); }
    catch { throw new BankingApiError('invalid_backend_response', {status: response.status}); }
    if (!response.ok) throw new BankingApiError(payload.error || payload.status || 'request_failed', {status: response.status, details: payload});
    return payload;
  }
  async function listAccounts() {
    const payload = await request('/api/accounts');
    return (payload.accounts || []).map(normalizeBankAccount);
  }
  return {
    baseUrl: base,
    health: () => request('/api/health'),
    listAccounts,
    // Refresh here means reread the DB snapshot. It does not contact a bank.
    refreshAccounts: listAccounts,
    async connectMonobank(token) {
      const value = String(token || '').trim();
      if (!value) throw new BankingApiError('token_required');
      return request('/api/banks/monobank/connect', {method: 'POST', body: {token: value}});
    },
    async connectProvider(provider) {
      if (!['PKO', 'REVOLUT', 'ERSTE'].includes(provider)) throw new BankingApiError('unsupported_provider');
      // The supplied worker answers 503 or 501; no authorization URL is invented.
      return request('/api/banks/connect', {method: 'POST', body: {provider}});
    },
    requestSync: () => request('/api/sync', {method: 'POST'}),
    async disconnect() {
      throw new BankingApiError('disconnect_not_implemented', {details: {implemented: false}});
    },
  };
}
