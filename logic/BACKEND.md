# Ринкові дані та банківський backend

Джерело: `voice_finance_codex_handoff`, main `193dedf`. Тут немає HTML, CSS, навігації, графіків або dock. `backend/worker.js` і `backend/schema.sql` скопійовані без змін; клієнти `.mjs` — безінтерфейсні адаптери фактичної логіки. Реальні ключі, токени, deployment-конфігурація та локальні credentials не включені.

## Market service

`createMarketService()` приймає `fetchImpl`, `storage`, `sessionStorage`, `now`, `selection` і callbacks `onSelectionChange`, `onDataChange`, `onError`. Вибір інструментів належить фінансовому стану виклику; callback потрібно під'єднати до його збереження. Сервіс не змінює рахунки, транзакції чи курси конвертації балансів.

- Каталог точно з джерела: перші **100** впорядкованих fiat-пар із 26 валют, не всі можливі пари, та 10 Kraken-пар. Default: EUR/PLN, USD/PLN, EUR/USD і всі 10 crypto. Вибір дедуплікується та обмежується першими 20 ID; новий 21-й ID не замінює старий.
- `loadMarketData()` спочатку читає `voice-finance-market-cache`, повідомляє cached data, потім паралельно оновлює вибрані записи. Frankfurter: latest `/v2/rate/base/quote` та історія від `now − 14 днів`; Kraken: Ticker, close `c[0]` і open `o`. Це котирування, не особисті банківські дані.
- Cache `{updated, data}` не має TTL. Помилка конкретного інструмента залишає попередній запис і викликає `onError`; пошкоджений JSON cache ігнорується. Успішне ticker-оновлення **перезаписує запис та видаляє його попередню `detailHistory`** — збережена особливість оригіналу, не нове правило.
- `loadMarketDetail(id)` повторно не завантажує непорожню `detailHistory`. Frankfurter запитує від календарної дати п'ять років тому; Kraken OHLC — daily `interval=1440`, `since=now − 365 днів`. `ALL` означає всю отриману історію, не гарантовану історію за весь час. Порожня історія не кешується як завершена: наступний виклик знову запитає API.
- `openMarketDetail(id)` зберігає ID у sessionStorage `voice-finance-selected-market`, скидає період на `1M` і завантажує detail. `setPeriod()` підтримує `1D`, `7D`, `1M`, `3M`, `1Y`, `ALL` і не робить запитів.
- `marketDetailSummary()` включає одну точку перед початком періоду, якщо вона є. Якщо detail для періоду немає, бере ticker history та надає їй **синтетичні щоденні timestamps**; `historyOrigin: 'ticker-fallback'` дозволяє не подавати ці дати як фактичні дати торгів. Зміна рахується між першою та останньою точками, не обов'язково за точний календарний період.
- HTTP status короткої FX history не перевіряється, як у джерелі; latest/detail status перевіряється. Kraken використовує перший result entry. Клієнт не додає retry, rate limiter, валідацію всіх чисел або гарантії доступності сторонніх API.

```js
import {createMarketService} from './market-service.mjs';
const markets = createMarketService({
  selection: finance.getState().marketSelection,
  onSelectionChange(ids) { finance.setMarketSelection(ids); },
  onError({id, operation, error}) { reportDataError(id, operation, error); },
});
await markets.loadMarketData();
await markets.openMarketDetail('fx:EURPLN');
const summary = markets.setPeriod('1Y');
```

## Banking client: що означають операції

`createBankingClient({baseUrl, fetchImpl})` використовує `credentials: 'include'`. Порожній `baseUrl` дає `backend_not_configured`, без HTTP. `BankingApiError` містить `code`, `status`, `details`; 501/503 не перетворюються на успішне підключення. Токен не зберігається у storage. Виклик має очистити власне поле вводу після завершення, як робив оригінальний UI.

| Метод клієнта | Фактичний результат |
| --- | --- |
| `health()` | GET `/api/health`, перевіряє відповідь worker; не перевіряє банк або готовність авторизації. |
| `listAccounts()` | GET `/api/accounts`, активні DB snapshots поточного користувача. Нормалізація camelCase/SQL names, чисел, nullable balances, integer active flag. |
| `refreshAccounts()` | Те саме GET, **тільки перечитування DB**, без звернення до банку. |
| `connectMonobank(token)` | Trim token; POST `/api/banks/monobank/connect`. Сервер перевіряє формат і Monobank client-info, шифрує token та імпортує snapshots рахунків. |
| `connectProvider('PKO' \| 'REVOLUT' \| 'ERSTE')` | POST `/api/banks/connect`: 503 без конфігурації, 501 scaffold навіть із конфігурацією. Підключення не реалізоване. |
| `requestSync()` | POST `/api/sync`: відповідь 202 `sync_queued`, **але нічого не ставить у чергу та не оновлює**. |
| `disconnect()` | Локальна помилка `disconnect_not_implemented`; мережевого запиту немає, server route відсутній. |

GET/sync wrappers та normalization — явно виділений адаптер існуючих backend routes. Оригінальний frontend лише надсилав Monobank token: не завантажував backend accounts у локальний фінансовий стан. `listAccounts()` також не робить merge/FX conversion. Політика імпорту та співіснування manual/bank accounts залишається окремим невиконаним integration-рішенням.

## Незмінений worker: реалізоване та відсутнє

Worker очікує binding `DB` зі схемою, session cookie `vf_session` та exact frontend origin (`FRONTEND_ORIGIN`; у коді є старий default). Origin перевіряється навіть для GET, тому server-to-server GET без Origin отримує 403. `/api/health` не потребує session, інші routes потребують майбутню `expires_at` у `sessions` за SHA-256 hash cookie.

Monobank: серверний запит тільки до `personal/client-info`, AES-GCM із 32-byte base64 `MONOBANK_TOKEN_ENCRYPTION_KEY`, випадковий 12-byte IV, ciphertext/IV у DB. Баланс з minor units ділиться на 100; current та available обидва дорівнюють цьому balance. Підтримані currency codes: UAH/PLN/EUR/USD/GBP; невідомий code стає UAH, як у джерелі. External account reference хешується. Повторне connect створює нові випадкові account IDs — дедуплікації немає.

PKO/REVOLUT/ERSTE: назви bindings `ENABLE_BANKING_APPLICATION_ID`, `ENABLE_BANKING_PRIVATE_KEY` лише вмикають створення хешованого authorization state з терміном 10 хвилин. Немає OAuth redirect URL, provider request, callback, завершення authorization, account import або sync для цих банків. Схема не містить таблиць банківських транзакцій чи sync jobs.

**Не реалізоване:** login/session issuance, logout/revocation, cookie issuance/flags, statement import, actual refresh, scheduled jobs, token decrypt/rotation, disconnect, reconnect reconciliation, provider callbacks. Дозволений CORS метод DELETE не означає наявність DELETE route.

**До production потрібна окрема робота, це не частина реалізованого handoff:** належна session/cookie security, CSRF-рішення (header `X-CSRF-Token` дозволений, але не перевіряється), secret provisioning/rotation без browser storage, upstream/DB error handling, provider rate limits/retry та валідація API payloads, account reconciliation та чесні sync/disconnect стани. У copied worker session lookup поза `try`; async route helpers повертаються без `await`, тому їх rejection може обійти наявний `catch`. Поточний worker не слід представляти як production-ready banking backend.

Перевірка тут використовує лише mock fetch/DB та синтетичний AES test key; немає реальних банківських запитів або credentials. `node --test tests/services.test.mjs` запускає тести без dependencies. Це не deployment, integration test із живим банком або аудит безпеки.
