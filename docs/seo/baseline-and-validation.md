# Вихідний стан і перевірки

Дата спостережень: 2026-10-01. Репозиторій не є CWP; CWP-стек і команди до нього не застосовувалися. Перед роботою `main` мав сторонню зміну `CLOUDFLARE.md` та untracked `output/`. Створено окрему гілку від `d4c9a30`; файл `CLOUDFLARE.md` не редагувався в межах цього завдання.

## Production до змін

Метод: read-only HTTP GET + Chromium 390×844 / 1440×1000. У браузері заблоковано Cloudflare beacon, `/api/analytics`, Maps; контактні кнопки не натискались. Технічні HTTP-запити можуть бути видимі в інфраструктурних логах, але не відправляють RUM або події запису.

| URL/ознака | Спостереження |
|---|---|
| `/` | 200, 81 214 байтів HTML; `lang=uk`; index/follow; self-canonical; ціни, галерея, контакти й JSON-LD є до JS |
| `/robots.txt`, `/sitemap.xml` | 200; sitemap містив лише головну; публічні JSON/media дозволені, admin/private API заборонені |
| `/index.html?source=audit` | 301 → `/?source=audit` |
| HTTP і HTTPS www | 301 → HTTPS без www |
| `/pedicure`, `/manicure`, випадковий URL | Справжні 404; це не доказ, що ці URL колись індексувалися |
| `/admin`, `/api/admin/session` | 302 у Cloudflare Access; приватні дані не отримувалися |
| DOM desktop/mobile | Один H1, коректний canonical, помилок JavaScript і горизонтального переповнення не виявлено |
| Візуальна ієрархія | Великий загальний слоган і mood-photo; блок About перед цінами; прайс закритий; реальні роботи далеко нижче |

Санітизований журнал: [baseline-http.json](evidence/baseline-http.json). До зміни стратегії не виявлено загальної заборони індексації або порожнього SSR. Причину заявлених попередніх змін трафіку без Search Console встановити неможливо.

Початкові перевірки: `npm run build` (включає TypeScript) PASS; `npm run lint` PASS; `npm run cf:check` PASS; `npm run test:server` 12/12; незалежний `npm run test:worker` 3/3; `npm test` 34/34. Два старі motion-тести згодом замінені одним тестом нерухомого фото, а не видалені для приховування помилки.

Локальна лабораторія `node scripts/performance-audit.mjs --label=baseline-2026-10-01`: 3 холодні прогони, mobile 390×844 DPR3, CPU×4, 1.6 Mbps, 150 ms latency. Медіана FCP 564 ms, LCP 1752 ms, CLS 0.0348, long tasks 0 ms. Це localhost зі стисненням і seed-даними, **не** польові Core Web Vitals, INP чи Lighthouse score. [Параметри та baseline](evidence/baseline-performance.json).

## Джерела бізнес-даних і збереження

Production API/SSR і підтверджені в історії дані: Боголюбова, 6, Софіївська Борщагівка; +380 93 931 40 56; Instagram `beauty.space.victoriya`; сім оригінальних фото галереї; повний прайс шести категорій. Графік і поверх мають попереднє джерело в комітах `3350f02` та `d5d4ed0`. Вишневе вживається тільки як напрямок приїзду.

Read-only GET Direct повернув 200 на Instagram login — це очікувана вимога авторизації платформи, не доказ отримання повідомлення. Instagram профіль повернув 200 з відповідною назвою. Telegram `tooriyaaa/s/10` повернув 200 та `tg://resolve?domain=tooriyaaa&story=10`: встановлено, що це історія, тому видимий канал контакту тепер посилається на той самий профіль без story-параметра. Дзвінки й повідомлення не надсилались.

GSC-експортів у доступних файлах проєкту не знайдено; відсутність експорту не доводить відсутності ресурсу в акаунті власника. DNS/HTML підтвердження права власності, публічні favicon/assets, Cloudflare account/site/beacon IDs та секрети не змінювались. Оригінальні матеріали залишені в репозиторії й Git-історії.

## Межа збереження локальних артефактів

