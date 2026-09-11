import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { GalleryDocument } from "../../shared/gallery";

export function useGallery() {
  const [snapshot, setSnapshot] = useState<GalleryDocument | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      api<GalleryDocument>("/api/gallery", { signal: controller.signal })
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
    posts: snapshot?.items,
    error,
    retry: () => setAttempt((value) => value + 1),
  };
}
