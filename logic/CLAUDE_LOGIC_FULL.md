# Voice Finance — вся логіка для Claude в одному файлі

Це самодостатня передача runtime-логіки основного Voice Finance, без візуалу й старого дока.
Кожний розділ нижче відповідає окремому файлу. Для запуску розклади код по цих іменах зі збереженням imports.
ZIP додатково містить виконувані тести; тут їхній результат описаний у VERIFICATION.md.

Порядок: інструкція → контракти/дані → інтеграція → runtime-модулі → backend.


---

## ФАЙЛ: START_HERE_CLAUDE.md

# Готовий запит для Claude

Я передаю тобі ZIP з логікою мого основного Voice Finance. Зроби мій окремо погоджений новий візуал поверх цієї логіки. Старий док і старий дизайн НЕ переносити й НЕ відтворювати.

Спочатку прочитай README.md, INTERACTIONS.md і DATA_MODEL.md, потім integration-example.mjs та тести. Використовуй модулі як бізнес-логіку; не переписуй розрахунки довільно. Якщо твій інструмент не підтримує декілька файлів, об’єднай модулі зі збереженням їхніх контрактів і поведінки.

Обов’язкові вимоги:

1. Зберегти операції, борги, оплату боргів з пов’язаними транзакціями, рахунки, категорії, людей, пошук, періоди графіків, курси, детальні сторінки та експорт. Валідація і підтвердження перед збереженням мають залишитися.
2. Зробити ОДНУ сторінку «Аналітика»: спочатку блоки цілей (ліміт витрат, прогрес, накопичення), потім аналітика. В коді це `insights`; `goals` — лише alias. Не створювати другу окрему сторінку цілей.
3. Мої нові кнопки «Аналітика», «Борги», «Ввід», «Дім», «Додатково» підключити до BUTTON_ACTIONS / application.activateButton. «Ввід» відкриває ввід, «Додатково» — панель над поточною сторінкою. Не переносити анімації, геометрію, compact-state або індикатор старого дока.
4. Працювати на iPhone Safari і як PWA. Ручний ввід не залежить від голосу. Не блокувати вертикальний скрол, коли жест починається на графіку; горизонтальний жест перевіряє точку графіка. Пара тікера відкривається одним тапом, не після свайпа.
5. Усі змінні дані зберігати через finance-core. Не мутувати getState() вручну; використовувати setters / save / delete. Не автозберігати результат парсера, голосу чи чека.
6. Не підміняти реальні дані демо-даними і не додавати платних runtime API. Не називати заготовки банків, OCR або синхронізації готовими функціями. Відомі обмеження описані явно.
7. Не змінювати оригінальний репозиторій Voice Finance. Нову реалізацію робити окремо. Відомі баги вихідної логіки не «виправляти» мовчки: запропонувати окремо й погодити зі мною.

Приймання: тести пакета проходять; нові кнопки ведуть на правильні сторінки; цілі перед аналітикою; операції й борги можна створити/відредагувати/видалити; оплата боргу враховується один раз і скасовується коректно; category-delete зберігає операції; manual account працює без банку; всі back/cancel-переходи працюють; дані переживають reload; немає залежностей від старого візуалу/дока. Після цього перевірити весь новий UI на iPhone, а не лише запуск сторінки.

---

## ФАЙЛ: README.md

# Voice Finance — пакет логіки для Claude

Почни з **START_HERE_CLAUDE.md**. Це функціональна основа для твого нового інтерфейсу, а не копія оформлення застосунку. Для передачі одним файлом є **CLAUDE_LOGIC_FULL.md** (інструкція + усі runtime-модулі); ZIP містить також окремі файли й тести.

Джерело: **основний Voice Finance**, `dimasdont-lab/voice-finance-free`, коміт `193dedfba571707ea25727b52bda95baa7cad9bc`. Не Liquid Studio, не Liquid Glass Demo і не WebGL Glass Bar. Основний проєкт не змінено.

## Що вже підготовлено

- Дані, локальне збереження, міграція, розрахунки, операції, рахунки, борги й оплати, люди, категорії, пошук, експорт.
- Парсер змішаного UA/PL/EN вводу, підтвердження перед записом, ручне редагування, адаптер захоплення голосу і локальний Whisper worker.
- Курси валют/криптовалют, вибір пар, кеш, детальна історія, контракт банківського backend та його вихідні файли.
- Незалежні від UI переходи та сценарії відкриття/закриття панелей. Контракт нових кнопок наведений нижче.
- **«Цілі» + «Аналітика» об’єднані в `insights`: спочатку цілі, потім аналітика.** Старі адреси `#goals` і `#analytics` ведуть туди ж.

## Чого тут немає

Жодного HTML/CSS інтерфейсу, WebGL/скляного матеріалу, SVG-іконок інтерфейсу, розмірів, кольорів, старих анімацій, дока, його злиття/розділення, компактного режиму чи ковзаючого індикатора. Claude робить новий візуал і нову панель керування самостійно. Поле `category.icon` лишене тільки як сумісні старі метадані даних; використовувати його в новому дизайні не обов’язково.

Особистих фінансових даних, токенів, `.env`, Git-історії й локальних налаштувань користувача в пакеті немає. Тестові записи — вигадані fixtures.

## Нові кнопки — лише семантика

| Кнопка | Виклик | Результат |
|---|---|---|
| Аналітика | `application.activateButton('analytics')` | `insights`: цілі → аналітика |
| Борги | `application.activateButton('debts')` | сторінка `debts` |
| Ввід | `application.activateButton('input')` | відкриває ввід і підтвердження; поточна сторінка не змінюється |
| Дім | `application.activateButton('home')` | сторінка `home` |
| Додатково | `application.activateButton('more')` | панель категорій, людей і налаштувань поверх поточної сторінки |

«Ввід» і «Додатково» — дії, не окремі фінансові сторінки. `application.back()` спочатку скасовує/закриває верхню панель, а потім виконує перехід назад за контрактом сторінки. Це не логіка старого дока. Для outside-tap використовуй `application.closePanel()`; low-level navigation не керує чернетками форми.

## Файли та порядок читання

1. `START_HERE_CLAUDE.md` — готовий запит для Claude та критерії приймання.
2. `INTERACTIONS.md` — усі сценарії й відомі обмеження фактичного основного проєкту.
3. `DATA_MODEL.md` — структура даних, правила балансу й зберігання.
4. `integration-example.mjs` — як зібрати логіку та прив’язати будь-який новий UI.
5. `application.mjs` — headless-контролер форм, вводу, списків і моделей сторінок.
6. `finance-core.mjs` — зміни даних, розрахунки та селектори.
7. `navigation.mjs` — маршрути, нові дії кнопок, об’єднання цілей/аналітики, стек панелей.
8. `input-parser.mjs`, `voice-capture.mjs`, `whisper-worker.js` — ввід/голос.
9. `market-service.mjs`, `banking-client.mjs`, `BACKEND.md`, `backend/` — зовнішні сервіси.
10. `interaction-helpers.mjs` — рішення жестів графіка/тікера і життєвий цикл preview чека, без малювання.
11. `tests/` — виконувана специфікація. `PROVENANCE.md` — джерела й відмінності адаптерів.

`index.mjs` — єдина точка імпорту. Модулі ES Modules: без React, npm-пакетів чи прив’язки до бібліотеки інтерфейсу.

## Перевірка

Потрібен сучасний Node.js з вбудованим test runner:

```sh
node --test tests/*.test.mjs
```

Перевірені headless-сценарії та mock API. Це **не** підтвердження роботи мікрофона на фізичному iPhone або live-підключення банків. Для нового UI потрібні окремі тести Safari/PWA, рухів пальцем, клавіатури й дозволів. Manifest, іконки й service worker нового UI треба створити/адаптувати під його власні assets; старий shell/cache зі старими UI-файлами не переноситься.

## Зберігання та перенесення даних

Передай `localStorage` у `createVoiceFinanceLogic` або `createFinance`. Ключ за замовчуванням — `voice-finance-v01`, сумісний з основним прототипом. Для експерименту використовуй інший `storageKey`, щоб не перезаписати оригінальні дані на тому самому origin.

На іншому домені дані iPhone самі не з’являться: browser storage ізольований за origin. У пакеті немає синхронізації акаунтів чи JSON-import UI. `initialState` в `createFinance` дозволяє передати вже отриманий об’єкт даних; це адаптер, не прихована синхронізація. Експорт основного застосунку — JSON його власного фінансового стану.

Модулі не запускають жодних запитів чи записів під час імпорту. Курси завантажуються явно через `markets.loadMarketData()`. Голос стартує лише після дії користувача; розпізнана фраза не зберігається без підтвердження. Не додавай платних runtime-сервісів.

---

## ФАЙЛ: INTERACTIONS.md

# Функціональні сценарії — без дизайну

Це специфікація **фактичного main 193dedf**, плюс погоджене об’єднання сторінок. Розташування, компоненти, шрифти, скло, розміри й анімації нового інтерфейсу визначаються окремо. Випливаючі вікна тут описані як сценарії/стани, не як старі візуальні форми.

## 1. Сторінки та переходи

| ID | Вміст/дані | Дія «Назад» |
|---|---|---|
| home | баланс, income/expense, активні рахунки, останні операції, пошук, фінансовий контроль | головна |
| insights | **goals → analytics**: ліміт/прогрес/накопичення, чистий результат, борги, витрати за категоріями, income за клієнтами | головна |
| debts | підсумки owed/receivable, пошук, сортування, 3 групи боргів | головна |
| balanceAnalysis | загальний balance-графік, current/change/min/max, income/expense за період, рахунки | home |
| accountDetail | вибраний рахунок, snapshot-графік, current/change/min/max, його операції | home |
| flowDetail | income або expense, сума, накопичувальний графік, операції за період | home |
| marketDetail | пара тікера, поточна ціна, історія/зміна/min/max/open/updated/source | home |
| people | профілі за напрямком receivable або owed | debts |
| person | всі борги конкретної людини в конкретному напрямку, unpaid/paid суми | people з тим самим direction |

Невідомий маршрут → home. `goals`/`analytics` → insights. Зміна сторінки закриває more, повідомляє host про resetScroll і новий маршрут. Host сам реалізує hash binding, скрол та активний стан своїх нових кнопок. Візуального navigation-компонента в пакеті немає.

Панелі зберігаються в `navigation.getState().overlays`. More не змінює сторінку. `application.back()` / `closePanel()` скасовують чернетку й закривають верхню панель, не стирають фінансові дані. Для UI використовуй ці application-aware методи; low-level navigation.back лише міняє стек/маршрут. Стек допускає settings → categories; категорії над more також можуть залишити more під собою. Перехід settings із more **спочатку закриває more**. Оригінальні розміри/transform/gesture-анімації панелей не передаються.

## 2. Головна і деталі

