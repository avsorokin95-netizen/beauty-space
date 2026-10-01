import { useContext, useEffect, useRef } from 'react';
import { usePrices } from '../hooks/usePrices';
import { PublicSnapshotContext } from '../lib/bootstrap';

/** Client-rendered pages can mount after the browser has already tried the anchor. */
export function InitialFragmentScroll() {
  const snapshot = useContext(PublicSnapshotContext);
  const { prices, error } = usePrices();
  const ready = Boolean(prices) || error;
  const initialHash = useRef(typeof window === 'undefined' ? '' : window.location.hash);

  useEffect(() => {
    // Server HTML already supports native anchors and history scroll restoration.
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (snapshot || !initialHash.current || navigation?.type === 'back_forward') return;
    const hash = initialHash.current;
    let id: string;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }

    let cancelled = false;
    let frame = 0;
    const cancel = () => { cancelled = true; initialHash.current = ''; };
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown', 'hashchange'] as const;
    for (const event of events) window.addEventListener(event, cancel, { passive: true });
    if (ready) void document.fonts.ready.then(() => {
      if (cancelled) return;
      frame = requestAnimationFrame(() => {
        if (cancelled || window.location.hash !== hash) return;
        document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
        initialHash.current = '';
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      for (const event of events) window.removeEventListener(event, cancel);
    };
  }, [ready, snapshot]);

  return null;
}
