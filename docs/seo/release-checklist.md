# Власник, deployment і rollback

> **Оновлення:** deployment і additive 0004 виконані 2026-10-01; [актуальні IDs, перевірки й межі доступу](reaudit-2026-10-01.md). Нижче збережено початковий checklist; його старий статус «не виконано» стосується попереднього аудиту.

Статус 2026-10-01: **жодна remote-міграція, публікація, зміна GBP чи GSC не виконана**. Це конкретний порядок для погодженого deployment. Не запускати первинний `cf:export`/імпорт поверх чинної production-бази: джерело актуального контенту — онлайн-адмінка.

## До release window

1. Власник переглядає кандидат і актуальні ціни/фото. Погоджує коротке вікно без редагування через адмінку; публічний сайт лишається доступним. Записати точний Git SHA кандидата, поточний Cloudflare version ID, UTC-час та відповідального.
2. Виконати перевірки з [журналу](baseline-and-validation.md); зафіксувати результат. `wrangler deploy --dry-run` не є deployment.
3. Перевірити поточні backup D1 та медіа R2; цей реліз не змінює/не видаляє R2-об’єктів. Зробити свіжий D1 SQL export у приватний каталог з унікальним ім’ям. Приклад (після дозволу на release, не виконано тут):

```sh
npx wrangler d1 export beauty-space --remote --output .cloudflare-private/before-seo-2026-10-01.sql
npx wrangler d1 migrations list beauty-space --remote
```

4. Перевірити export у **новому локальному** сховищі (`--local`, окремий `--persist-to`), не імпортувати його назад у remote. Порівняти kind/revision/JSON та кількість рядків `analytics_daily` з вихідним snapshot; переконатися, що завантажені фото доступні з поточної R2/окремої копії. Немає backup або перевірки читання — не починати міграцію. Приватний dump не комітити й не прикладати до публічної документації.

```sh
npx wrangler d1 execute beauty-space --local --persist-to .cloudflare-private/restore-check-2026-10-01 --file .cloudflare-private/before-seo-2026-10-01.sql
npx wrangler d1 execute beauty-space --local --persist-to .cloudflare-private/restore-check-2026-10-01 --command "SELECT kind, revision, json_valid(data) AS valid FROM documents; SELECT COUNT(*) AS analytics_rows FROM analytics_daily;"
```

## Порядок rollout — важливо для QA-12

Старий Worker перевіряє `meta.changes === 1`. Тригери історії збільшують цей лічильник, тому старий код може відповісти 409 **після фактичного збереження**. Новий Worker використовує conditional `UPDATE … RETURNING revision` і працює як до, так і після додавання історії. Регресійний Worker-тест перевіряє обидва стани.

1. За збереженої паузи редагувань спочатку розгорнути **новий RETURNING-сумісний код** за чинним процесом `npm run cf:deploy`. Ця команда також збирає frontend; `wrangler.jsonc` містить public routes/aliases. Зберегти новий Cloudflare version ID.
2. Звірити `/`, `/pedicure`, `/laminuvannia-vii` і захист `/admin`. Потім застосувати тільки очікувану additive міграцію `0004_document_history.sql`. Якщо список показує неочікувані старі/інші migrations — розібратися до застосування.

```sh
npx wrangler d1 migrations apply beauty-space --remote
npx wrangler d1 execute beauty-space --remote --command "SELECT kind, revision, json_valid(data) AS valid FROM documents; SELECT kind, revision FROM document_history ORDER BY kind, revision; SELECT COUNT(*) AS analytics_rows FROM analytics_daily;"
```

3. Звірити: початкові три current documents і revision/data не змінилися; їхні snapshot є у `document_history`; жодна analytics-таблиця не очищена. За паузи редагувань значення документів мають точно відповідати backup. Нормальні реальні відвідування можуть збільшувати статистику — зменшення/обнулення неприпустиме.
4. Перевірити публікацію **реальної погодженої** правки власника; не публікувати тестові ціни/номери/відгуки в production. Свіжий GET відповідної сторінки має показати ту саму правку в HTML та JSON-LD, а попередня ревізія — зберегтися. Поновити редагування після перевірки історії. Тестові сценарії до цього вже виконані на ізольованих даних.

## Smoke після deployment

