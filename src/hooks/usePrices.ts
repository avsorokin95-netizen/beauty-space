import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { PriceDocument } from "../../shared/pricing";
import { PublicSnapshotContext, readBootstrap } from "../lib/bootstrap";

export const PricesContext = createContext<ReturnType<typeof usePublishedPrices> | null>(null);

export function usePrices() {
  const value = useContext(PricesContext);
  if (!value) throw new Error('PricesProvider is required');
  return value;
}

/** Only PricesProvider subscribes; visible prices and SEO share one revision. */
export function usePublishedPrices() {
  const published = useContext(PublicSnapshotContext);
  const [snapshot, setSnapshot] = useState<PriceDocument | null>(() => published?.prices ?? readBootstrap<PriceDocument>('studio-prices'));
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      api<PriceDocument>("/api/prices", { signal: controller.signal })
        .then((value) => {
          setSnapshot((current) =>
            !current || value.revision >= current.revision ? value : current,
          );
          setError(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) setError(true);
        });
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [attempt]);
  return {
    prices: snapshot?.prices,
    error,
    retry: () => setAttempt((value) => value + 1),
  };
}