- Пошук операцій: `application.setSearch('home', text)`, `pageModel()`; без запиту — останні 5, із запитом — до 30. Нові зверху.
- Баланс/його графік/заголовок → `navigation.navigate('balanceAnalysis')`.
- Income/expense підсумок → `navigation.openFlow('income'|'expense')`.
- Рахунок → `navigation.openAccount(id)`; «Усі/Згорнути» → `application.toggleAccounts()` (спочатку 3 активні, потім всі).
- «Усі операції» → `application.openAllTransactions()`. Категорія → `openCategory(categoryId)` з усіма її операціями, не тільки PLN.
- Будь-який рядок операції → `editTransaction(id)`. Якщо він у transactionList, список закривається перед формою.
- В аналітиці картка боргів → debts; картка витрат → flowDetail/expense; картка доходів → flowDetail/income. Накопичення й прогрес — дані, не нові CRUD-цілі.
- Фінансовий контроль на home збережений у `pageModel().goals`; окремої сторінки goals немає.
- `setPeriod('balance'|'account'|'flow'|'market', period)` міняє лише відповідний графік. Після відкриття нової market-пари період повертається в 1M; інші фінансові періоди зберігаються в поточній сесії.

Income/expense detail list показує записи всіх валют, а total/графік — тільки PLN. Account-detail list містить усі linked-операції незалежно від вибраного періоду (період фільтрує тільки snapshots), як у джерелі.

## 3. Операції

`openTransaction(prefill?)` → updateForm → saveForm або cancelForm. Defaults: expense, PLN, без рахунку, перша категорія, порожні amount/client/note. Перемикання income/expense — updateForm({type}); поле client показувати для income, але при перемиканні його значення не губиться автоматично.

Форма містить amount, currency, accountId (порожній = без прив’язки), category, client, note. Категорії — всі наявні; рахунки — тільки активні плюс «без прив’язки». Валідація суми > 0; кома приймається як decimal separator. Текст client/note trim. При edit ID/date зберігаються; deleteFormRecord видаляє і скасовує ефект на рахунок. Нічого не зберігається при відкритті або скасуванні форми.

При зміні рахунку треба reverse старий effect + apply новий effect, не просто змінити accountId. Це вже робить finance-core, не дублювати в UI.

## 4. Борги й профілі

- `setSearch('debt', text)`, `setDebtSort('name-asc'|'name-desc')`.
- Групи: owed, receivable, urgent. У кожній unpaid і paid. Urgent може повторювати рядок з іншої групи — це фільтр, не дубль даних.
- `setDebtView(group)` зберігає розгорнуту групу; `focusDebtGroup(group)` повертає host запит scrollToGroup. Новий борг за замовчуванням receivable тільки якщо вибрана ця група, інакше owed.
- Підсумок «Я винен» → openPeople('owed'); «Мені винні» → openPeople('receivable'). More «усі клієнти/кредитори» має ті самі переходи.
- Рядок боргу у списку → `openDebtPerson(id)` → person, **не** відразу редактор. Рядок боргу в person → `editDebt(id)`.
- `openDebt(prefill?)` → updateForm → saveForm/cancelForm. Поля: direction, person, amount, currency, note, urgent, paid. person непорожній, amount > 0; original date при edit зберігається.
- paid=true створює фінансову оплату, paid=false скасовує її; delete боргу прибирає і оплату. Все через finance-core, не через окремі подвійні UI-записи.
- Профілі об’єднують відмінності регістру/діакритик і беруть display-name з найновішого запису. Sort — українська locale, sensitivity base.

## 5. Категорії, налаштування, очищення

`navigation.openOverlay('categories')`; список з `finance.getState().categories`. `finance.addCategory(name)`, `deleteCategory(id)`. Останню категорію видаляти не можна. При видаленні всі її операції перепризначаються першій категорії, а не видаляються.

More-data: `application.moreModel()` — top-6 категорій за PLN expenses, перші 4 профілі кожного напрямку. `navigation.openSettings()` закриває more і відкриває settings. Categories із settings відкриває наступний рівень.

`application.exportData()` повертає filename/MIME/JSON для завантаження host UI. `clearData()` спочатку повертає confirmationRequired; після згоди користувача `clearData({confirmed:true})`. Як у source, очищаються **тільки transactions і debts**, не рахунки/categories/snapshots/settings. Назва старої кнопки «всі дані» неточна; не роби factory reset замість цього без погодження.

Goal/language — persisted поля. `setGoal`/`setSpeechLanguage` додані як технічні setters для нового host, не як твердження, що вихідний UI мав редактор цілей/мови. JSON import UI у source відсутній.

## 6. Рахунки та банки

`navigation.openOverlay('accountAdd')`. Варіанти: cash, manual, MONOBANK, PKO, REVOLUT, ERSTE.

`openManualAccount('cash'|'manual')` закриває accountAdd й відкриває manualAccount; cash-prefill «Готівка». `addManualAccount({name,balance,currency,type})`: name.trim непорожній, balance finite, може бути 0 або мінус. Після запису створюється snapshot.

`openProvider('MONOBANK')` відкриває monobank; інші provider повертають supported=false як у вихідному UI. Host збирає token лише для POST `banking.connectMonobank(token)` через захищений backend. Після success/error/cancel очищає поле token; token НІКОЛИ не пишеться в finance-state, storage, logs або preview.

Не додавати приховані паролі/PIN/SMS. Порожній banking base URL — чесний стан «не налаштовано». Source після success не гідратує рахунки в локальні дані, bank statements/sync/reconciliation відсутні. Деталі — BACKEND.md. Не представляй ці заготовки як повну банківську інтеграцію.

## 7. Текст, голос і чек

Нова кнопка вводу → `openInput()`; фраза/Enter/send → `submitInput(text)`; повертається parsed result, відкривається confirmation. **Без auto-save.** Confirm → `confirmInput()`; Edit → `editParsedInput()` в ручну форму; Cancel → `closeInput()`. Порожній рядок ігнорується. Результат без суми не зберігається; debt без person іде на ручне уточнення. Повторний more-click закриває more, як у source.

UA/PL/EN правила, merchants, number words, fuzziness і debt-detection перенесені з actual source в input-parser. Парсер категорій читає поточні категорії. Merchant у quick/voice confirm додається перед note; Edit parsed відкриває вихідну note, як у source. Quick-confirm операція не linked до рахунку.

VoiceCapture — optional host adapter, не старий dock/mic-button. Native Safari SpeechRecognition може бути залежним від браузерного сервісу/мережі, **це не гарантовано локальний STT**. Альтернативний MediaRecorder → audio decode/resample 16k mono → Whisper worker працює локально після завантаження моделі. Мікрофон потребує secure context/HTTPS і явної дії користувача.

Розпізнавання/запис/перший download можуть дати помилку; typed/manual path залишається доступним. Recording limit 30s, Whisper transcription timeout 240s, Safari-start fallback 2.5s. Розпізнаний текст → submitInput, не save. На Cancel/Back/unmount викликати voice.cancel()/destroy(), зупинити tracks і не приймати stale-session results. Main мав визначені capture-функції, але не підключений видимий callsite native start: нова UI-прив’язка явна, не «вже працюючий» старий сценарій.

Чек: `openScan()`; camera/file selection → selectScanFile + createReceiptPreview для image object URL. PDF/інший файл — filename, без image preview. Continue → continueScan() → ручна операція з note «Чек: filename». **OCR/автоматичного виділення суми в main немає.** При заміні/закритті preview звільнити object URL.

## 8. Тікер і графіки

`searchMarkets(query)` → вибір до 20 пар через markets.toggleSelection/setSelection; selection зберігається у finance-state. `markets.loadMarketData()` показує cache, потім refresh. На новий фінансовий balance це не впливає.

Ручний ticker-drag та один tap розрізняються helper createTickerGesture: поріг руху 7px; короткий tap <380ms відкриває пару через `application.openMarket(id)`; після drag autoplay можна плавно поновити через 700ms. Зміни offset/авторух в новому UI не копіюють old rendering. Для клавіатури/assistive click відкривати пару напряму без gesture-фільтра. Не вішати друге відкриття на synthesized click після pointerup.

Графік: createChartGesture визначає горизонталь/вертикаль після 6px. Горизонталь → inspect nearest point, вертикаль → прибрати tooltip і **дозволити скрол сторінки**. Host використовує touch-action: pan-y, не ставить preventDefault на весь chart з pointerdown. Pointercancel прибирає inspect; desktop pointerup/leave прибирають tooltip; touch pointerup може лишити точку. closestChartPoint приймає нормалізований X самого plot без зовнішніх відступів. Малювання/SVG/кольори/tip-позиції — повністю нові.

## 9. Відомі межі вихідної реалізації

Це передача, не мовчазний перепис доменної логіки. Перед окремими виправленнями погодити:

1. PLN-only агрегати; інші валюти не конвертуються. Linked tx/account currency mismatch не перевіряється.
2. «Місячний» goal використовує all-time expense, savings — balance з рахунками.
3. Після linked tx змінюється currentBalance, але availableBalance залишається старим.
4. Snapshot total має дві різні семантики; історія загального balance реконструйована від tx, не bank snapshots.
5. Clear зберігає account currentBalance і snapshots навіть якщо видалив linked tx.
6. Ручне редагування платіжної операції втрачає debtId. Не робити вигляд, що після цього ownership-link зберігся.
7. Курсова історія fallback має синтетичні дати; кеш без TTL; ticker refresh стирає cached detailHistory.
8. Banks/auth/sync лише частково реалізовані; OCR і JSON import UI не реалізовані.

Модульні тести — виконувана специфікація цих правил. Перенос дизайну не має автоматично змінити їх.

---

## ФАЙЛ: DATA_MODEL.md

# Дані та правила

## Фінансовий стан

Зберігається JSON під ключем `voice-finance-v01`. `getState()` повертає копію, `subscribe` сповіщає про зміну. `createFinance({storage, storageKey, initialState, clock, uid})` дозволяє замінити storage/час/ID для тестів чи нового host.

```js
{
  categories: [{id, name, icon}],
  transactions: [{id, type, amount, currency, category, client, note, date,
                  accountId?, debtId?}],
  debts: [{id, direction, person, amount, currency, note, urgent, paid, date}],
  accounts: [{id, provider, bankName, displayName, shortName?, accountType?,
              currency, currentBalance, availableBalance, isActive, source,
              lastSyncedAt?}],
  balanceSnapshots: [{id, timestamp, totalBalance, convertedTotalBalance,
                      baseCurrency, accountBalances, source}],
  goal: 8000,
  speechLang: 'uk-UA',
  marketSelection: ['fx:EURPLN', 'fx:USDPLN', 'fx:EURUSD', /* crypto IDs */]
}
```

`type`: `income` / `expense`. `direction`: `owed` (я винен) / `receivable` (мені винні). Дати — ISO-рядки; amount — додатне число. accountBalances — словник `{accountId: currentBalance}`. Баланс ручного рахунку може бути нульовим або від’ємним.

