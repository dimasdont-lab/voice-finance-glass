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