Початковий існуючий `worker/cloudflare.test.ts` записував `output/analytics-visits-mobile.png` та `output/analytics-visits-desktop.png`. Незалежний baseline-запуск міг перезаписати ці два раніше наявні untracked знімки. Попередньої копії пікселів немає; недоторканність цих двох файлів не підтверджується. Це тестові зображення, не бізнес-дані. Тест виправлено на `test-results/worker/`. Інші файли `output/` не видалялися; production, `.data`, приватні credentials і remote statistics не змінювались.

## Підсумкова перевірка кандидата

Фінальний прогін 2026-10-01 після виправлень усіх трьох циклів незалежного QA:

| Метод / команда | Результат | Обмеження |
|---|---|---|
| `npm run build` | PASS, TypeScript + Vite + спільний SSR bundle | Локальна збірка, не deployment |
| `npm run lint` | PASS, без помилок і попереджень | Статичний аналіз |
| `npm run cf:check` | PASS | TypeScript Worker, не реальна хмарна авторизація |
| `npm run test:server` | **14/14 PASS** | Ізольований Express/SQLite; HTTP, SSR, auth, редагування та історія |
| `npm run test:worker` | **3/3 PASS** | Miniflare D1/R2, HTTP/SSR/no-JS/hydration, міграція, конфлікти, analytics; локальний RSA issuer |
| `npm test` | **38/38 PASS**, desktop/mobile | Chromium + ізольований Node API; адмінка, запис, галерея, навігація, accessibility; не реальний iOS Safari |
| `node scripts/performance-audit.mjs --label=candidate-2026-10-01 --output=docs/seo/evidence/candidate-performance.json` | 3 прогони: медіана FCP **604 ms**, LCP **1120 ms**, CLS **0.00028**, long tasks **0 ms**, JS errors немає | Лабораторія з тими самими параметрами, не польові CWV або доказ SEO-росту |
| `npx wrangler deploy --dry-run --outdir /tmp/beauty-seo-worker-dry-run` | PASS; bundle 949.70 KiB / gzip 175.81 KiB, assets зібрано | Нічого не опубліковано, remote D1 не мігровано |
| Незалежний SSR preview 390×844 / 1440×1000 | Три маршрути, редагування, links, fragment/hydration/ARIA перевірено; блокерів застосунку немає | Тимчасові дані, зовнішні analytics заблоковано; подробиці у [QA](independent-review.md) |

Проміжний повний UI-прогін мав один timeout мобільного сценарію заміни фото (35/36). Окремий повтор зі trace пройшов; у тестовому visitor context ізольовано зовнішню Google Maps iframe. Причину timeout остаточно не встановлено. Фінальний повний прогін 38/38, включно з доданими fragment-тестами, пройшов без retry; ця обмовка не прихована.

Порівняння лабораторії: LCP 1752 → 1120 ms, CLS 0.0348 → 0.00028; FCP 564 → 604 ms. Основний JS gzip 103 590 → 104 655 байтів. Це три вимірювання на кожну версію з можливою варіативністю локальної машини; зростання швидкодії або конверсії в production не доведено. [Повний звіт кандидата](evidence/candidate-performance.json).

Знімки production до змін: [mobile](evidence/baseline-mobile.png), [desktop](evidence/baseline-desktop.png). Фінальний ізольований preview: [головна mobile](evidence/mobile-home.jpg), [головна desktop](evidence/desktop-home.jpg), [вії mobile](evidence/mobile-lashes.jpg). Це візуальні докази стану, не вимірювання результатів Google.

Команди відтворення:

```sh
npm run build
npm run lint
npm run cf:check
npm run test:server
npm run test:worker
npm test
npm run perf
npx wrangler deploy --dry-run --outdir /tmp/beauty-seo-worker-dry-run
```

`test:server` перевіряє фактичний HTTP/SSR Express, авторизацію, збереження й екранування контенту. `test:worker` запускає справжній Worker у Miniflare з ізольованими D1/R2 і тестовим RSA issuer; перевіряє HTTP, міграцію історії, конфлікти, no-JS/hydration усіх трьох сторінок, клік-облік і статистику. `npm test` перевіряє UI через локальний Vite + ізольований Node API, включно з редакторами, мобільною навігацією, зображеннями та axe. Доступність реального email-коду Access, Google indexing, поле CWV і завершення запису ці тести не підтверджують.