Міграція прибирає лише старі demo-рахунки (`source==='demo'` або ID з `-demo`) і demo-snapshots. Операції користувача не видаляються. Початкових рахунків, операцій і боргів немає. Категорії мають стабільні ID: groceries, transport, food, tech, home, subscriptions, business, travel, other. Нова категорія — custom-ID. Не міняй ID при зміні дизайну.

## Баланс: збережено фактичний алгоритм основного проєкту

```text
income  = сума всіх PLN income-операцій
expense = сума всіх PLN expense-операцій
balance = сума currentBalance активних PLN-рахунків
          + сума income мінус expense у PLN БЕЗ accountId
```

Пов’язана з рахунком операція вже змінює його currentBalance, тому вдруге в balance не додається. При редагуванні віднімається ефект старої операції від старого рахунку й додається новий до нового; при видаленні ефект скасовується. income/expense враховують і пов’язані, і непов’язані PLN-операції.

У записах можна мати інші валюти, але агрегати/цілі/загальні графіки/суми профілів **PLN-only**. FX-котирування з тікера не конвертують фінансові записи. Не називай aggregate мультивалютним без окремої реалізації.

## Оплата боргу

`saveDebt` створює/оновлює одну транзакцію з `debtId`, коли paid=true. receivable → income/business/client=person; owed → expense/other. Повторне збереження не дублює оплату, її id/date зберігаються. paid=false прибирає пов’язану оплату. Видалення боргу прибирає і його оплату. Видалення пов’язаної транзакції переводить борг у неоплачений.

Основний прототип при ручному редагуванні платіжної транзакції втрачає `debtId` (форма заново складає запис). Це відома проблема джерела, відтворена в пакеті й покрита тестом; не обіцяй збереження цього зв’язку після такого редагування. Не приховуй проблему й не змінюй схему без погодження.

## Графіки

Фінансові періоди: `1D`, `7D`, `1M`, `3M`, `YTD`, `1Y`, `ALL`; 1D — останні 24 години, не опівніч календарного дня. Після зміни періоду дані перераховуються, не стираються.

`financialSeries('balance', period)` відновлює старт від поточного балансу, віднімає всі PLN-ефекти й накопичує операції по часу; закінчує поточним балансом. Income/expense — накопичувальні суми за вибраний період, починаючи з нуля. Працюють без банків і без рахунків.

Загальний balance-графік не є точним історичним bank-ledger: bank snapshots у ньому не використовуються. Для окремого рахунку `accountSnapshots` читає тільки snapshot.accountBalances цього рахунку; історія зберігає порядок snapshot-записів. Менше двох точок — недостатньо історії.

Snapshots мають історичну неузгодженість: snapshot після ручного додавання рахунку включає unlinked-операції в totalBalance; snapshot після linked-операції містить суму рахунків без них. Обидва залишені як у джерелі.

## Цілі, пошук і люди

`goals()` повертає limit, expense, percent, savings. percent обмежений зверху 100. Вихідний напис «місячний ліміт» використовує **витрати за весь час**, не обнуляє їх щомісяця. savings — поточний balance.

Пошук використовує foldText: регістр/діакритики UA/PL/EN нормалізуються. Операції шукаються за client/note/category name/amount/currency. Борги — person/note/amount/currency. Профілі людей групуються за нормалізованим ім’ям та direction; однойменні receivable/owed — різні профілі. У підсумках профілів тільки PLN, окремі записи зберігають власну валюту.

## Окреме тимчасове зберігання

SessionStorage: voice-finance-people-direction, voice-finance-selected-person, voice-finance-selected-person-direction, voice-finance-selected-market. Вибрані рахунок/тип потоку й періоди — стан поточної сесії контролера.

Кеш курсів: `voice-finance-market-cache`, `{updated, data}`; не частина експорту фінансів, TTL у прототипі відсутній. Банківські токени не зберігаються в browser storage. Backend D1-схема й вимоги безпеки — BACKEND.md.

---

## ФАЙЛ: BACKEND.md

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

---

## ФАЙЛ: PROVENANCE.md

# Походження пакета

Підготовлено 2026-10-03 з основного checkout `M:\VoiceFinance\voice_finance_codex_handoff`.

- Repository: https://github.com/dimasdont-lab/voice-finance-free
- HEAD: `193dedfba571707ea25727b52bda95baa7cad9bc` (Tighten home spacing and quick entry)
- `index.html` SHA-256: `82C167895CF6CA80EFAFA9CF03B0441CEC8F08FACDF524F8B87274A34957C18E`
- На початку підготовки main checkout був clean. Файли пакета створені окремо, не в main checkout.

## Що скопійоване, а що адаптоване

| Компонент | Джерело | Перетворення |
|---|---|---|
| finance-core | index.html: storage/models/totals/series/CRUD/goals/debts/people | DOM і render виклики замінені state snapshots/subscribe; injected clock/storage/uid, явні помилки валідації |
| input-parser | normalizeWords…parseVoice з index.html | категорії інжектуються, правила й словники ті самі; parseVoice alias parseInput |
| voice-capture | capture/recognition/Whisper helpers з index.html | optional host adapter, callback/status/session guard/cleanup без UI; не byte-copy |
| whisper-worker | whisper-worker.js | незмінений вміст, можливе нормалізування line endings |
| market-service | catalog/cache/loadMarketData/loadMarketDetail/summary | network/storage injection, callbacks; без ticker/SVG/layout |
| banking-client | frontend connect і фактичні worker routes | transport API, typed errors, account normalization; wrappers не створюють нові серверні можливості |
| backend/worker.js | worker/src/index.js | копія без змін, включно з відомими недоліками scaffold |
| backend/schema.sql | worker/schema.sql | копія без змін |
| navigation/application | семантика handlers index.html | нові headless-адаптери; goals → insights, Goals перед Analytics; жодної старої dock-реалізації |
| interaction-helpers | chart/ticker/file-selection handlers | рішення жестів і resource lifetime без DOM, анімацій чи форм |

Захисні відмінності адаптерів: immutable state snapshots замість доступу UI до mutable state; помилки для неіснуючого ID/некоректного типу/неfinite суми; category-add валідує порожній input; session/ресурси voice мають захист від stale async completions. Setters goal/language і backend GET/sync wrappers — явні технічні API, не нові факти про старий UI. Receipt helper допускає release на dispose (поліпшення lifetime; OCR не додається).

Основні фінансові алгоритми й обмеження залишені. Тести включають переносимі source-reference fixtures фінансів, parser fixtures та mock lifecycle/service flows. API/mock тести не гарантують живий банківський або iPhone runtime.

У пакеті немає index.html основного застосунку, старого CODEX_HANDOFF з його візуальними планами, CSS, SVG, dock geometry/physics, Liquid Studio або особистих даних. `FILE_MANIFEST.json` містить контрольні суми файлів пакета. ZIP і single-file Markdown — варіанти тієї самої передачі, не різні версії логіки.

---

## ФАЙЛ: VERIFICATION.md

# Перевірка перед передачою

Команда: `node --test tests/*.test.mjs`.

Результат 2026-10-03: **87 тестів пройшли, 0 помилок, 0 пропусків**. JavaScript-модулі пройшли syntax-check; імпорт єдиної точки входу й offline-ініціалізація перевірені тестами.

Набір перевіряє фінансовий engine, фактичні parser fixtures, voice lifecycle з mock API, market/backend transport з mock fetch/DB та application/navigation сценарії. Source-reference тести звіряють алгоритми totals і всіх фінансових period/series; окремо перевірено парсер проти основного source. Копії worker/schema збігаються з main за SHA-256.

Перевірені сценарії: нові кнопки й alias goals, Goals → Analytics, відкриття/назад/nested panels, ручні операції, зміна рахунку, paid/unpaid debt і видалення оплати, профілі людей, категорії, пошук, графіки без банків, 1D, manual/cash account, input-confirm/edit/cancel, voice cancellation і stale results, receipt manual path, export/clear, один ticker tap проти drag, vertical chart scroll проти horizontal inspect, кеш/деталі ринку, чесні unsupported banking стани.

Пакет не робить live-запитів у тестах. Фізичний iPhone, дозволи мікрофона, Safari/PWA UI, швидкість STT, живі API курсів і реальні банки не перевірені цими тестами. Візуального UI немає, отже його анімації/скло також не перевірялися.

До пакета не входять особисті дані користувача, secrets, .env, старі HTML/CSS/SVG/dock/render файли. Архів містить тільки явний список файлів передачі. Згенерований single-file Markdown перевіряється `node build-handoff.mjs --check`.

Стан основного проєкту перевіряється окремо read-only Git status + SHA-256 index.html; пакет не потребує редагування або запуску основного checkout.

---

## ФАЙЛ: index.mjs

~~~~javascript
export * from './finance-core.mjs';
export {parseInput,parseVoice,createInputParser} from './input-parser.mjs';
export * from './navigation.mjs';
export * from './application.mjs';
export * from './interaction-helpers.mjs';
export {createMarketService,marketCatalog,searchMarkets,marketDetailSummary,MARKET_PERIODS} from './market-service.mjs';
export * from './banking-client.mjs';
export * from './voice-capture.mjs';
~~~~

---

## ФАЙЛ: integration-example.mjs

~~~~javascript
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
~~~~

---

## ФАЙЛ: application.mjs

~~~~javascript
import {createFinance,PERIODS} from './finance-core.mjs';
import {createInputParser} from './input-parser.mjs';
import {createNavigation} from './navigation.mjs';
import {MARKET_PERIODS} from './market-service.mjs';

const clone = value => JSON.parse(JSON.stringify(value));

