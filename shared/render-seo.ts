import { studioSeo } from './seo.ts';
import type { ContactDocument } from './contacts.ts';
import type { PriceDocument } from './pricing.ts';
const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

export function renderSeo(template: string, snapshot: ContactDocument, prices: PriceDocument['prices'], origin?: string) {
    const { contacts } = snapshot;
    const seo = studioSeo(contacts, origin);
    const meta = [
      `<title>${escape(seo.title)}</title>`,
      `<meta name="description" content="${escape(seo.description)}">`,
      `<meta name="robots" content="${origin ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}">`,
      '<meta property="og:type" content="website">', '<meta property="og:locale" content="uk_UA">',
      '<meta property="og:site_name" content="Beauty Space Victoriya">',
      `<meta property="og:title" content="${escape(seo.title)}">`,
      `<meta property="og:description" content="${escape(seo.description)}">`,
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta name="twitter:title" content="${escape(seo.title)}">`,
      `<meta name="twitter:description" content="${escape(seo.description)}">`,
      ...(seo.url && seo.image ? [
        `<link rel="canonical" href="${escape(seo.url)}">`,
        `<meta property="og:url" content="${escape(seo.url)}">`,
        `<meta property="og:image" content="${escape(seo.image)}">`,
        '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="Beauty Space Victoriya — твій простір краси">',
        `<meta name="twitter:image" content="${escape(seo.image)}">`,
      ] : []),
      `<script type="application/ld+json" id="studio-schema">${json(seo.schema)}</script>`,
      `<script type="application/json" id="studio-contacts">${json(snapshot)}</script>`,
      '<link rel="preload" as="image" href="/images/manicure.webp" fetchpriority="high">',
    ].join('\n');
    const items = Object.values(prices).flatMap((category) => category.items).map((item) => `<li>${escape(item.name)} — ${escape(item.price)}</li>`).join('');
    const fallback = `<noscript><main><h1>${escape(seo.title)}</h1><p>${escape(seo.description)}</p><h2>Послуги та ціни</h2><ul>${items}</ul><h2>Контакти й запис</h2><p>${escape(contacts.address)}, ${escape(contacts.city)}</p><p><a href="tel:${escape(contacts.phone)}">${escape(contacts.phone)}</a></p><a href="${escape(contacts.direct)}">Записатися онлайн</a> · <a href="${escape(contacts.instagram)}">Instagram</a> · <a href="${escape(contacts.telegram)}">Telegram</a></main></noscript>`;
    const html = template
      .replace(/<title>[\s\S]*?<\/title>/, '')
      .replace(/<meta\s+(?:name="description"|property="og:[^"]+")[\s\S]*?>/g, '')
      .replace('</head>', () => `${meta}\n</head>`)
      .replace(/<noscript[\s\S]*?<\/noscript\s*>/, () => fallback);
    return html;
}
