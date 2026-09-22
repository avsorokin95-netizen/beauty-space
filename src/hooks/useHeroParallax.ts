import { useEffect, type RefObject } from "react";
import { useMotionPreference } from "./useMotionPreference";

/** Preserve the desktop photo's 0–12% parallax without a global animation runtime. */
export function useHeroParallax(
  sectionRef: RefObject<HTMLElement | null>,
  photoRef: RefObject<HTMLImageElement | null>,
) {
  const reduced = useMotionPreference();

  useEffect(() => {
    const section = sectionRef.current;
    const photo = photoRef.current;
    if (!section || !photo || reduced) return;

    // This matches the mobile CSS, which intentionally keeps the photo still.
    const desktop = window.matchMedia("(min-width: 768px)");
    let inView = false;
    let listening = false;
    let frame = 0;

    const update = () => {
      frame = 0;
      const { top, height } = section.getBoundingClientRect();
      const progress = height > 0 ? Math.max(0, Math.min(1, -top / height)) : 0;
      photo.style.transform = `translateY(${progress * 12}%)`;
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const sync = () => {
      const active = desktop.matches && inView && !document.hidden;
      if (active) {
        if (!listening) window.addEventListener("scroll", schedule, { passive: true });
        schedule();
      } else {
        window.removeEventListener("scroll", schedule);
        window.cancelAnimationFrame(frame);
        frame = 0;
        if (!desktop.matches) photo.style.removeProperty("transform");
      }
      listening = active;
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(section);
    desktop.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    document.addEventListener("visibilitychange", sync);

    return () => {
      observer.disconnect();
      desktop.removeEventListener("change", sync);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", sync);
      document.removeEventListener("visibilitychange", sync);
      window.cancelAnimationFrame(frame);
      photo.style.removeProperty("transform");
    };
  }, [sectionRef, photoRef, reduced]);
}
