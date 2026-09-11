import type { ServicePricing } from "../src/data/prices.ts";

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
