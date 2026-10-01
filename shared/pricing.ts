import { prices as initialPrices, type ServicePricing } from "../src/data/prices.ts";
import { serviceContent } from './service-content.ts';

export interface PriceDocument {
  revision: number;
  updatedAt: string;
  prices: Record<string, ServicePricing>;
}

// Allow the existing slash variants and a concise "from" label. No HTML,
// arbitrary prose, zero/negative amounts or unbounded numbers enter the price list.
export function validPrice(value: unknown, summary = false): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!summary && normalized.startsWith("від ")) return false;
  if (!/^(?:від )?\d[\d ]*(?:\/\d[\d ]*)? грн$/.test(normalized)) return false;
  return normalized
    .replace(/^від /, "")
    .replace(/ грн$/, "")
    .split("/")
    .every((part) => {
      if (!/^(?:\d+|\d{1,3}(?: \d{3})+)$/.test(part.trim())) return false;
      const number = Number(part.replaceAll(" ", ""));
      return Number.isSafeInteger(number) && number > 0 && number <= 100000;
    });
}

export function normalizePrice(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validText(value: unknown, max: number, required = false): value is string {
  return typeof value === 'string' && value.length <= max && (!required || !!value.trim()) && !Array.from(value).some((character) => character.charCodeAt(0) < 32 && !['\n', '\r', '\t'].includes(character));
}

/** Legacy JSON remains intact; defaults are read-time values until the owner saves. */
export function categoryContent(category: ServicePricing, id: string) {
  const original = initialPrices[id];
  const originalScope = !!original && category.items.length === original.items.length && category.items.every((item, index) => item.name === original.items[index].name && (item.detail ?? '') === (original.items[index].detail ?? ''));
  return {
    overview: category.overview ?? (originalScope ? serviceContent[id]?.overview : category.items.map((item) => `${item.name}${item.detail ? `: ${item.detail}` : ''}.`).join(' ')) ?? '',
    booking: category.booking ?? (originalScope ? serviceContent[id]?.booking : 'Повідом назву обраної послуги та зручний день. Склад процедури, додаткові опції й час погодимо під час запису.') ?? '',
  };
}

/** The same bounded publication contract is used by Node and Cloudflare. */
export function validatePrices(input: unknown, current: PriceDocument['prices']): PriceDocument['prices'] {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== Object.keys(current).length) throw new Error('validation');
  const incoming = input as PriceDocument['prices'];
  return Object.fromEntries(Object.keys(current).map((id) => {
    const category = incoming[id];
    if (!category || !validPrice(category.summary, true) || !Array.isArray(category.items) || category.items.length < 1 || category.items.length > 30) throw new Error('validation');
    for (const key of ['note', 'overview', 'booking'] as const) {
      if (category[key] !== undefined && !validText(category[key], 1200)) throw new Error('validation');
    }
    return [id, {
      summary: normalizePrice(category.summary),
      ...Object.fromEntries((['note', 'overview', 'booking'] as const).flatMap((key) => {
        const value = category[key] ?? current[id][key];
        return value === undefined ? [] : [[key, value.trim()]];
      })),
      items: category.items.map((item) => {
        if (!item || !validText(item.name, 150, true) || (item.detail !== undefined && !validText(item.detail, 600)) || !validPrice(item.price)) throw new Error('validation');
        return { name: item.name.trim(), ...(item.detail === undefined ? {} : { detail: item.detail.trim() }), price: normalizePrice(item.price) };
      }),
    }];
  }));
}
