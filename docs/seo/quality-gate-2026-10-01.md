# Незалежний SEO quality gate — 1 жовтня 2026

Цей звіт замінює попередні аудити щодо поточного стану. Перевірено production, код, Search Console, публічний Google Maps, конкурентів і шлях до запису. Два незалежні агенти виконали стратегію та технічний review; код змінював лише основний агент. Реліз розгорнуто, production перевірено, sitemap подано; обмеження індексації й авторизованої адмінки наведені явно.

## Вихідний стан і стратегія

На початку local HEAD `fe28a352090016f283ba9ae2fe79ea2cef26c74c`, гілка `seo/local-intent-2026-10-01`; remote `https://github.com/avsorokin95-netizen/beauty-space.git`, `main` = `05a2ddbe298222193f3198a7e26353d6032425f5`. Production version `a1441490-3a7c-4da0-bc8b-3df9f12b2d07`, deployment `bd168f04-703e-47bf-b226-c8377761870b`, 100% трафіку. Локальні responsive hero/navigation зміни ще не були опубліковані, тому включені в повну перевірку кандидата. Сторонні незакомічені `CLOUDFLARE.md` і `output/` збережені й виключені з коміту.

Структуру залишено: головна — основна сторінка манікюру, `/pedicure` — педикюр, `/laminuvannia-vii` — вії. Окрема `/manicure` дублювала б головну; цей alias правильно перенаправляється на `/`. Нових географічних сторінок, doorway або штучних FAQ не створено. Фактична адреса — Софіївська Борщагівка, вул. Боголюбова, 6; ЖК «Софія» та Вишневе згадані лише як місця, звідки клієнт може приїхати.

| Пріоритет | Знахідка / рішення |
|---|---|
| P0 | Критичних SEO-блокерів не виявлено. |
| P1 | Дві нові сторінки ще невідомі Google; подати актуальний sitemap після production QA, перевірити URL Inspection. |
| P2 | «Ціна категорії: від 200 грн» могла сприйматись як ціна повного педикюру/ламінування. Уточнено, що це окремі процедури й доповнення; власницькі значення збережені. |
| P2 | Description показував лише першу процедуру. Тепер містить дві реальні процедури з точними актуальними цінами, назвою населеного пункту й адресою. Однойменні комплекси розрізняються за detail. |
| P2 | Додано перевірені Maps geo/postalCode. Вони автоматично зникають після зміни адреси або міста. |
| P2 | На 390px/DPR3 зображенню шириною 161 CSS px потрібні ~483px: старий srcset перескакував із 480 на 800, а головна брала 900px. Додано 640px варіанти й 480px для манікюру. Це ті самі фото, без заміни робіт чи owner covers. |
| P2 | Оновлено сумісний транзитивний `ip-address` після dependency audit; без примусового оновлення Miniflare на інший prerelease. |
| P3 | Не змінювати хороші title/H1, не додавати сторінки лише заради keywords, не переписувати сайт заради diff. |

## Search Console: справжні дані

Авторизація service account успішна; property `sc-domain:victoriya-beauty.space`, `siteFullUser`. Запитано фіналізовані web-дані **2025-06-01–2026-09-30**; фактичні рядки дат — **2026-09-11–2026-09-28**. Це не 16 місяців накопиченого трафіку. Дані збережені без credentials у [GSC baseline](evidence/quality-gate-gsc-before.json).

Загалом **25 кліків / 124 покази / CTR 20,16% / середня позиція 7,72**.

| Відкритий query | Кліки | Покази | CTR | Позиція |
|---|---:|---:|---:|---:|
| манікюр жк софія | 9 | 33 | 27,27% | 15,42 |
| манікюр софіївська борщагівка | 0 | 6 | 0% | 11,67 |
| маникюр софиевская борщаговка | 0 | 2 | 0% | 4,5 |
| салон вікторія | 0 | 3 | 0% | 6,33 |
| виктория маникюр | 0 | 1 | 0% | 14 |
| the beauty space | 0 | 1 | 0% | 1 |

