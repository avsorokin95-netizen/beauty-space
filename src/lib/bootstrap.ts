/** Published server snapshot, never credentials or administrative data. */
export function readBootstrap<T>(id: string): T | null {
  try {
    const value = document.getElementById(id)?.textContent;
    return value ? JSON.parse(value) as T : null;
  } catch { return null; }
}
