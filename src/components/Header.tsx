import { BrandStar } from "./BrandStar";
import { useContacts } from "../hooks/useContacts";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { navigation } from "../data/studio";

export function Logo() {
  return (
    <a
      className="logo"
      href="#home"
      aria-label="Beauty Space Victoriya — головна"
    >
      <span>
        beauty space<span className="logo-star"><BrandStar /></span>
      </span>
      <small>BY VICTORIYA</small>
    </a>
  );
}
export function Header() {
  const studio = useContacts();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);
  return (
    <header className="header">
      <div className="shell header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Основна навігація">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <a
          className="header-book"
          href={studio.direct}
          target="_blank"
          rel="noopener noreferrer"
        >
          Записатися <ArrowUpRight size={16} />
        </a>
        <button
          className="menu-button"
          aria-label="Відкрити меню"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(true)}
        >
          <Menu />
        </button>
      </div>
      <dialog
        ref={dialog}
        id="mobile-nav"
        className="mobile-menu"
        aria-label="Меню студії"
        onCancel={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false);
          }
        }}
      >
        <div className="mobile-menu-heading">
          <span>BEAUTY SPACE <BrandStar /></span>
          <button className="icon-button" autoFocus aria-label="Закрити меню" onClick={() => setOpen(false)}><X size={22} /></button>
        </div>
        <p className="mobile-menu-intro">Твій простір краси.</p>
        <nav className="mobile-nav" aria-label="Мобільна навігація">
          {navigation.map((item, index) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              <span className="mobile-nav-number">0{index + 1}</span>
              <span>{item.label}</span>
              <ArrowUpRight size={20} />
            </a>
          ))}
        </nav>
        <div className="mobile-menu-bottom">
          <a className="button" href={studio.direct} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Записатися онлайн <ArrowUpRight size={18} /></a>
          <a href={`tel:${studio.phone}`}>{studio.phoneDisplay}</a>
          <p>{studio.city}<br />{studio.address}</p>
        </div>
      </dialog>
    </header>
  );
}