Перший запит — реальна можливість покращити видимість; CTR 27,27% не є доказом слабкого snippet. Вибірка інших запитів замала для причинних висновків. Немає підстав створювати сторінки під ціну/зміцнення/Вишневе лише через відсутність таких query rows.

Відкриті запити охоплюють лише 46/124 показів і 9/25 кліків: решту не можна автоматично назвати branded чи non-branded. Явні локальні non-brand запити мають 41 показ і 9 кліків; три інші фрази неоднозначні й не підтверджують brand demand саме цієї студії. Google API повертає обмежений набір рядків, а не всі приватні запити ([документація](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)).

Головна: 24 кліки / 124 покази; `/#services`: 1 клік / 16 показів — фрагмент/sitelink тієї самої сторінки, не окрема landing і не доведена канібалізація. Page impressions не слід додавати до property total. Нові сервісні сторінки ще не мають рядків; невідповідного landing intent або канібалізації між ними дані не показали.

Mobile: 9/70, CTR 12,86%, позиція 6,14; desktop: 16/54, CTR 29,63%, позиція 9,76. Усі 25 кліків з України (117 показів); решта 7 показів — BIH/FRA/NLD/USA без кліків. Search appearance і video не повернули рядків; image search — 1 показ / 0 кліків.

До deployment головна: **Submitted and indexed**, robots/indexing ALLOWED, fetch SUCCESSFUL, Google-selected canonical = user canonical = `https://victoriya-beauty.space/`, mobile crawl **2026-09-24 16:45:05Z**. `/pedicure`, `/laminuvannia-vii` і redirect `/manicure`: **URL is unknown to Google**. Індексувати потрібно canonical `/`, не alias `/manicure`.

Sitemap до релізу: lastSubmitted 12 вересня, lastDownloaded 27 вересня, warnings/errors 0; старий Google snapshot містив submitted=1. Поле sitemap indexed=0 не спростовує PASS головної в URL Inspection. Загального API для звіту Page Indexing немає; перевірено доступні sitemap та URL Inspection, без вигаданого coverage export.

## Production: технічна перевірка й контент

[HTTP/browser/lab baseline](evidence/quality-gate-before.json). Усі три сторінки 200, один H1, self-canonical, index/follow; параметри UTM canonical-ізуються на чисту сторінку. HTTP, www, trailing slash, index.html та старі aliases ведуть 301 до потрібного URL без циклів; перевірений комбінований `http://www.../pedicure/` — один redirect. `/brows` та випадковий URL — справжні 404. Soft404 не виявлено. Адмінка/private API захищені Cloudflare Access.

Robots дозволяє публічні сторінки, assets і media; admin/private API закриті, потрібні JSON endpoints дозволені для rendering. Sitemap має лише три canonical indexable URLs, без admin/redirects/підставного lastmod. Відсутність lastmod краща за вигаданий час кожного запиту.

| Сторінка | Intent / заголовки / контент / CTA |
|---|---|
| `/` | Локальний манікюр. Title «Манікюр · Софіївська Борщагівка \| Beauty Space Victoriya», H1 «Манікюр у Софіївській Борщагівці». Реальна манікюрна робота, 550/900 грн у hero, повний прайс 6 категорій, 7 робіт студії; manicure перший у навігації та прайсі. |
| `/pedicure` | Педикюр і вибір складу комплексу. Власні title/H1, 600/700 грн без вигаданої відповідності варіантам, комплекс зі стопою 1 000 грн, одна реальна робота. Декоративний hero видимо позначений. |
| `/laminuvannia-vii` | Ламінування вій, варіанти з фарбуванням/без, суміжні комплекси. Власні title/H1, 800/700 грн, дві реальні роботи; декоративний hero відокремлений від портфоліо. |

