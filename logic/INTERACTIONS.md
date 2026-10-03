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
