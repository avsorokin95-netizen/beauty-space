import useEmblaCarousel from "embla-carousel-react";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Camera, Maximize2, X, Pause, Play } from "lucide-react";
import { useContacts } from "../hooks/useContacts";
import { Eyebrow, Reveal } from "./ui";

import { useGallery } from "../hooks/useGallery";

export function Gallery() {
  const studio = useContacts();
  const { posts = [], error, retry } = useGallery();
  const [selected, setSelected] = useState<number | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const reduced = useReducedMotion();
  const [viewport, carousel] = useEmblaCarousel({ loop: true, align: "start", duration: 45, slidesToScroll: 1 });
  const region = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const touchInteraction = useRef(false);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    if (!carousel) return;
    const sync = () => setActiveSlide(carousel.selectedScrollSnap());
    const startDrag = () => setDragging(true);
    const endDrag = () => setDragging(false);
    sync();
    carousel.on("select", sync).on("reInit", sync);
    carousel.on("pointerDown", startDrag).on("pointerUp", endDrag);
    return () => {
      carousel.off("select", sync).off("reInit", sync);
      carousel.off("pointerDown", startDrag).off("pointerUp", endDrag);
    };
  }, [carousel]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    if (region.current) observer.observe(region.current);
    const sync = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);
  useEffect(() => {
    if (!carousel || posts.length < 2 || paused || hovered || focused || dragging || !inView || !visible || reduced || selected !== null) return;
    const timer = window.setInterval(() => carousel.scrollNext(), 4000);
    return () => clearInterval(timer);
  }, [carousel, posts.length, paused, hovered, focused, dragging, inView, visible, reduced, selected]);
  const advance = (direction: number) => {
    if (direction > 0) carousel?.scrollNext(!!reduced);
    else carousel?.scrollPrev(!!reduced);
  };
  const dialog = useRef<HTMLDialogElement>(null);
  const isOpen = selected !== null;
  useEffect(() => {
    if (!isOpen) return;
    const element = dialog.current;
    const focused = document.activeElement as HTMLElement | null;
    element?.showModal();
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = original;
      focused?.focus();
    };
  }, [isOpen]);
  const step = (direction: number) =>
    setSelected((current) =>
      current === null
        ? null
        : (current + direction + posts.length) % posts.length,
    );
  return (
    <section id="gallery" className="section shell">
      <Reveal className="section-heading">
        <div>
          <Eyebrow>BEAUTY В ДЕТАЛЯХ</Eyebrow>
          <h2>
            Роботи, що говорять
            <br />
            <em>самі за себе.</em>
          </h2>
        </div>
        <a
          className="text-link"
          href={studio.instagram}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Camera size={17} /> {studio.instagramHandle}
        </a>
      </Reveal>
      {error && <p role="status">Не вдалося оновити роботи. <button className="text-link" onClick={retry}>Спробувати ще раз</button></p>}
      {!posts.length && !error && <p role="status">Завантажуємо роботи…</p>}
      <div ref={region} className="gallery-carousel" role="region" aria-roledescription="карусель" aria-label="Роботи студії"
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }} onPointerLeave={() => setHovered(false)}
        onPointerDownCapture={(event) => {
          touchInteraction.current = event.pointerType === "touch";
          if (touchInteraction.current) { setFocused(false); setHovered(false); }
        }}
        onKeyDownCapture={() => { touchInteraction.current = false; setFocused(true); }}
        onFocusCapture={() => { if (!touchInteraction.current) setFocused(true); }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div ref={viewport} className="gallery-viewport" id="gallery-track">
      <div className="gallery-grid" style={{ "--gallery-columns": Math.min(3, Math.max(1, posts.length - 1)) } as CSSProperties}>
        {posts.map((post, index) => (
          <div key={post.id} className="gallery-slide" role="group" aria-roledescription="слайд" aria-label={`${index + 1} з ${posts.length}`}>
            <article className="gallery-card">
              <button
                className="gallery-image-button"
                aria-label={`Збільшити фото: ${post.title}`}
                onClick={() => setSelected(index)}
              >
                <img
                  src={post.src}
                  alt={post.title + " — робота Beauty Space Victoriya"}
                  width="1200"
                  height="1600"
                  loading="lazy"
                />
                <span className="gallery-image-icon">
                  <Camera size={18} />
                </span>
              </button>
              <div className="gallery-caption">
                <div>
                  <span>{post.label}</span>
                  <h3>{post.title}</h3>
                </div>
                <button
                  aria-label={`Відкрити роботу ${index + 1}`}
                  className="icon-button"
                  onClick={() => setSelected(index)}
                >
                  <Maximize2 size={18} />
                </button>
              </div>
              {post.instagram && <a
                className="post-fallback"
                href={post.instagram}
                target="_blank"
                rel="noopener noreferrer"
              >
                Переглянути публікацію в Instagram ↗
              </a>}
            </article>
          </div>
        ))}
      </div>
      </div>
      {posts.length > 1 && <div className="gallery-controls" role="group" aria-label="Гортання робіт">
        <button className="icon-button" aria-label="Попередній слайд" aria-controls="gallery-track" onClick={() => advance(-1)}>
          <ChevronLeft size={20} />
        </button>
        <span aria-live={paused || focused || reduced ? "polite" : "off"} aria-atomic="true">{activeSlide + 1} / {posts.length}</span>
        <button className="icon-button" aria-label="Наступний слайд" aria-controls="gallery-track" onClick={() => advance(1)}>
          <ChevronRight size={20} />
        </button>
        {!reduced && <button className="icon-button" aria-label={paused ? "Увімкнути автоматичне гортання" : "Призупинити автоматичне гортання"} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>}
      </div>}
      </div>
      <p className="gallery-note">
        Реальні роботи Beauty Space Victoriya. Ще більше ідей — у нашому
        Instagram.
      </p>
      <dialog
        ref={dialog}
        className="lightbox"
        aria-labelledby="lightbox-title"
        onCancel={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") step(1);
          if (event.key === "ArrowLeft") step(-1);
        }}
      >
        {selected !== null && posts[selected] && (
          <div className="lightbox-content">
            <div className="lightbox-header">
              <h3 id="lightbox-title">{posts[selected].title}</h3>
              <button
                autoFocus
                className="icon-button"
                aria-label="Закрити галерею"
                onClick={() => setSelected(null)}
              >
                <X size={22} />
              </button>
            </div>
            <img
              className="lightbox-image"
              key={posts[selected].id}
              alt={posts[selected].title + " — робота студії"}
              src={posts[selected].src}
            />
            <div className="lightbox-footer">
              <button
                className="icon-button"
                aria-label="Попередня робота"
                onClick={() => step(-1)}
              >
                <ChevronLeft />
              </button>
              {posts[selected].instagram ? <a
                href={posts[selected].instagram}
                target="_blank"
                rel="noopener noreferrer"
              >
                {selected + 1} / {posts.length} · В Instagram ↗
              </a> : <span>{selected + 1} / {posts.length}</span>}
              <button
                className="icon-button"
                aria-label="Наступна робота"
                onClick={() => step(1)}
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