На всіх: ціни, тексти, адреса, телефон, FAQ та внутрішні links є в raw SSR HTML; JavaScript не є умовою бачити головний контент. Native details працюють без JS. Не виявлено повторних IDs, зламаних локальних anchors чи keyword stuffing. Інші service pages мають breadcrumbs і посилання на повний прайс; локальні секції не перекидають користувача на чужу сторінку. CTA ведуть у правильний Direct, телефон, Instagram, Telegram та Maps. Натискання не називається підтвердженим записом.

JSON-LD: BeautySalon, WebSite, WebPage, Service/OfferCatalog/Offer; breadcrumbs на двох сервісних сторінках. Stable IDs і fragments відповідають сторінкам; ціни й послуги беруться з опублікованого документа. Slash-price не стає вигаданим numeric price. SameAs — справжній Instagram. Вигаданих reviews/AggregateRating немає. [Schema.org Validator](https://validator.schema.org/) перевірив усі три baseline URL: **0 errors / 0 warnings**; перевірка словника не гарантує Google rich results.

Зображення WebP, alt описують фото; декоративні hero позначені. Галерея lazy, hero high priority, width/height і CSS резервують місце, карта відкладена. Власні WOFF2; сторонніх font/CDN UI залежностей немає. Нові hero 640px: манікюр 36 944 bytes проти 63 360, педикюр 56 050 проти 81 250, вії 29 566 проти 41 972. Originals, owner uploads і підписи збережені. Main JS близько 107 kB gzip, admin завантажується окремо.

## Швидкодія

Власний production lab: Chromium, mobile 390×844/DPR3, CPU×4, 150ms, 1.6Mbps, три cold runs на сторінку; RUM надсилання перехоплено, щоб не додавати тестові перегляди. Baseline median LCP: головна 1,856s, педикюр 2,148s, вії 1,104s; CLS <0,011, long tasks 0. Desktop один нетротлений run: LCP 0,224–0,304s, CLS <0,035. Це лабораторні виміри, не field INP/CWV.

Незалежний [Google PSI mobile](https://pagespeed.web.dev/analysis/https-victoriya-beauty-space/86l1tvd0qm?form_factor=mobile) / [desktop](https://pagespeed.web.dev/analysis/https-victoriya-beauty-space/86l1tvd0qm?form_factor=desktop), 1 жовтня 23:44 GMT+3: Performance **88 / 100**, Accessibility/Best Practices/SEO **100/100/100** в обох. Mobile Slow4G Moto G Power: FCP 2,7s, LCP 3,3s, TBT 10ms, CLS 0,001; desktop LCP 0,6s, TBT 0, CLS 0,038. Різні lab profiles не порівнюються напряму. Field panel **No Data** в обох; польові LCP/CLS/INP не доступні. Public PSI API повернув 429, UI-тест успішний. Оптимізація responsive images обґрунтована фактичним зайвим payload, а не обіцянкою певного Lighthouse score.

## Google Maps, конкуренти й зовнішня присутність

Незалежно відкрито [існуючий Maps-профіль](https://www.google.com/maps/search/?api=1&query=Beauty+Space+Victoriya&query_place_id=ChIJey2Ar-TL1EARuk3pdFrpkJ0). Назва, category «Салон манікюру та педикюру», Боголюбова 6, Софіївська Борщагівка, телефон 093 931 4056 і URL сайту збігаються. Видимий postcode **08131**, place coordinates **50.3999287, 30.375247** (place URL !3d/!4d, не лише центр embed). Видно Thursday 09–18 і наступне відкриття Friday09; повний тиждень не доступний. Видимі 5,0 без надійно доступного count/review text не використано для schema. Services/description/повноту фото restricted view не дозволив підтвердити. GBP не змінювали.

Нижче п’ять органічно видимих релевантних конкурентів у дослідженій вибірці, а не твердження про стабільний Google top5. Усі також публічно знайдені на Google Maps. Backlink counts/authority не доступні й не вигадувались.

| Конкурент | Що корисно, що не копіювати |
|---|---|
| [Sofia Nails](https://sofia-nails.kiev.ua/), [прайс](https://sofia-nails.kiev.ua/price/) | Манікюрний фокус, ціни/портфоліо/відгуки/контакти, комплекси й рівні майстра (900/1000 грн). Корисна прозорість складу послуги. Виявлено різні ціни на головній/прайсі та placeholder; NAP мережі неоднозначний. |
| [I.S.S.A manicure](https://issa.in.ua/manicure/) | Окрема service page, H1, таблиця комплексів/доплат, адреса/години/запис. Манікюр 600, комплекс 1050 грн. Склад послуги варто пояснювати; Victoriya це вже робить. |
| [O’Nail](https://www.onail.kyiv.ua/) | Імена/ролі майстрів, портфоліо, адреса й цокольний поверх — справжні trust signals. Сайт не резолвився під час direct fetch: висновки з search snapshot і Maps, актуальні prices/title/H1 повністю не підтверджені. |
| [Beauty Hub nail](https://beauty-hub.com.ua/nail/) | Докладні комплекси/доплати, роботи, відгуки з іменами, адреса й години; комплекс 1150, гігієнічний 640 грн у snapshot. Direct HTTPS мав certificate hostname mismatch; ці дані не видаються за живий прайс. |
| [Moda Studio](https://modastudio.com.ua/), [ЖК Софія](https://modastudio.com.ua/zhk-sofiya) | Реальні філії з окремими адресами/телефонами/Maps, локальний H2. Корисна ясність філій; не копіювати keyword list з нерелевантними географіями чи зовнішній слабко читабельний прайс. |

## Дії, що потребують власника

1. Через авторизований Search Console UI виконати URL Inspection → Live Test → одноразовий Request Indexing для [головної](https://victoriya-beauty.space/), [педикюру](https://victoriya-beauty.space/pedicure), [ламінування вій](https://victoriya-beauty.space/laminuvannia-vii). У цьому релізі UI-запити не виконано: авторизований browser access недоступний. Service account API цього endpoint не має; sitemap submit не є переіндексацією ([URL Inspection API](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)).
2. У власному GBP перевірити services/ціни й special hours; додати справжні фото входу/поверху −1, робіт і майстра. NAP та головна категорія вже правильні — не змінювати їх заради keywords. Запрошувати чесні відгуки від реальних клієнтів без винагород/відбору лише задоволених ([Google local ranking](https://support.google.com/business/answer/7091), [reviews](https://support.google.com/business/answer/3474122)).
3. У власному Instagram перевірити website field, NAP і актуальні Highlights прайсу/робіт/маршруту. Недоступний website field не називаємо доведеною помилкою.
4. За відсутності дубліката створити безкоштовний профіль [Barb](https://barb.ua/uk/partners) з реальними роботами/прайсом/NAP ([реєстрація](https://barb.ua/uk/join)). Free покази телефону лімітовані; звернення через платформу безкоштовні.
5. За потреби додаткової локальної присутності — [Locator free profile](https://locator.ua/blog/2025/01/pravyla-dodavannya-organizaczij-na-locator/): фізична B2C-студія, 2 категорії/5 фото. Website link nofollow через redirect — це клієнтська видимість і citation, не гарантований backlink boost. Без спам-каталогів, PBN або купівлі посилань.

Нові профілі/відгуки/повідомлення не створювалися без доступу та участі власника. Непідтверджені біографії, сертифікати, гарантії, відгуки й стерилізаційні твердження не додавались.

## Моніторинг

- **1–2 тижні:** lastDownloaded sitemap, відкриття/індексація двох сервісних сторінок, Google canonical/last crawl, локальні query rows. Не повторювати indexing requests щодня.
- **4 тижні:** зіставити однакові 28-денні вікна; impressions/кліки/позиції локальних manicure queries, mobile CTR, сторінки педикюру/вій і реальні contact clicks. Клік CTA не дорівнює візиту.
- **8 тижнів:** оцінити локальні покази, дзвінки/повідомлення та підтверджені клієнтські записи; вирішувати про новий контент лише за наявності окремого корисного intent. Конкретних позицій або строку індексації не обіцяємо.

## Тести, review, безпека

- `npm ci`, `npm run lint`, `npm run build` (TypeScript + Vite + SSR), `npm run cf:check` — PASS.
- Server tests **16/16**, Worker tests **3/3** — PASS. Нові регресії перевіряють обидві опубліковані ціни/назви в description, неоднозначні комплекси, видалення geo/postcode після зміни адреси, відсутність default srcSet на owner covers.
- Повний Playwright suite **53/53** — PASS: desktop/mobile Chromium, iPhone WebKit, адмінка/публікація/ціни/контакти/фото/пароль, доступність, галерея, anchors. Після responsive image змін повторено відповідні **19/19**, server і Worker suites.
- Спочатку один серверний тест очікував стару назву цінової підказки; очікування оновлено, persistence assertion залишено, повторний run 16/16. Це не втрата admin content.
- `wrangler deploy --dry-run` — PASS; це не production deployment.
- Незалежний reviewer перевірив diff, pending layout commit, Chromium/WebKit SSR candidate: metadata/canonical/schema, mobile booking, full-price/direct-fragment navigation — без блокерів. Початкові зауваження про формулювання й джерело geo враховані. Один WebKit unload warning від contacts refresh відтворюється і на старому production; normal loads без помилок, це не регресія релізу.
- Незалежне перехоплення production analytics: одна beacon script/load event, по одній booking/phone/instagram/telegram/directions події; payload лише `event`. Тестові CTA requests не записувалися у D1. Історію аналітики не видаляли.
- `ip-address` оновлено 10.7.0 → **10.7.2** без зміни package.json. `npm audit --omit=dev`: **0 vulnerabilities**. Повний audit має 3 транзитивні dev findings (undici/Miniflare/Wrangler, серед них high); вони не входять у Worker runtime. Force/major upgrade інструментів не виконувався в SEO-релізі.
- Перед commit перевірені status/diff/tracked files, шаблони credentials/tokens і точні значення GSC credential у пам’яті: **0 знахідок**. Ключ залишився поза репозиторієм; `.gitignore` захищає локальні secrets/credentials/private exports. Секрети не друкувалися й не копіювалися. Backup D1 — лише ignored private directory.
- Production owner login/email OTP недоступні в цьому середовищі: CUA surfaces не ввімкнені. Справжню production-публікацію через owner session не імітували; натомість перевірені Access, повний isolated admin publication flow, Worker auth/history та незмінність public document hashes до/після релізу. Це явна межа перевірки.

## Release verification

**Реліз виконаний і production незалежно перевірено.** Source commit `bff1408b61b2fa325e49a78354b1f603a2ec43bf` створено на `seo/local-intent-2026-10-01`, fast-forward push `HEAD:main` у чинний `origin` успішний, без force/history rewrite. Deployment ручний: `npm run cf:deploy -- --tag bff1408 --message "Independent SEO quality gate bff1408"`.

Cloudflare version **`9fec9760-5910-44d5-b1e6-60642a53fc2a`**, deployment **`eb9ef72a-593c-4fb0-8f3b-3e45a603fb94`**, **100% production**, **2026-10-01 20:54:27 UTC**. Основний домен `https://victoriya-beauty.space/`, не preview. Нових міграцій немає. Приватний D1 backup успішно прочитано в окремій in-memory SQLite; усі documents/revisions збігаються.

[Production QA](evidence/quality-gate-after.json), [deploy/data/asset evidence](evidence/quality-gate-release.json): 19 HTTP сценаріїв, 3 сторінки × desktop/mobile, 14 requested assets 200; XML sitemap валідний, canonical/robots/redirects/404 правильні. Чотири production JS/CSS (зокрема admin chunks) побайтово збігаються з build. SSR bootstrap deep-equal current API. Contacts rev1, prices rev1, gallery rev4 та їхні SHA256 не змінилися; D1 лишив 7 aggregate rows / 11 contact clicks, 1 cache row і ті самі history snapshots. Audit SQL rows_written=0.

Незалежний фінальний reviewer повторив **12 mobile cases: Chromium/WebKit × 320/390px × 3 сторінки**. Немає overflow/runtime errors/bad anchors; ціни, галерея, CTA й 480/640px image selection правильні. По одній beacon та кожній категорії contact events; POST/RUM перехоплено, тестових кліків у D1 немає. `/admin` та `/api/admin/session` захищені Access. Нових зауважень немає; production owner-save не виконано через відсутність авторизованої сесії.

Зовнішній Schema.org Validator повторено **20:55:29 UTC** для всіх трьох URL: rendered=true, **0 errors/0 warnings**, перевірені нові geo/postcode. Власний mobile lab median LCP до→після: **1,856→0,900s** головна; **2,148→1,596s** педикюр; **1,104→0,832s** вії. Післярелізний CLS ≤0,0125 mobile / ≤0,0205 desktop; mobile TTFB 130–229ms. Long-task sum до 54ms у двох homepage runs; це не INP і не польові дані. Крім image variants реліз містить раніше закомічену responsive layout зміну, тому весь lab delta не приписується одному srcSet.

Повторний [Google PSI mobile](https://pagespeed.web.dev/analysis/https-victoriya-beauty-space/avvkn0o4uw?form_factor=mobile) / [desktop](https://pagespeed.web.dev/analysis/https-victoriya-beauty-space/avvkn0o4uw?form_factor=desktop): Performance **85/100**, A11y/BP/SEO **100/100/100**; mobile LCP **3,3s**, FCP2,8s, TBT0, CLS0, Speed Index4,6s; desktop LCP0,6s, TBT0, CLS0,02. Одиничний remote score 88→85 **не доводить покращення загальної швидкодії**; LCP лишився3,3s, SI погіршився в цьому run. Менші image payloads і контрольований lab поліпшились; польового CWV/INP висновку все ще немає (No Data). Не жертвували UX і не перебудовували loading лише заради score.

Фінальний документаційний коміт містить результати після deployment; runtime джерело — вказаний `bff1408`. Зміни після нього стосуються лише звіту та evidence.


## Google після deployment

[До/після evidence](evidence/quality-gate-gsc-after.json): актуальний production [sitemap.xml](https://victoriya-beauty.space/sitemap.xml) повторно перевірено як валідний XML із трьома canonical URL. **PUT sitemap submit успішний, HTTP 204**, `lastSubmitted` **2026-10-01T20:57:29.713Z**. Наступний GET підтвердив реєстрацію: `isPending=true`, warnings/errors **0/0**. `lastDownloaded` поки 27 вересня і submitted=1 — це попередній Google snapshot, не фактичний вміст нового sitemap. Очікується нове завантаження Google; повторно надсилати sitemap в циклі не потрібно.

URL Inspection після публікації: головна **PASS / Submitted and indexed**, обидва canonical = `https://victoriya-beauty.space/`, robots/indexing allowed, last crawl лишився **24 вересня 16:45:05Z**. `/pedicure` і `/laminuvannia-vii` поки **unknown to Google**, canonical і last crawl для них ще не надані. Redirect `/manicure` також unknown, його не подавати як окрему ціль індексації. Це стан індексу, а не live test нової версії: Google ще не підтвердив crawl релізу.

**Request Indexing виконано: 0.** Авторизованих browser surfaces для Search Console UI немає. Через API успішно виконані analytics queries, sitemap list/submit та URL Inspection; Google Indexing API для beauty-сторінок не використовували. Sitemap submit не називається переіндексацією. Три конкретні ручні URL наведено в owner actions.

Фінальний стан доступної роботи: **AUDITED + FIXED + REVIEWED + TESTED + COMMITTED + PUSHED + DEPLOYED + PRODUCTION VERIFIED + SEARCH CONSOLE UPDATED**. Це не обіцянка індексації всіх URL або певної позиції Google.