/** Headless interaction controller. Host UI chooses every visual/detail. */
export function createApplication({finance=createFinance(),navigation=createNavigation(),markets=null}={}) {
  const parser=createInputParser({getCategories:()=>finance.getState().categories});
  const listeners=new Set();
  const ui={homeQuery:'',debtQuery:'',debtSort:'name-asc',debtView:'owed',accountsExpanded:false,
    periods:{balance:'1M',account:'1M',flow:'1M',market:'1M'},form:null,inputText:'',parsedInput:null,scanFileName:''};
  const getState=()=>({finance:finance.getState(),navigation:navigation.getState(),interaction:clone(ui)});
  const emit=event=>{for(const listener of listeners)listener({event,state:getState()})};
  const unsubscribeFinance=finance.subscribe(()=>emit('finance:change'));
  const unsubscribeNavigation=navigation.subscribe(()=>emit('navigation:change'));
  function openTransaction(prefill={}) {
    ui.form={kind:'transaction',editingId:null,values:{type:'expense',amount:'',currency:'PLN',accountId:'',category:finance.getState().categories[0]?.id||'other',client:'',note:'',...prefill}};
    navigation.openOverlay('transaction');emit('form:open');return clone(ui.form);
  }
  function editTransaction(id) {
    const tx=finance.getState().transactions.find(item=>item.id===id);
    if (!tx) throw new RangeError('Transaction not found');
    navigation.closeOverlay('transactionList');
    openTransaction({type:tx.type,amount:tx.amount,currency:tx.currency,accountId:tx.accountId||'',category:tx.category,client:tx.client||'',note:tx.note||''});
    ui.form.editingId=id;emit('form:edit');return clone(ui.form);
  }
  function openDebt(prefill={}) {
    ui.form={kind:'debt',editingId:null,values:{direction:ui.debtView==='receivable'?'receivable':'owed',person:'',amount:'',currency:'PLN',note:'',urgent:false,paid:false,...prefill}};
    navigation.openOverlay('debt');emit('form:open');return clone(ui.form);
  }
  function editDebt(id) {
    const debt=finance.getState().debts.find(item=>item.id===id);
    if (!debt) throw new RangeError('Debt not found');
    openDebt(debt);ui.form.editingId=id;emit('form:edit');return clone(ui.form);
  }
  function updateForm(patch) {
    if (!ui.form) throw new Error('No open form');
    ui.form.values={...ui.form.values,...patch};emit('form:change');return clone(ui.form);
  }
  function saveForm() {
    if (!ui.form) throw new Error('No open form');
    const form=ui.form;
    if(!navigation.getState().overlays.some(panel=>panel.kind===form.kind))throw new Error('Form is closed');
    const result=form.kind==='debt'
      ?finance.saveDebt(form.values,{id:form.editingId||undefined})
      :finance.saveTransaction(form.values,{id:form.editingId||undefined});
    navigation.closeOverlay(form.kind);ui.form=null;emit('form:saved');return result;
  }
  function deleteFormRecord() {
    const form=ui.form;
    if (!form?.editingId) return false;
    const result=form.kind==='debt'?finance.deleteDebt(form.editingId):finance.deleteTransaction(form.editingId);
    navigation.closeOverlay(form.kind);ui.form=null;emit('form:deleted');return result;
  }
  function cancelForm() {
    if (ui.form) navigation.closeOverlay(ui.form.kind);
    ui.form=null;emit('form:cancel');
  }
  function openInput() {
    ui.inputText='';ui.parsedInput=null;navigation.openOverlay('input');emit('input:open');
  }
  function submitInput(text) {
    const value=String(text||'').trim();
    if (!value) return null;
    ui.inputText=value;ui.parsedInput=parser.parse(value);
    navigation.openOverlay('input');emit('input:confirmation');return clone(ui.parsedInput);
  }
  function closeInput() {
    navigation.closeOverlay('input');ui.parsedInput=null;ui.inputText='';emit('input:cancel');
  }
  function editParsedInput() {
    const parsed=ui.parsedInput;
    closeInput();
    return parsed?.kind==='debt'?openDebt(parsed):openTransaction(parsed||{});
  }
  function confirmInput() {
    if(!navigation.getState().overlays.some(panel=>panel.kind==='input'))throw new Error('Input is closed');
    const parsed=ui.parsedInput;
    if (!parsed?.amount) throw new RangeError('Enter or recognize a positive amount');
    if (parsed.kind==='debt'&&!parsed.person) return editParsedInput();
    const result=finance.saveParsedInput(parsed);
    closeInput();return result;
  }
  function openTransactionList(categoryId) {
    navigation.openOverlay('transactionList',categoryId?{categoryId}:{});
    return finance.transactions(categoryId?{category:categoryId}:{});
  }
  function setPeriod(target,period) {
    const supported=target==='market'?MARKET_PERIODS:PERIODS;
    if (!Object.hasOwn(ui.periods,target)||!supported.includes(period)) throw new RangeError('Invalid chart period');
    if(target==='market'&&markets)markets.setPeriod(period);
    ui.periods[target]=period;emit('period:change');return period;
  }
  async function openMarket(id) {
    ui.periods.market='1M';navigation.openMarket(id);
    const result=await markets?.openMarketDetail(id);
    emit('market:detail');return result||null;
  }
  function openProvider(provider) {
    if (provider!=='MONOBANK') return {supported:false,reason:'Backend provider connection is not configured'};
    navigation.closeOverlay('accountAdd');navigation.openOverlay('monobank');return {supported:true};
  }
  function openManualAccount(type='manual') {
    navigation.closeOverlay('accountAdd');navigation.openOverlay('manualAccount',{type,name:type==='cash'?'Готівка':''});
  }
  function addManualAccount(values) {
    const panel=navigation.getState().overlays.find(item=>item.kind==='manualAccount');
    const result=finance.addManualAccount({type:panel?.data.type||'manual',...values});navigation.closeOverlay('manualAccount');return result;
  }
  function closePanel(kind) {
    const target=kind||navigation.getState().overlays.at(-1)?.kind;
    if(target==='input')return closeInput();
    if(ui.form?.kind===target)return cancelForm();
    return navigation.closeOverlay(target);
  }
  function back() {
    if(navigation.getState().overlays.length)return closePanel();
    return navigation.back();
  }
  function setDebtView(value) {
    if(!['owed','receivable','urgent'].includes(value))throw new RangeError('Invalid debt group');
    ui.debtView=value;emit('debt:view');
  }
  function selectScanFile(file) {
    ui.scanFileName=file?.name||'';emit('scan:selected');return {name:ui.scanFileName,isImage:!!file?.type?.startsWith('image/')};
  }
  function continueScan() {
    navigation.closeOverlay('scan');
    return openTransaction({note:`Чек: ${ui.scanFileName||'чек'}`});
  }
  function pageModel() {
    const route=navigation.getState(),data=finance.getState(),accounts=finance.activeAccounts();
    const base={screen:route.screen,group:route.group,periods:clone(ui.periods)};
    if(route.screen==='home') {
      const balancePoints=finance.financialSeries('balance','1M'),first=balancePoints[0]?.value??finance.totals().balance,last=balancePoints.at(-1)?.value??first,change=last-first;
      return {...base,totals:finance.totals(),goals:finance.goals(),balancePoints,
        balanceMovement:{change,percent:first?change/Math.abs(first)*100:0,period:'1M'},
        transactions:finance.recentTransactions(ui.homeQuery),accounts:ui.accountsExpanded?accounts:accounts.slice(0,3),accountCount:accounts.length};
    }
    if(route.screen==='insights') return {...base,sections:[{id:'goals',data:finance.goals()},{id:'analytics',data:finance.insights()}]};
    if(route.screen==='debts') return {...base,totals:finance.debtTotals(),groups:finance.debtGroups({query:ui.debtQuery,sort:ui.debtSort}),openedGroup:ui.debtView};
    if(route.screen==='people') return {...base,direction:route.params.peopleDirection,people:finance.personProfiles(route.params.peopleDirection)};
    if(route.screen==='person') return {...base,...finance.personProfile(route.params.personDirection,route.params.person)};
    if(route.screen==='balanceAnalysis') return {...base,...finance.balanceAnalysis(ui.periods.balance),accounts};
    if(route.screen==='accountDetail') {
      const account=data.accounts.find(item=>item.id===route.params.accountId)||null;
      const points=finance.accountSnapshots(route.params.accountId,ui.periods.account),values=points.map(p=>p.value);
      return {...base,account,points,metrics:{current:account?.currentBalance??null,change:values.length>1?values.at(-1)-values[0]:null,min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null},transactions:finance.transactions({accountId:route.params.accountId})};
    }
    if(route.screen==='flowDetail') {
      const type=route.params.flowType,transactions=finance.transactions({type,period:ui.periods.flow});
      return {...base,type,total:transactions.filter(t=>t.currency==='PLN').reduce((sum,t)=>sum+t.amount,0),points:finance.financialSeries(type,ui.periods.flow),transactions};
    }
    if(route.screen==='marketDetail') return {...base,marketId:route.params.marketId,period:ui.periods.market,market:markets?.detailSummary(route.params.marketId,ui.periods.market)||null};
    return base;
  }
  function moreModel() {
    return {categories:finance.categorySummary(),clients:finance.personProfiles('receivable').slice(0,4),creditors:finance.personProfiles('owed').slice(0,4)};
  }
  return {
    finance,navigation,parser,markets,getState,pageModel,moreModel,back,closePanel,
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)},
    dispose(){unsubscribeFinance();unsubscribeNavigation();listeners.clear()},
    activateButton(id){return id==='input'?openInput():navigation.activateButton(id)},
    openTransaction,editTransaction,openDebt,editDebt,updateForm,saveForm,deleteFormRecord,cancelForm,
    openInput,submitInput,confirmInput,editParsedInput,closeInput,
    openTransactionList,openCategory:id=>openTransactionList(id),openAllTransactions:()=>openTransactionList(),
    openDebtPerson(id){const debt=finance.getState().debts.find(d=>d.id===id);if(debt)return navigation.openPerson(debt.direction,debt.person)},
    setSearch(target,value){if(target!=='home'&&target!=='debt')throw new RangeError('Invalid search');ui[target+'Query']=String(value);emit('search:change')},
    setDebtSort(value){if(!['name-asc','name-desc'].includes(value))throw new RangeError('Invalid debt sort');ui.debtSort=value;emit('debt:sort')},
    setDebtView,
    focusDebtGroup(value){navigation.navigate('debts');setDebtView(value);return {scrollToGroup:value}},
    toggleAccounts(){ui.accountsExpanded=!ui.accountsExpanded;emit('accounts:expand');return ui.accountsExpanded},
    setPeriod,openMarket,openProvider,openManualAccount,addManualAccount,
    openScan:()=>navigation.openOverlay('scan'),selectScanFile,continueScan,
    clearData({confirmed=false}={}){if(!confirmed)return {confirmationRequired:true,message:'Очистити всі операції та борги?'};finance.clearData();return {cleared:true}},
    exportData:()=>({fileName:'voice-finance-data.json',mimeType:'application/json',contents:finance.exportJSON()})
  };
}
~~~~

---

## ФАЙЛ: navigation.mjs

~~~~javascript
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
~~~~

---

## ФАЙЛ: finance-core.mjs

~~~~javascript
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
    speechLang:'uk-UA', accounts:[], balanceSnapshots:[], marketSelection:[...DEFAULT_MARKETS]
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
    marketSelection:input.marketSelection?.length ? [...input.marketSelection] : [...DEFAULT_MARKETS]
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
  const api = {
    get state() { return getState(); },getState,storageKey,
    subscribe(listener) { if (typeof listener !== 'function') throw new TypeError('Listener must be a function'); listeners.add(listener); return () => listeners.delete(listener); },
    saveTransaction,deleteTransaction,saveDebt,deleteDebt,saveParsedInput,addManualAccount,addCategory,deleteCategory,
    totals:() => calculateTotals(state),financialSeries:(kind,period) => calculateFinancialSeries(state,kind,period,now()),
    transactions,recentTransactions:(query = '') => transactions({query,limit:query?30:5}),
    categoryById:id => copy(categoryById(id)),categorySummary,debtTotals,debtGroups,personProfiles,personProfile,insights,goals,
    accountSnapshots,balanceAnalysis,activeAccounts:() => copy(state.accounts.filter(a => a.isActive)),
    exportJSON:() => JSON.stringify(state,null,2),clearData,
    setMarketSelection(ids) { state.marketSelection=[...new Set(ids)].slice(0,20); commit('markets:select',{ids:state.marketSelection}); return [...state.marketSelection]; },
    // Goal/language are persisted settings in main's schema; no new UI is supplied.
    setGoal(value) { state.goal=positiveAmount(value); commit('goal:set',{goal:state.goal}); },
    setSpeechLanguage(language) { state.speechLang=String(language || 'uk-UA'); commit('language:set',{language:state.speechLang}); }
  };
  return api;
}
~~~~

