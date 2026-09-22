import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPublicApp } from './render-public.ts';
import { studio } from '../src/data/studio.ts';
import { prices } from '../src/data/prices.ts';
import { initialGallery } from '../src/data/gallery.ts';
import type { PublicSnapshot } from '../shared/public-snapshot.ts';

function snapshot(): PublicSnapshot {
  return {
    contacts: { revision: 1, updatedAt: '2026-09-22T00:00:00.000Z', contacts: { ...studio } },
    prices: { revision: 1, updatedAt: '2026-09-22T00:00:00.000Z', prices: structuredClone(prices) },
    gallery: { revision: 1, updatedAt: '2026-09-22T00:00:00.000Z', items: structuredClone(initialGallery) },
  };
}

test('SSR renders the published public page with visible content and native price lists', async () => {
  const published = snapshot();
  published.prices.prices.nails.items[0].price = '575 грн';
  published.gallery.items[0].title = 'Опублікована робота';
  const html = await renderPublicApp(published);
  assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1);
  assert.match(html, /id="main"/);
  assert.match(html, /Манікюр без покриття/);
  assert.match(html, /575 грн/);
  assert.match(html, /Опублікована робота/);
  assert.match(html, /<details/);
  assert.match(html, /href="tel:\+380939314056"/);
  assert.doesNotMatch(html, /opacity:\s*0(?:;|"|\})/);
  assert.doesNotMatch(html, /Відкриваємо beauty-простір|Завантажуємо роботи/);
});

test('SSR escapes published contact content on the homepage', async () => {
  const published = snapshot();
  published.contacts.contacts.address = 'вул. <script>alert(1)</script>';
  const html = await renderPublicApp(published);
  assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /id="home"/);
});

test('SSR gives legacy gallery photos descriptive alt while preserving captions and custom descriptions', async () => {
  const published = snapshot();
  const [legacy, custom, replaced] = published.gallery.items;
  delete legacy.alt;
  legacy.title = 'Мій підпис до роботи';
  custom.alt = 'Рожеві нігті з декором "квіти" <тест>';
  replaced.src = '/api/media/replaced-photo.webp';
  replaced.title = 'Нова робота';
  delete replaced.alt;

  const html = await renderPublicApp(published);
  const images = html.match(/<img\b[^>]*>/g) ?? [];
  const imageFor = (src: string) => images.find((image) => image.includes(`src="${src}"`)) ?? '';
  assert.match(imageFor(legacy.src), /alt="Французький манікюр на коротких квадратних нігтях із рожевою основою та білими кінчиками\."/);
  assert.match(html, /<h3>Мій підпис до роботи<\/h3>/);
  assert.match(imageFor(custom.src), /alt="Рожеві нігті з декором &quot;квіти&quot; &lt;тест&gt;"/);
  assert.match(imageFor(replaced.src), /alt="Нова робота"/);
  assert.doesNotMatch(imageFor(replaced.src), /чорними крапками/);
});

test('homepage explains service choices in server HTML while keeping published price variants', async () => {
  const published = snapshot();
  published.prices.prices.nails.summary = 'від 625 грн';
  published.prices.prices.nails.items[1].price = '975 грн';
  published.prices.prices.pedicure.summary = 'від 250 грн';
  published.prices.prices.pedicure.items[0].price = '650/750 грн';
  const html = await renderPublicApp(published);

  for (const [category, explanation] of [
    ['nails', 'Комплекс з укріпленням включає зняття, манікюр і покриття зі зміцненням'],
    ['pedicure', 'Чистку стопи можна замовити окремо'],
    ['brows', 'Оформлення брів поєднує корекцію та фарбування'],
    ['lashes', 'Окремо доступні фарбування вій та зняття нарощених вій'],
    ['sets', 'Саме склад процедур відрізняє два комплекси'],
    ['depilation', 'Воскова депіляція зони верхньої та нижньої губи'],
  ]) {
    const detail = html.split(`id="service-${category}"`)[1]?.split('</details>')[0];
    assert.ok(detail?.includes(explanation), `${category}: explanation must be present inside its native price accordion`);
  }
  assert.match(html, /Манікюр — від 625 грн/);
  assert.match(html, /У розділі «Педикюр» послуги — від 250 грн/);
  assert.match(html, /975 грн/);
  assert.match(html, /650\/750 грн/);
  const manicure = html.split('id="service-nails"')[1].split('</details>')[0];
  assert.doesNotMatch(manicure, /900 грн/);
  assert.match(html, /Нарощення всіх нігтів майстер не виконує/);
  assert.doesNotMatch(html, /href="\/(?:manicure|pedicure|brows|lashes)\//);
});
