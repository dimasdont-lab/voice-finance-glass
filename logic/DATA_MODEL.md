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