---

## ФАЙЛ: input-parser.mjs

~~~~javascript
/* Deterministic input logic extracted from Voice Finance index.html,
 * pinned main commit 193dedf. No UI, browser storage, or rendering dependency.
 * categories/resolveCategory replace the sole former state.categories link.
 */
function normalizeWords(s){
  return String(s||'')
    .toLowerCase()
    .replace(/[’`]/g,"'")
    .replace(/[–—]/g,'-')
    .replace(/[.,!?;:()[\]{}]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function foldText(s){
  return normalizeWords(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/ł/g,'l').replace(/ż|ź/g,'z').replace(/ś/g,'s').replace(/ć/g,'c').replace(/ń/g,'n')
    .replace(/ą/g,'a').replace(/ę/g,'e').replace(/ó/g,'o')
    .replace(/[^\p{L}0-9'\s-]/gu,' ')
    .replace(/\s+/g,' ').trim();
}
const NUMBER_WORDS={
  нуль:0,ноль:0,один:1,одна:1,два:2,дві:2,три:3,чотири:4,пять:5,"п'ять":5,шість:6,сім:7,вісім:8,девять:9,"дев'ять":9,
  десять:10,одинадцять:11,дванадцять:12,тринадцять:13,чотирнадцять:14,пятнадцять:15,"п'ятнадцять":15,шістнадцять:16,
  сімнадцять:17,вісімнадцять:18,девятнадцять:19,"дев'ятнадцять":19,двадцять:20,тридцять:30,сорок:40,пятдесят:50,
  "п'ятдесят":50,шістдесят:60,сімдесят:70,вісімдесят:80,девяносто:90,"дев'яносто":90,сто:100,двісті:200,триста:300,
  чотириста:400,пятсот:500,"п'ятсот":500,шістсот:600,сімсот:700,вісімсот:800,девятсот:900,"дев'ятсот":900,
  zero:0,jeden:1,jedna:1,dwa:2,dwie:2,trzy:3,cztery:4,piec:5,szesc:6,siedem:7,osiem:8,dziewiec:9,dziesiec:10,
  jedenascie:11,dwanascie:12,trzynascie:13,czternascie:14,pietnascie:15,szesnascie:16,siedemnascie:17,osiemnascie:18,
  dziewietnascie:19,dwadziescia:20,trzydziesci:30,czterdziesci:40,piecdziesiat:50,szescdziesiat:60,siedemdziesiat:70,
  osiemdziesiat:80,dziewiecdziesiat:90,sto:100,dwiescie:200,trzysta:300,czterysta:400,piecset:500,szescset:600,
  siedemset:700,osiemset:800,dziewiecset:900,
  one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,
  fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,
  eighty:80,ninety:90,hundred:100
};
function wordsToNumber(s){
  const t=foldText(s).split(/\s+/);let total=0,current=0,seen=false;
  for(const w of t){
    if(['тисяча','тисячі','тисяч','тысяча','tysiac','tysiace','tysiecy','thousand'].includes(w)){total+=(current||1)*1000;current=0;seen=true;continue;}
    if(w==='hundred'){current=(current||1)*100;seen=true;continue;}
    if(Object.prototype.hasOwnProperty.call(NUMBER_WORDS,w)){current+=NUMBER_WORDS[w];seen=true;}
  }
  return seen?total+current:null;
}
function detectAmount(text){
  const raw=String(text||'').replace(/[−–—]/g,'-').replace(/(\d)\s+(\d{3})(?!\d)/g,'$1$2');
  const m=raw.match(/(?:^|\s)[+-]?(\d+(?:[.,]\d{1,2})?)(?=\s|$|zł|zl|pln|eur|euro|usd|gbp|злот|євро|евро|дол|фунт)/i)||raw.match(/(?:^|\s)[+-]?(\d+(?:[.,]\d{1,2})?)(?=\s)/);
  if(m)return Math.abs(parseFloat(m[1].replace(',','.')));
  const loose=raw.match(/[+-]?\s*(\d+(?:[.,]\d{1,2})?)/);if(loose)return Math.abs(parseFloat(loose[1].replace(',','.')));
  return wordsToNumber(raw);
}
function detectCurrency(t){
  const x=foldText(t);
  if(x.includes('євро')||x.includes('евро')||/(^|\s)(eur|euro)(\s|$)/.test(x))return'EUR';
  if(x.includes('долар')||x.includes('доллар')||/(^|\s)(usd|dollar|dollars)(\s|$)/.test(x))return'USD';
  if(x.includes('фунт')||/(^|\s)(gbp|pound|pounds)(\s|$)/.test(x))return'GBP';return'PLN';
}
function detectType(t){
  const raw=String(t||'');
  if(/^\s*\+/.test(raw))return'income';
  if(/^\s*[-−–—]/.test(raw))return'expense';
  const x=foldText(t);
  const incomeWords=['плюс','прихід','приход','дохід','доход','отримав','отримала','заробив','заробила','przychod','dochod','wplyw','zarobilem','zarobilam','otrzymalem','otrzymalam','income','received','earned','plus'];
  if(incomeWords.some(w=>x.split(/\s+/).includes(w)))return'income';
  if(x.includes('заплатив мені')||x.includes('заплатила мені')||x.includes('оплатив мені')||x.includes('paid me'))return'income';
  return'expense';
}
const MERCHANTS=[
  {canonical:'Biedronka',aliases:['biedronka','bedronka','bjedronka','biedronko','бєдронка','бедронка','бідронка','бьедронка'],category:'groceries'},
  {canonical:'Żabka',aliases:['zabka','żabka','жабка'],category:'groceries'},
  {canonical:'Lidl',aliases:['lidl','лідл'],category:'groceries'},
  {canonical:'Auchan',aliases:['auchan','ашан'],category:'groceries'},
  {canonical:'Carrefour',aliases:['carrefour','карфур'],category:'groceries'},
  {canonical:'Uber',aliases:['uber','убер'],category:'transport'},
  {canonical:'Bolt',aliases:['bolt','болт'],category:'transport'},
  {canonical:'Booking',aliases:['booking','booking.com','букинг','букінг'],category:'travel'},
  {canonical:'Airbnb',aliases:['airbnb','air bnb','еирбнб','ейрбнб'],category:'travel'},
  {canonical:'Netflix',aliases:['netflix','нетфликс','нетфлікс'],category:'subscriptions'},
  {canonical:'Spotify',aliases:['spotify','спотифай','спотіфай'],category:'subscriptions'},
  {canonical:'Adobe',aliases:['adobe','адобі','адоби'],category:'subscriptions'},
  {canonical:'OpenAI',aliases:['openai','open ai','опенай','оупен ай'],category:'subscriptions'},
  {canonical:'Apple',aliases:['apple','епл','эпл'],category:'tech'},
  {canonical:'IKEA',aliases:['ikea','икеа','ікеа'],category:'home'},
  {canonical:'DaVinci Resolve',aliases:['davinci','da vinci','davinci resolve','давінчі','да винчи','да вінчі'],category:'business'}
];
function editDistance(a,b){
  a=foldText(a);b=foldText(b);const m=a.length,n=b.length,dp=Array(n+1).fill(0);for(let j=0;j<=n;j++)dp[j]=j;
  for(let i=1;i<=m;i++){let prev=dp[0];dp[0]=i;for(let j=1;j<=n;j++){const tmp=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=tmp;}}return dp[n];
}
function findMerchant(raw){
  const folded=foldText(raw);for(const m of MERCHANTS)for(const alias of m.aliases){const a=foldText(alias);if(folded.includes(a))return m;}
  const words=folded.split(/\s+/).filter(w=>w.length>=4);let best=null,bestScore=999;
  for(const m of MERCHANTS)for(const alias of m.aliases){const a=foldText(alias);if(a.includes(' '))continue;for(const w of words){const d=editDistance(w,a),mx=Math.max(w.length,a.length);if(mx>=6&&d<=Math.max(1,Math.floor(mx*.23))&&d<bestScore){best=m;bestScore=d;}}}return best;
}
function detectCategory(t, categories=[]){
  const merchant=findMerchant(t);if(merchant&&categories.some(c=>c.id===merchant.category))return merchant.category;
  const x=foldText(t);const rules=[
    ['groceries',/(продукт|харч|молок|хліб|хлеб|овоч|фрукт|мяс|риба|вода|напій|закуп|магазин|супермаркет|grocer|supermarket|sklep|spozyw|zakupy|jedzeni|warzyw|owoc|mleko|chleb)/],
    ['transport',/(uber|bolt|таксі|такси|taxi|транспорт|metro|метро|автобус|трамва|поїзд|поезд|квиток|білет|tramw|pociag|bilet|benzyn|бензин|дизел|палив|fuel|parking|парков|авто|машин|serwis.*auto)/],
    ['food',/(ресторан|кафе|кава|coffee|чай|pizza|піца|пицца|burger|бургер|food|їжа|обід|вечеря|снідан|доставка|sniad|obiad|kolac|restaur|kawiarn|lunch|dinner|breakfast|sushi|суші)/],
    ['tech',/(технік|електрон|гаджет|компют|ноутбук|лептоп|laptop|computer|телефон|смартфон|smartphone|камера|kamera|camera|lens|обєктив|monitor|монітор|клавіат|миша|мишк|mouse|навушник|наушник|headphone|headset|earbuds|airpods|słuchawk|sluchawk|колонк|speaker|зарядк|charger|кабел|cable|iphone|ipad|macbook|apple|samsung|xiaomi|телевізор|telewizor|tv|консол|playstation|xbox)/],
    ['subscriptions',/(підписк|subscription|abonament|щомісяч|monthly|netflix|spotify|adobe|openai|youtube premium|icloud|google one|patreon|canva|dropbox)/],
    ['home',/(дім|дом|квартир|ikea|мебл|ремонт|посуд|ламп|ліжк|кровать|стіл|стол|стілец|home|house|mieszk|mebl|remont|czynsz|оренд|rent|комунал|prad|газ|electric|прибиран|cleaning)/],
    ['travel',/(готел|hotel|hostel|flight|літак|самолет|авіа|booking|airbnb|подорож|travel|lotn|wakac|відпуст|urlop|валіз|багаж|visa|віза|тур|resort)/],
    ['business',/(бізнес|студі|робот|зарплат|гонорар|проєкт|проект|монтаж|з[йи]омк|фото|відео|shoot|editing|edit|montaz|nagran|client|клієнт|замовник|invoice|рахунок|фактур|davinci|реклам|marketing|офіс|office)/]
  ];
  for(const [id,re] of rules)if(re.test(x)&&categories.some(c=>c.id===id))return id;
  const custom=categories.find(c=>x.includes(foldText(c.name)));return custom?.id||(categories.some(c=>c.id==='other')?'other':categories[0]?.id);
}
function detectClient(raw,type){
  if(type!=='income')return'';const ps=[/(?:від|от|from|od)\s+([A-ZА-ЯІЇЄҐŁŚŻŹĆŃ][\p{L}\-']+)/u,/(?:клієнт|клиент|client)\s+([A-ZА-ЯІЇЄҐŁŚŻŹĆŃ]?[\p{L}\-']+)/iu,/^([A-ZА-ЯІЇЄҐŁŚŻŹĆŃ][\p{L}\-']+)\s+(?:заплатив|заплатила|paid|zapłacił|zaplacil)/u];
  for(const re of ps){const m=raw.match(re);if(m)return m[1];}return'';
}
function detectDebt(raw){
  const x=foldText(raw);let direction='';
  let clientMatch=raw.match(/(?:^|\s)(?:клієнт|клиент|client|klient)\s+([\p{L}'’\-]+)(?=\s|$)/iu);
  let owedMatch=raw.match(/(?:^|\s)(?:борг|долг|debt|dług|dlug)\s+(?!мені\b|мне\b|mnie\b)([\p{L}'’\-]+)(?=\s|$)/iu);
  if(clientMatch&&/(термінов|срочн|urgent)/.test(foldText(clientMatch[1])))clientMatch=null;if(owedMatch&&/(термінов|срочн|urgent)/.test(foldText(owedMatch[1])))owedMatch=null;
  if(clientMatch)direction='receivable';
  else if(owedMatch)direction='owed';
  else if(/(борг мені|мені вин(ен|на|ні)|вин(ен|на|ні) мені)/.test(x))direction='receivable';
  else if(/(я вин(ен|на)|мій борг|вин(ен|на) комусь)/.test(x))direction='owed';
  else if(/(?:^|\s)(клієнт|клиент|client|klient)(?:\s|$)/.test(x))direction='receivable';
  else if(/(?:^|\s)(борг|долг|debt|dług|dlug)(?:\s|$)/.test(x))direction='owed';
  if(!direction)return null;
  if(clientMatch)return{direction,person:clientMatch[1],urgent:/(термінов|срочн|urgent)/.test(x)};
  if(owedMatch)return{direction,person:owedMatch[1],urgent:/(термінов|срочн|urgent)/.test(x)};
  const patterns=direction==='owed'?[/(?:я\s+вин(?:ен|на)|мій\s+борг)\s+([\p{L}'-]+)/iu]:[/([\p{L}'-]+)\s+вин(?:ен|на|ні)\s+мені/iu,/мені\s+вин(?:ен|на|ні)\s+([\p{L}'-]+)/iu,/борг\s+мені\s+([\p{L}'-]+)/iu];
  let person='';for(const re of patterns){const m=raw.match(re);if(m){person=m[1];break;}}
  if(!person){const stop=new Set(['борг','долг','debt','dług','dlug','клієнт','клиент','client','klient','мені','мне','я','винен','винна','винні','терміново','срочно','urgent','pln','zł','zl','грн','uah','eur','usd','злотих','злоті','євро','доларів']);const words=raw.match(/[\p{L}'’\-]+/gu)||[],candidate=words.find(w=>!stop.has(foldText(w))&&/^[A-ZА-ЯІЇЄҐŁŚŻŹĆŃ]/u.test(w))||words.find(w=>!stop.has(foldText(w)));person=candidate||''}
  return{direction,person,urgent:/(термінов|срочн|urgent)/.test(x)};
}
function parseInput(text,{categories=[],resolveCategory}={}){
  const raw=String(text||'').trim(),debt=detectDebt(raw),merchant=findMerchant(raw),type=detectType(raw);
  if(debt)return{kind:'debt',...debt,amount:detectAmount(raw),currency:detectCurrency(raw),note:raw,transcript:raw};
  return{kind:'transaction',type,amount:detectAmount(raw),currency:detectCurrency(raw),category:resolveCategory?resolveCategory(raw):detectCategory(raw,categories),client:detectClient(raw,type),merchant:merchant?merchant.canonical:'',note:raw,transcript:raw};
}

export {normalizeWords,foldText,NUMBER_WORDS,wordsToNumber,detectAmount,detectCurrency,detectType,MERCHANTS,editDistance,findMerchant,detectCategory,detectClient,detectDebt,parseInput};
export const parseVoice=parseInput;
export function createInputParser({getCategories=()=>[],resolveCategory}={}){
  return {parse(text){return parseInput(text,{categories:getCategories(),resolveCategory})}};
}
~~~~

---

## ФАЙЛ: interaction-helpers.mjs

~~~~javascript
/** Gesture decisions and file lifetime only; no event bindings or rendering. */
export function closestChartPoint(points,normalizedX) {
  if (!points?.length) return null;
  const x=Math.max(0,Math.min(1,Number(normalizedX)||0));
  // normalizedX is relative to the PLOT, not including host chart padding.
  // Keep the first sample on an exact tie, matching original nearest-point logic.
  let index=0,distance=Infinity;
  points.forEach((_,i)=>{const current=Math.abs((points.length===1?0:i/(points.length-1))-x);if(current<distance){index=i;distance=current}});
  return {index,point:points[index]};
}

export function createChartGesture({threshold=6}={}) {
  let start=null,axis='';
  return {
    start({x,y,pointerType='touch'}){start={x,y,pointerType};axis='';return {inspect:true,blockPageScroll:false}},
    move({x,y,buttons=true}){
      if(!start||(!buttons&&start.pointerType!=='touch'))return {inspect:false,blockPageScroll:false};
      if(start.pointerType!=='touch')return {inspect:true,blockPageScroll:false};
      const dx=Math.abs(x-start.x),dy=Math.abs(y-start.y);
      if(!axis&&Math.max(dx,dy)>threshold)axis=dx>dy?'horizontal':'vertical';
      return {axis,inspect:axis==='horizontal',hide:axis==='vertical',blockPageScroll:axis==='horizontal'};
    },
    end({cancelled=false}={}){const hide=cancelled||start?.pointerType!=='touch';start=null;axis='';return {hide,blockPageScroll:false}}
  };
}

export function createTickerGesture({clock=()=>performance.now(),moveThreshold=7,tapLimitMs=380,resumeDelayMs=700}={}) {
  let press=null;
  return {
    start({x,marketId,offset=0}){press={x,marketId,offset,moved:false,time:clock()};return {pauseAutoplay:true}},
    move({x}){if(!press)return null;const dx=x-press.x;if(Math.abs(dx)>moveThreshold)press.moved=true;return {offset:press.offset-dx}},
    end({cancelled=false}={}){if(!press)return null;const marketId=!cancelled&&!press.moved&&clock()-press.time<tapLimitMs?press.marketId:null;press=null;return {openMarketId:marketId||null,resumeAt:clock()+resumeDelayMs}}
  };
}

export function createReceiptPreview({urlAPI=globalThis.URL}={}) {
  let objectURL='';
  const dispose=()=>{if(objectURL)urlAPI.revokeObjectURL(objectURL);objectURL=''};
  return {
    select(file){dispose();if(!file)return null;if(file.type?.startsWith('image/'))objectURL=urlAPI.createObjectURL(file);return {name:file.name,previewURL:objectURL||null,manualPrefill:{note:`Чек: ${file.name||'чек'}`}}},
    dispose
  };
}
~~~~

---

## ФАЙЛ: voice-capture.mjs

~~~~javascript
/* DOM-free voice adapter extracted from main Voice Finance (193dedf).
 * Safari SpeechRecognition is an optional engine; local MediaRecorder →
 * Whisper remains the fallback. No recognition result saves finance data.
 * Hardware support and actual iPhone accuracy must be tested by the host app.
 */
export const RECORDING_LIMIT_MS=30000;
export const TRANSCRIPTION_LIMIT_MS=240000;
export const SAFARI_START_LIMIT_MS=2500;

export function chooseMimeType(MediaRecorder=globalThis.MediaRecorder){
  const choices=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];
  for(const type of choices)if(MediaRecorder?.isTypeSupported?.(type))return type;
  return '';
}

export async function blobTo16kMono(blob,AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext){
  if(!AudioContext)throw new Error('AudioContext недоступний');
  const ctx=new AudioContext();
  try{
    const ab=await blob.arrayBuffer(),decoded=await ctx.decodeAudioData(ab.slice(0)),channels=decoded.numberOfChannels,len=decoded.length,mono=new Float32Array(len);
    for(let c=0;c<channels;c++){const data=decoded.getChannelData(c);for(let i=0;i<len;i++)mono[i]+=data[i]/channels;}
    if(decoded.sampleRate===16000)return mono;
    const ratio=decoded.sampleRate/16000,outLen=Math.max(1,Math.round(mono.length/ratio)),out=new Float32Array(outLen);
    for(let i=0;i<outLen;i++){const pos=i*ratio,lo=Math.floor(pos),hi=Math.min(mono.length-1,lo+1),f=pos-lo;out[i]=mono[lo]*(1-f)+mono[hi]*f;}
    return out;
  }finally{try{await ctx.close()}catch{}}
}

export class VoiceCapture{
  constructor({env=globalThis,workerUrl=new URL('./whisper-worker.js',import.meta.url),createWorker,parse=text=>null,onStatus=()=>{},onResult=()=>{},onTranscript=()=>{},onModelStatus=()=>{},onTimer=()=>{},timers}={}){
    this.env=env;this.workerUrl=workerUrl;this.createWorker=createWorker||(()=>new env.Worker(workerUrl,{type:'module'}));
    this.parse=parse;this.onStatus=onStatus;this.onResult=onResult;this.onTranscript=onTranscript;this.onModelStatus=onModelStatus;this.onTimer=onTimer;
    this.timers=timers||{setTimeout:(fn,ms)=>env.setTimeout(fn,ms),clearTimeout:id=>env.clearTimeout(id),setInterval:(fn,ms)=>env.setInterval(fn,ms),clearInterval:id=>env.clearInterval(id),now:()=>Date.now()};
    this.state='idle';this.session=0;this.engine='';this.recognition=null;this.recorder=null;this.stream=null;this.worker=null;this.whisperReady=false;this.whisperBusy=false;this.model='';this.destroyed=false;
    this.startTimer=null;this.recordTimer=null;this.transcribeTimer=null;this.elapsedTimer=null;
  }
  getState(){return {state:this.state,session:this.session,engine:this.engine,model:this.model,activeTracks:this.stream?.getTracks().filter(t=>t.readyState==='live').length||0,whisperReady:this.whisperReady}}
  _status(state,status,text){this.state=state;this.onStatus({state,status,text,engine:this.engine,session:this.session});}
  _clearTimers(){for(const key of ['startTimer','recordTimer','transcribeTimer']){this.timers.clearTimeout(this[key]);this[key]=null}this.timers.clearInterval(this.elapsedTimer);this.elapsedTimer=null;}
  _releaseStream(stream=this.stream){if(stream)for(const track of stream.getTracks())try{track.stop()}catch{}if(stream===this.stream)this.stream=null;}
  _cleanupRecorder(){this._releaseStream();this.recorder=null;this.timers.clearInterval(this.elapsedTimer);this.elapsedTimer=null;this.timers.clearTimeout(this.recordTimer);this.recordTimer=null;this.onTimer(0);}
  _result(text,engine){const value=String(text||'').trim();this._status('confirmation',engine==='whisper'?'Розпізнано локально':'Розпізнано','“'+value+'”');this.onResult({text:value,parsed:this.parse(value),engine,session:this.session});}
  supportsBrowserRecognition(){return !!(this.env.SpeechRecognition||this.env.webkitSpeechRecognition)}
  async start({engine='auto'}={}){
    if(this.destroyed)throw new Error('VoiceCapture destroyed');
    if(this.state==='recording'){this.stop();return false}
    if(!['idle','confirmation','error'].includes(this.state))return false;
    if(engine!=='whisper'&&this.supportsBrowserRecognition())return this._startBrowser();
    return this.startRecording();
  }
  _startBrowser(){
    this._clearTimers();const Recognition=this.env.SpeechRecognition||this.env.webkitSpeechRecognition,session=++this.session;
    const recognition=new Recognition();this.recognition=recognition;this.engine='safari';let finalText='',shown='';
    recognition.lang='uk-UA';recognition.interimResults=true;recognition.continuous=false;recognition.maxAlternatives=3;
    this._status('requesting','Запускаю розпізнавання Safari…','Safari може показати системний запит.');
    const current=()=>session===this.session&&this.recognition===recognition&&!this.destroyed;
    const fallback=()=>{
      if(!current())return;this.recognition=null;this.session++;try{recognition.abort()}catch{}this._clearTimers();
      this._status('idle','Перехід на локальний Whisper','Safari не відповів.');this.onModelStatus({text:'Safari не відповів — переходжу на локальний Whisper',progress:null});this.startRecording();
    };
    this.startTimer=this.timers.setTimeout(fallback,SAFARI_START_LIMIT_MS);
    recognition.onstart=()=>{if(!current())return;this.timers.clearTimeout(this.startTimer);this.startTimer=null;this._status('recording','Слухаю українською…','Англійські та польські назви можна казати в цій самій фразі.');this.onModelStatus({text:'Розпізнавання Safari · без платного API',progress:null});};
    recognition.onresult=event=>{
      if(!current())return;let interim='',final='';for(let i=event.resultIndex;i<event.results.length;i++){const text=event.results[i][0]?.transcript||'';if(event.results[i].isFinal)final+=text;else interim+=text;}
      if(final)finalText=(finalText+' '+final).trim();shown=(finalText+' '+interim).trim();if(shown)this.onTranscript({text:shown,final:!!final,engine:'safari'});
    };
    recognition.onerror=event=>{
      if(!current())return;this._clearTimers();this.recognition=null;const messages={'not-allowed':'Дозволь мікрофон у налаштуваннях Safari для цього сайту.','no-speech':'Не почув мовлення. Натисни мікрофон і спробуй ще раз.','network':'Safari не зміг запустити розпізнавання. Можна ввести фразу текстом.'};
      this._status('error','Не вдалося розпізнати',messages[event.error]||'Натисни мікрофон і спробуй ще раз.');
    };
    recognition.onend=()=>{if(!current())return;this._clearTimers();this.recognition=null;const text=(finalText||shown).trim();if(text)this._result(text,'safari');else if(['recording','stopping'].includes(this.state))this._status('error','Не почув мовлення','Натисни мікрофон і спробуй ще раз.');};
    try{recognition.start();return true}catch{fallback();return false}
  }
  async startRecording(){
    if(this.destroyed)return false;if(this.recorder?.state==='recording'){this.stop();return false}
    if(!['idle','confirmation','error'].includes(this.state))return false;
    const session=++this.session;this.engine='whisper';this._clearTimers();this._status('requesting','Дозвіл на мікрофон…','Safari може показати системний запит.');
    try{
      if(!this.env.navigator?.mediaDevices?.getUserMedia)throw new Error('У цьому браузері немає доступу до мікрофона.');
      const stream=await this.env.navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false});
      if(session!==this.session||this.destroyed){this._releaseStream(stream);return false}
      this.stream=stream;const chunks=[],mimeType=chooseMimeType(this.env.MediaRecorder),recorder=new this.env.MediaRecorder(stream,mimeType?{mimeType}:undefined);this.recorder=recorder;
      recorder.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data)};
      recorder.onerror=event=>{if(session!==this.session)return;this._cleanupRecorder();this._status('error','Помилка запису',event.error?.message||'Можна одразу спробувати ще раз.');};
      recorder.onstop=async()=>{
        if(session!==this.session||this.destroyed)return;const BlobClass=this.env.Blob||Blob,blob=new BlobClass(chunks,{type:recorder.mimeType||mimeType||'audio/mp4'});this._cleanupRecorder();
        if(blob.size<1200){this._status('error','Запис занадто короткий','Натисни ще раз і скажи фразу.');return}
        await this._transcribeBlob(blob,session);
      };
      recorder.start(250);const started=this.timers.now();this.elapsedTimer=this.timers.setInterval(()=>this.onTimer((this.timers.now()-started)/1000),100);this.recordTimer=this.timers.setTimeout(()=>this.stop(),RECORDING_LIMIT_MS);
      this._status('recording','Слухаю… натисни ще раз, щоб зупинити','Говори природно: «Biedronka, двісті злотих, продукти»');return true;
    }catch(error){if(session!==this.session||this.destroyed)return false;this._cleanupRecorder();this._status('error','Немає доступу до мікрофона',(error?.name==='NotAllowedError'?'У Safari: aA → Website Settings → Microphone → Allow. ':'')+(error?.message||''));return false;}
  }
  stop(){
    if(this.recognition){const recognition=this.recognition;this._status('stopping','Завершую…','Обробляю сказане.');try{recognition.stop()}catch{try{recognition.abort()}catch{}}return;}
    if(this.recorder?.state==='recording'){
      this.timers.clearTimeout(this.recordTimer);this.recordTimer=null;this._status('stopping','Готую аудіо…','Мікрофон уже вимикається.');
      try{this.recorder.requestData();this.recorder.stop();this._releaseStream()}catch{this._cleanupRecorder();this._status('error','Не вдалося зупинити запис','Спробуй ще раз.');}
    }
  }
  _ensureWorker(){
    if(this.worker)return this.worker;const worker=this.createWorker();this.worker=worker;
    worker.onmessage=event=>{
      if(this.worker!==worker||this.destroyed)return;const msg=event.data||{};if(msg.requestId!=null&&msg.requestId!==this.session)return;
      if(msg.type==='progress'){if(this.whisperBusy)this._status('model-loading','Завантажую модель…','Перший запуск потребує інтернету; потім модель береться з кешу.');this.onModelStatus({text:msg.text||'Завантажую локальну модель…',progress:Number.isFinite(msg.progress)?Math.round(msg.progress):null});}
      else if(msg.type==='ready'){this.whisperReady=true;this.model=msg.model||'Whisper';this.onModelStatus({text:'Готово: '+this.model,progress:null});}
      else if(msg.type==='result'){this._clearTimers();this.whisperBusy=false;this.onTranscript({text:msg.text||'',final:true,engine:'whisper'});this._result(msg.text||'','whisper');}
      else if(msg.type==='error'){this._clearTimers();this.whisperBusy=false;this._status('error','Не вдалося розпізнати',msg.error||'Спробуй ще раз або введи фразу текстом.');}
    };
    worker.onerror=()=>{if(this.worker!==worker)return;this._resetWorker();this._status('error','Помилка локальної моделі','Текстове поле та ручне додавання продовжують працювати.');};return worker;
  }
  _resetWorker(message){if(this.worker)try{this.worker.terminate()}catch{}this.worker=null;this.whisperReady=false;this.whisperBusy=false;this._clearTimers();if(message)this._status('error','Розпізнавання зупинено',message);}
  async _transcribeBlob(blob,session){
    try{
      this.whisperBusy=true;this._status('decoding','Обробляю аудіо…','Запис залишається лише на цьому пристрої.');
      const pcm=await blobTo16kMono(blob,this.env.AudioContext||this.env.webkitAudioContext);if(session!==this.session||this.destroyed)return;
      this._status(this.whisperReady?'transcribing':'model-loading',this.whisperReady?'Розпізнаю локально…':'Завантажую модель…','Перший запуск може бути довшим. Ручне введення доступне завжди.');
      const worker=this._ensureWorker();this.transcribeTimer=this.timers.setTimeout(()=>{if(session===this.session)this._resetWorker('Час очікування минув. Спробуй коротшу фразу або введи її текстом.');},TRANSCRIPTION_LIMIT_MS);
      worker.postMessage({type:'transcribe',audio:pcm,requestId:session},[pcm.buffer]);
    }catch(error){if(session!==this.session||this.destroyed)return;this.whisperBusy=false;this._status('error','Не вдалося обробити аудіо',(error?.message||String(error))+' Можна одразу записати ще раз.');}
  }
  warmup(){if(this.destroyed)return;this._ensureWorker().postMessage({type:'warmup'});}
  cancel(){
    this.session++;this._clearTimers();const recognition=this.recognition;this.recognition=null;if(recognition)try{recognition.abort()}catch{}
    const recorder=this.recorder;if(recorder?.state==='recording')try{recorder.stop()}catch{}this._cleanupRecorder();if(this.whisperBusy)this._resetWorker();this._status('idle','','');
  }
  destroy(){this.cancel();this._resetWorker();this.destroyed=true;}
}

export const createVoiceCapture=options=>new VoiceCapture(options);
~~~~

---

## ФАЙЛ: whisper-worker.js

~~~~javascript
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

env.allowLocalModels = false;
env.useBrowserCache = true;
try {
  if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.numThreads = 1;
  env.useWasmCache = true;
} catch {}

let transcriber = null;
let loading = null;
let modelLabel = '';

const HOTWORDS = 'Biedronka Żabka Lidl Auchan Carrefour Uber Bolt Booking Airbnb Netflix Spotify Adobe OpenAI Apple Johnny DaVinci Resolve PLN złoty złotych euro монтаж montaż зйомка shooting editing';

function progress(info) {
  if (!info) return;
  let p = Number(info.progress);
  if (Number.isFinite(p) && p <= 1) p *= 100;
  let text = 'Завантажую локальну Whisper-модель…';
  if (info.status === 'ready') text = 'Модель готова';
  else if (info.file) text = `Завантажую ${String(info.file).split('/').pop()}…`;
  self.postMessage({ type: 'progress', progress: Number.isFinite(p) ? p : null, text });
}

async function buildPipeline() {
  const hasWebGPU = !!self.navigator?.gpu;
  const isIOS = /iPad|iPhone|iPod/.test(self.navigator?.userAgent || '') ||
    (self.navigator?.platform === 'MacIntel' && (self.navigator?.maxTouchPoints || 0) > 1);
  // iOS Safari has a documented history of tab reloads with whisper-base, even
  // through WASM. Tiny multilingual is deliberately the first and only iOS
  // model: lower accuracy is preferable to losing the whole finance session.
  const attempts = isIOS
    ? (hasWebGPU ? [
        { id: 'onnx-community/whisper-base', opts: { device: 'webgpu', dtype: 'q4', progress_callback: progress }, label: 'Whisper base multilingual · iPhone WebGPU' },
        { id: 'onnx-community/whisper-tiny', opts: { device: 'wasm', dtype: 'q8', progress_callback: progress }, label: 'Whisper tiny multilingual · iPhone safe mode' },
      ] : [
        { id: 'onnx-community/whisper-tiny', opts: { device: 'wasm', dtype: 'q8', progress_callback: progress }, label: 'Whisper tiny multilingual · iPhone safe mode' },
      ])
    : hasWebGPU
    ? [
        { id: 'onnx-community/whisper-base', opts: { device: 'webgpu', dtype: 'q4', progress_callback: progress }, label: 'Whisper base q4 · WebGPU' },
        { id: 'onnx-community/whisper-tiny', opts: { device: 'wasm', dtype: 'q8', progress_callback: progress }, label: 'Whisper tiny multilingual · WASM' },
      ]
    : [
        { id: 'onnx-community/whisper-tiny', opts: { device: 'wasm', dtype: 'q8', progress_callback: progress }, label: 'Whisper tiny multilingual · WASM' },
      ];

  let lastError;
  for (const a of attempts) {
    try {
      self.postMessage({ type: 'progress', progress: null, text: `Готую ${a.label}…` });
      const pipe = await pipeline('automatic-speech-recognition', a.id, a.opts);
      transcriber = pipe;
      modelLabel = a.label;
      self.postMessage({ type: 'ready', model: modelLabel });
      return pipe;
    } catch (e) {
      lastError = e;
      self.postMessage({ type: 'progress', progress: null, text: `${a.label} не запустився, пробую легший варіант…` });
    }
  }
  throw lastError || new Error('Не вдалося завантажити локальну модель');
}

async function getTranscriber() {
  if (transcriber) return transcriber;
  if (!loading) loading = buildPipeline().finally(() => { loading = null; });
  return loading;
}

async function getPromptIds(pipe) {
  try {
    const fn = pipe?.tokenizer?.get_prompt_ids;
    if (typeof fn !== 'function') return null;
    return await fn.call(pipe.tokenizer, HOTWORDS);
  } catch {
    return null;
  }
}

self.onmessage = async (event) => {
  const msg = event.data || {};
  const requestId = msg.requestId;
  if (msg.type === 'warmup') {
    try { await getTranscriber(); } catch (e) { self.postMessage({ type: 'error', error: String(e?.message || e) }); }
    return;
  }
  if (msg.type !== 'transcribe') return;

  try {
    const audio = msg.audio instanceof Float32Array ? msg.audio : new Float32Array(msg.audio);
    if (!audio.length) throw new Error('Порожній аудіозапис');
    const pipe = await getTranscriber();
    const prompt_ids = await getPromptIds(pipe);
    const options = {
      task: 'transcribe',
      return_timestamps: false,
      chunk_length_s: 20,
      stride_length_s: 2,
    };
    if (prompt_ids) options.prompt_ids = prompt_ids;
    const result = await pipe(audio, options);
    const text = String(result?.text || '').trim();
    if (!text) throw new Error('Модель не почула мову. Спробуй говорити ближче до мікрофона.');
    self.postMessage({ type: 'result', text, model: modelLabel, requestId });
  } catch (e) {
    self.postMessage({ type: 'error', error: String(e?.message || e), requestId });
  }
};
~~~~

---

## ФАЙЛ: market-service.mjs

~~~~javascript
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
~~~~

---

## ФАЙЛ: banking-client.mjs

~~~~javascript
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
~~~~

---

## ФАЙЛ: backend/worker.js

~~~~javascript
const jsonHeaders={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};

export default {
  async fetch(request,env){
    const url=new URL(request.url),origin=request.headers.get("Origin")||"";
    if(request.method==="OPTIONS")return preflight(origin,env);
    const cors=corsHeaders(origin,env);if(!cors)return response({error:"origin_not_allowed"},403);
    if(url.pathname==="/api/health"&&request.method==="GET")return response({ok:true},200,cors);
    const session=await requireSession(request,env);if(!session)return response({error:"authentication_required"},401,cors);
    if(!safeOrigin(request,env))return response({error:"invalid_origin"},403,cors);
    try{
      if(url.pathname==="/api/accounts"&&request.method==="GET")return listAccounts(session.userId,env,cors);
      if(url.pathname==="/api/banks/monobank/connect"&&request.method==="POST")return connectMonobank(request,session.userId,env,cors);
      if(url.pathname==="/api/banks/connect"&&request.method==="POST")return connectEnableBanking(request,session.userId,env,cors);
      if(url.pathname==="/api/sync"&&request.method==="POST")return response({ok:true,status:"sync_queued"},202,cors);
      return response({error:"not_found"},404,cors);
    }catch(error){return response({error:"request_failed"},500,cors)}
  }
};

function response(body,status=200,extra={}){return new Response(JSON.stringify(body),{status,headers:{...jsonHeaders,...extra}})}
function corsHeaders(origin,env){const allowed=env.FRONTEND_ORIGIN||"https://dimasdont-lab.github.io";return origin===allowed?{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Credentials":"true","Vary":"Origin"}:null}
function preflight(origin,env){const cors=corsHeaders(origin,env);return cors?new Response(null,{status:204,headers:{...cors,"Access-Control-Allow-Methods":"GET,POST,DELETE,OPTIONS","Access-Control-Allow-Headers":"Content-Type,X-CSRF-Token","Access-Control-Max-Age":"600"}}):response({error:"origin_not_allowed"},403)}
function safeOrigin(request,env){if(["GET","HEAD"].includes(request.method))return true;return request.headers.get("Origin")===(env.FRONTEND_ORIGIN||"https://dimasdont-lab.github.io")}
async function sha256(value){const bytes=new TextEncoder().encode(value),hash=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function requireSession(request,env){const match=(request.headers.get("Cookie")||"").match(/(?:^|;\s*)vf_session=([^;]+)/);if(!match||!env.DB)return null;const idHash=await sha256(decodeURIComponent(match[1]));const row=await env.DB.prepare("SELECT user_id, expires_at FROM sessions WHERE id_hash=?").bind(idHash).first();return row&&new Date(row.expires_at)>new Date()?{userId:row.user_id}:null}
async function listAccounts(userId,env,cors){const result=await env.DB.prepare("SELECT id,provider,bank_name AS bankName,display_name AS displayName,account_type AS accountType,currency,current_balance AS currentBalance,available_balance AS availableBalance,last_synced_at AS lastSyncedAt,is_active AS isActive,source FROM accounts WHERE user_id=? AND is_active=1").bind(userId).all();return response({accounts:result.results||[]},200,cors)}
async function connectMonobank(request,userId,env,cors){
  const {token}=await request.json();if(typeof token!=="string"||token.length<20||token.length>256)return response({error:"invalid_token_format"},400,cors);
  const mono=await fetch("https://api.monobank.ua/personal/client-info",{headers:{"X-Token":token,"Accept":"application/json"}});if(!mono.ok)return response({error:"token_rejected"},400,cors);const client=await mono.json();
  const encrypted=await encryptSecret(token,env.MONOBANK_TOKEN_ENCRYPTION_KEY),id=crypto.randomUUID(),now=new Date().toISOString();await env.DB.prepare("INSERT INTO bank_connections (id,user_id,provider,encrypted_credential,credential_iv,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(id,userId,"MONOBANK",encrypted.ciphertext,encrypted.iv,"active",now,now).run();
  const accounts=Array.isArray(client.accounts)?client.accounts:[];for(const account of accounts){const currency=isoCurrency(account.currencyCode),balance=Number(account.balance||0)/100;await env.DB.prepare("INSERT OR REPLACE INTO accounts (id,user_id,connection_id,provider,bank_name,display_name,account_type,currency,current_balance,available_balance,external_account_ref,last_synced_at,is_active,source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,'bank')").bind(crypto.randomUUID(),userId,id,"MONOBANK","Monobank",account.type||"Monobank",account.type||"current",currency,balance,Number(account.balance||0)/100,await sha256(String(account.id||"")),now).run()}
  return response({ok:true,connectionId:id,accountsImported:accounts.length},201,cors);
}
async function connectEnableBanking(request,userId,env,cors){const {provider}=await request.json(),allowed=new Set(["PKO","REVOLUT","ERSTE"]);if(!allowed.has(provider))return response({error:"unsupported_provider"},400,cors);if(!env.ENABLE_BANKING_APPLICATION_ID||!env.ENABLE_BANKING_PRIVATE_KEY)return response({error:"provider_not_configured"},503,cors);const state=crypto.randomUUID(),hash=await sha256(state),expires=new Date(Date.now()+10*60*1000).toISOString();await env.DB.prepare("INSERT INTO authorization_states (state_hash,user_id,provider,expires_at) VALUES (?,?,?,?)").bind(hash,userId,provider,expires).run();return response({status:"authorization_scaffold_ready",provider,state},501,cors)}
async function encryptSecret(value,material){if(!material)throw new Error("encryption_key_missing");const raw=Uint8Array.from(atob(material),c=>c.charCodeAt(0));if(raw.length!==32)throw new Error("invalid_encryption_key");const key=await crypto.subtle.importKey("raw",raw,"AES-GCM",false,["encrypt"]),iv=crypto.getRandomValues(new Uint8Array(12)),encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(value));return{ciphertext:bytesToBase64(new Uint8Array(encrypted)),iv:bytesToBase64(iv)}}
function bytesToBase64(bytes){let binary="";for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary)}
function isoCurrency(code){return({980:"UAH",985:"PLN",978:"EUR",840:"USD",826:"GBP"})[String(code)]||"UAH"}
~~~~

---

## ФАЙЛ: backend/schema.sql

~~~~sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bank_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  encrypted_credential TEXT,
  credential_iv TEXT,
  external_connection_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS authorization_states (
  state_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  connection_id TEXT,
  provider TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  account_type TEXT,
  currency TEXT NOT NULL,
  current_balance REAL NOT NULL,
  available_balance REAL,
  external_account_ref TEXT,
  last_synced_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_connections_user ON bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
~~~~
