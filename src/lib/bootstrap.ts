import { createContext } from 'react';
import type { PublicSnapshot } from '../../shared/public-snapshot';

export const PublicSnapshotContext = createContext<PublicSnapshot | null>(null);

/** Published server snapshot, never credentials or administrative data. */
export function readBootstrap<T>(id: string): T | null {
  if (typeof document === 'undefined') return null;
  try {
    const value = document.getElementById(id)?.textContent;
    return value ? JSON.parse(value) as T : null;
  } catch { return null; }
}

export function readPublicSnapshot(): PublicSnapshot | undefined {
  const contacts = readBootstrap<PublicSnapshot['contacts']>('studio-contacts');
  const prices = readBootstrap<PublicSnapshot['prices']>('studio-prices');
  const gallery = readBootstrap<PublicSnapshot['gallery']>('studio-gallery');
  return contacts && prices && gallery ? { contacts, prices, gallery } : undefined;
}