- Усі три public URL: 200, `lang=uk`, один правильний H1, self-canonical, index/follow, актуальні назви/ціни/фото до JS та після hydration.
- Sitemap: рівно три URL, без admin/alias/query; robots дозволяє публічні assets/API та не замінює авторизацію.
- HTTP/www → HTTPS non-www; slash/index aliases → відповідний URL одразу, query збережені; невідомий URL і `/brows` → 404. `/manicure` → `/`, `/lashes` → `/laminuvannia-vii`.
- Власник перевіряє Direct зі свого акаунта, телефон, Telegram-профіль, маршрут та вхід; агент не надсилає тестових повідомлень клієнтам. Мобільна панель не закриває важливі елементи. Перевірити також iOS Safari на реальному телефоні, якщо доступний.
- `/admin` та `/api/admin/*` запитують Access; дозволена пошта працює, стороння не отримує даних. Локальна симуляція RSA не підтверджує фактичну доставку email-коду.
- Один Cloudflare beacon, `spa:false`; автоматичне дубльоване підключення лишається вимкненим. Старі event labels і account/site/token незмінні. Нові сторінки тепер входять до покриття аналітики — це треба враховувати у порівнянні.
- Автоматизовані production browser smoke блокують `static.cloudflareinsights.com`, `/cdn-cgi/rum` та `/api/analytics`; реальні дії власника при перевірці записати в release log, не називати їх клієнтськими записами.
- Перевірити Google Rich Results Test / URL Inspection; подати оновлений sitemap у наявний Search Console. Це окрема дія власника, ще не виконана.

## Rollback без втрати бізнес-даних

Підстави: неправильний canonical/noindex, SSR 5xx, непрацездатний запис/редактор, невідповідність актуальних даних або історії. Не відкочувати через один день без росту показів.

1. Призупинити лише редагування власником, зафіксувати поточні version IDs і зробити новий приватний D1 export. Не накочувати старий DB dump поверх нових цін/фото/статистики.
2. Найкраще повертати перевірений попередній UI із сумісним `RETURNING` writer — історія продовжить працювати. Після появи окремих головних фото також зберігати serializer і фільтр `GalleryItem.placement`: старий UI без фільтра показуватиме обкладинки як реальні роботи. Перед точним старим rollback перевірити current gallery; за наявності `hero-*` використовувати сумісний UI або спершу погоджено відновити попередній галерейний документ як нову ревізію, зберігши backup та history. Стандартні згенеровані обкладинки самі собою не додають рядків до gallery.
3. Якщо потрібен точний старий Worker `d4c9a30`, перед rollback прибрати **тільки три нові triggers**, зберігши `document_history` і всі дані. Це окрема погоджена операція; під час неї редагування лишаються зупиненими:

```sql
DROP TRIGGER IF EXISTS document_history_insert;
DROP TRIGGER IF EXISTS document_history_update;
DROP TRIGGER IF EXISTS document_history_delete;
```

Потім повернути зафіксовану попередню Worker version через чинний Cloudflare rollback process. Перевірити запис/ціни/admin/statistics. Після точного старого rollback **не поновлювати редагування власником**, доки не повернуто сумісний writer: старі serializers контактів/галереї при збереженні можуть відкинути нові optional поля, а triggers вже не працюватимуть. Це аварійний режим публічного читання; зафіксована пауза owner writes лишається умовою rollback. Для звичайної роботи обирати попередній UI із поточними serializers і RETURNING. Зберегти post-release export та history. При повторному rollout перевстановити snapshot/triggers з `0004` явно: журнал migrations уже вважає файл виконаним, звичайний `migrations apply` не запускає його знову. Не видаляти записи migration history навмання.
4. Якщо помилково змінено лише контент, відновити потрібний документ з `document_history` як **нову revision** через погоджене публікування, а не зменшувати revision або відновлювати цілу базу. Спершу перевірити відновлення локально й залишити поточний документ в історії. Пошкодження самої БД вимагає окремого погодженого restore; Time Travel/SQL restore може відкотити також нову статистику, тому це не стандартний code rollback.

## Безкоштовні дії власника

Практичний пріоритет на перший тиждень: перевірити доступ до **існуючого** GBP за збереженим Place ID; точну назву/категорії/адресу/телефон; режим прийому й hours; посилання сайту та запису; додати свої фото входу/кабінету. Не створювати дублікат профілю, фальшиву адресу у Вишневому або SEO-назву.

Підтвердити значення slash-цін і актуальність фото/каналів зв’язку, додати коротку фактичну інформацію про майстра в нове поле «Про студію». Якщо є підтверджені відомості про процес/матеріали, внести їх; стаж, стерилізація, тривалість і гарантії не вигадуються.

Попросити реальних клієнтів про чесний відгук нейтрально, без винагороди й відбору лише задоволених. Перевірити посилання у власному Instagram та доречних місцевих спільнотах/партнерів за їхніми правилами. Жодних платних каталогів, реклами, куплених посилань або відгуків.

Джерела, перевірені 2026-10-01: [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [D1 export/import](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [Worker rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/), [правила GBP](https://support.google.com/business/answer/3038177), [чесні відгуки](https://support.google.com/business/answer/3474122). Rollback Worker не означає rollback прив’язаних баз/медіа.
