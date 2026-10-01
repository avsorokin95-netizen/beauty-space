# Головні зображення

Оновлено 2026-10-01 за прямим побажанням власника: замінити перші фото трьох сторінок на красиві атмосферні зображення, які можуть не бути роботами студії.

Педикюр і вії створено вбудованим **image_gen** (не CLI/API fallback). Це синтетичні ілюстративні зображення; на сайті вони мають видимий підпис «Атмосферне зображення» і не додаються до галереї реальних робіт.

Подальше уточнення власника: для манікюру повернути справжнє фото й використати надісланий рожевий манікюр із квітковим декором. Точний відповідний файл уже був у репозиторії — `public/images/pink-floral.webp` (900×1600, близько 63 KB). Тепер він є стандартною обкладинкою манікюру з підписом «Робота Beauty Space Victoriya», без старого згенерованого srcSet. Сам файл не ретушовано й не замінено. Попередні згенеровані manicure-файли та їхній промпт збережено як історію, на головній вони не використовуються.

## Файли та використання

| Сторінка | Основний файл | Варіанти |
|---|---|---|
| Манікюр `/` | [pink-floral.webp](../public/images/pink-floral.webp) | Справжнє фото власника, 900×1600 |
| Педикюр `/pedicure` | [pedicure-800.webp](../public/images/hero/pedicure-800.webp) | 480 / 800 / 1120 px |
| Вії `/laminuvannia-vii` | [lashes-800.webp](../public/images/hero/lashes-800.webp) | 480 / 800 / 1120 px |

Файли згенерованих обкладинок: `public/images/hero/`; поточне справжнє фото манікюру: `public/images/pink-floral.webp`. Джерела PNG лишилися у стандартному `$CODEX_HOME/generated_images/`; у runtime вони не потрібні. Згенеровані WebP оптимізовано через Sharp без ретуші чи зміни змісту; 800 px файли займають приблизно 107 / 81 / 42 KB. Для педикюру/вій браузер вибирає розмір через `srcSet`; усі головні зображення мають `fetchPriority="high"`.

## Редагування власником

У «Роботи» додати своє зображення й обрати «Призначення фото» → «Головне фото — манікюр / педикюр / вії». Фото, підпис і alt зберігаються звичайною публікацією та потрапляють у SSR. Таке зображення не показується в портфоліо. Для повернення стандартної обкладинки видалити відповідний override і опублікувати; видалення не прибирає оригінальний медіафайл зі сховища.

Optional `GalleryItem.placement` підтримують Node і Worker; відсутність поля означає портфоліо. Ліміт: 30 робіт + по одній обкладинці кожного напряму (до 33 записів). Початкові галерейні записи, порядок і фотографії не переписуються. Remote-міграцій чи production-редагувань не виконано. При аварійному поверненні коду до підтримки `placement` не відновлювати редагування/публічну галерею з новими cover-записами без сумісного фільтра: старий UI показуватиме всі записи як роботи, старий writer відкине поле. Зберегти підтримку `placement` або спочатку погоджено відновити попередній документ як нову ревізію; це не потребує відновлення всієї БД.

## Перевірки

`npm run lint`, `npm run build` (TypeScript + Vite + SSR) і `npm run cf:check` — PASS. `npm run test:server` — 16/16, `npm run test:worker` — 3/3. Цільовий browser-набір `npm test -- tests/gallery-admin.spec.ts tests/landing.spec.ts tests/motion.spec.ts tests/service-pages.spec.ts` — 24/24. Перевірено призначення трьох обкладинок через адмінку, збереження/перезавантаження, SSR, виключення з портфоліо, відхилення дублікатів і повернення стандартного зображення. Тестові зміни виконано лише в ізольованих даних.

Окремий незалежний агент візуально перевірив три вихідні зображення та всі сторінки на 390/1440 px: анатомічних/композиційних блокерів, горизонтального переповнення або хибного підпису роботи не виявлено. Галерея лишилася 7/1/2 зображення на головній/педикюрі/віях. Це перевірка локального вигляду й поведінки, не production deployment чи SEO-ефект.

## Точні промпти

### manicure

```text
Use case: photorealistic-natural.
Asset type: atmospheric manicure hero image for a refined Ukrainian beauty studio website, separate from the studio's real portfolio.
Primary request: a beautiful natural editorial photograph of an adult woman's elegantly relaxed hands with short oval nails and a delicate glossy sheer blush-pink manicure.
Scene/backdrop: soft warm ivory linen, subtle tactile folds, uncluttered and quiet.
Composition/framing: vertical portrait composition, designed for a 4:5 website crop. Two anatomically correct hands rest naturally together, gently overlapping at the wrists; visible nails are the focus without an extreme macro crop. Leave breathing room around fingertips and keep the whole main hand in the central safe area. No face needed.
Lighting/mood: soft side window light, gentle shadows, sophisticated calm beauty editorial, believable skin texture, polished but not plastic.
Color palette: warm cream, natural skin, muted nude pink, subtle taupe shadows, matching a cream and dusty-rose website.
Text: none.
Constraints: no text, logos, watermark, salon identity, tools, exaggerated long nail extensions, jewelry clutter, flowers, extra or fused fingers. Do not imitate any particular real person's work. One finished image, no collage.
```

### pedicure

```text
Use case: photorealistic-natural.
Asset type: atmospheric pedicure hero image for a refined Ukrainian beauty studio website, separate from the studio's real portfolio.
Primary request: a tasteful natural editorial photograph of an adult woman's relaxed feet with neatly shaped short toenails and a subtle glossy pale blush-pink pedicure.
Scene/backdrop: warm ivory linen and a softly folded cream towel, clean minimal setting without medical equipment.
Composition/framing: vertical portrait composition for a 4:5 website crop. A graceful three-quarter view of lower ankles and feet resting naturally, one foot a little behind the other; clearly believable anatomy and five toes per foot. Show enough of the ankles and surrounding fabric for an elegant spa editorial, not an oversized clinical macro. Keep toes inside a central crop-safe area with breathing room.
Lighting/mood: soft side window light and gentle shadows, calm premium beauty editorial, realistic skin texture.
Color palette: warm cream, natural skin, muted nude pink and light taupe, cohesive with a cream and dusty-rose website.
Text: none.
Constraints: no text, logos, watermarks, salon identity, hands, extra or fused toes, medical tools, flowers, shells, plastic skin, harsh highlights. One finished image, no collage.
```

### lashes

```text
Use case: photorealistic-natural.
Asset type: atmospheric lash-care hero image for a refined Ukrainian beauty studio website, separate from the studio's real portfolio.
Primary request: a beautiful natural editorial portrait of a fictional adult woman with gently closed or lowered eyes and delicately curled, well-separated natural eyelashes.
Scene/backdrop: softly blurred warm ivory background, minimal neutral styling.
Composition/framing: vertical portrait composition designed for a 4:5 website crop. A relaxed three-quarter head-and-upper-shoulders portrait, with the eye and brow area clearly visible but not an extreme eye macro. Include forehead, nose and chin with comfortable breathing room; hair softly pulled back, calm expression. Keep the main face inside the central safe area.
Lighting/mood: soft window light, gentle dimensional shadows, believable fine skin texture, graceful premium beauty editorial.
Color palette: warm cream, natural skin, soft taupe, subtle nude makeup, cohesive with a cream and dusty-rose website.
Text: none.
Constraints: natural subtle eyelashes, no heavy false eyelash fans or extensions, no dramatic makeup, no glaring open eyeball closeup, no tools, gloves, text, logos, watermark, jewelry clutter or salon identity. One finished image, no collage.
```
