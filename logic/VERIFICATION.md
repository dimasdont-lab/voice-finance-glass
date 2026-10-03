# Перевірка перед передачою

Команда: `node --test tests/*.test.mjs`.

Результат 2026-10-03: **87 тестів пройшли, 0 помилок, 0 пропусків**. JavaScript-модулі пройшли syntax-check; імпорт єдиної точки входу й offline-ініціалізація перевірені тестами.

Набір перевіряє фінансовий engine, фактичні parser fixtures, voice lifecycle з mock API, market/backend transport з mock fetch/DB та application/navigation сценарії. Source-reference тести звіряють алгоритми totals і всіх фінансових period/series; окремо перевірено парсер проти основного source. Копії worker/schema збігаються з main за SHA-256.

Перевірені сценарії: нові кнопки й alias goals, Goals → Analytics, відкриття/назад/nested panels, ручні операції, зміна рахунку, paid/unpaid debt і видалення оплати, профілі людей, категорії, пошук, графіки без банків, 1D, manual/cash account, input-confirm/edit/cancel, voice cancellation і stale results, receipt manual path, export/clear, один ticker tap проти drag, vertical chart scroll проти horizontal inspect, кеш/деталі ринку, чесні unsupported banking стани.

Пакет не робить live-запитів у тестах. Фізичний iPhone, дозволи мікрофона, Safari/PWA UI, швидкість STT, живі API курсів і реальні банки не перевірені цими тестами. Візуального UI немає, отже його анімації/скло також не перевірялися.

До пакета не входять особисті дані користувача, secrets, .env, старі HTML/CSS/SVG/dock/render файли. Архів містить тільки явний список файлів передачі. Згенерований single-file Markdown перевіряється `node build-handoff.mjs --check`.

Стан основного проєкту перевіряється окремо read-only Git status + SHA-256 index.html; пакет не потребує редагування або запуску основного checkout.
