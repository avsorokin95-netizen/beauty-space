import { BrandStar } from "./BrandStar";
import { useContacts } from "../hooks/useContacts";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { serviceNavigation, studioNavigation } from "../data/studio";
import type { PublicPath } from "../../shared/pages";

function ServiceSwitcher({ path }: { path: PublicPath }) {
  return <div className="service-switcher" role="group" aria-label="Послуги">
    {serviceNavigation.map((item) => <a key={item.href} href={item.href} aria-current={path === item.href ? 'page' : undefined}>
      <span className="service-current-dot" aria-hidden="true" />{item.label}
    </a>)}
  </div>;
}

export function Logo() {
  return (
    <a
      className="logo"
      href="/"
      aria-label="Beauty Space Victoriya — головна"
    >
      <span>
        beauty space<span className="logo-star"><BrandStar /></span>
      </span>
      <small>BY VICTORIYA</small>
    </a>
  );
}
export function Header({ path }: { path: PublicPath }) {
  const studio = useContacts();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1101px)");
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
          <ServiceSwitcher path={path} />
          <div className="studio-links" role="group" aria-label="Інформація про студію">
          {studioNavigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
          </div>
        </nav>
        <a
          className="header-book"
          data-analytics="booking" href={studio.direct}
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
      <nav className="shell service-bar" aria-label="Послуги студії">
        <ServiceSwitcher path={path} />
      </nav>
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
        <nav className="mobile-nav" aria-label="Мобільна навігація">
          <div className="mobile-nav-services" role="group" aria-labelledby="menu-services-label">
          <p className="menu-group-label" id="menu-services-label">Обери послугу</p>
          {serviceNavigation.map((item) => (
            <a key={item.href} href={item.href} aria-current={path === item.href ? 'page' : undefined} onClick={() => setOpen(false)}>
              <span>{item.label}</span>
              {path === item.href ? <span className="current-page-label">Ви тут</span> : <ArrowUpRight size={18} aria-hidden="true" />}
            </a>
          ))}
          </div>
          <div className="mobile-nav-studio" role="group" aria-labelledby="menu-studio-label">
          <p className="menu-group-label" id="menu-studio-label">Інформація про студію</p>
          {studioNavigation.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}<ArrowUpRight size={15} aria-hidden="true" /></a>
          ))}
          </div>
        </nav>
        <div className="mobile-menu-bottom">
          <a className="button" data-analytics="booking" href={studio.direct} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Запис у Direct <ArrowUpRight size={18} /></a>
          <a href={`tel:${studio.phone}`}>{studio.phoneDisplay}</a>
          <p>{studio.city}<br />{studio.address}</p>
        </div>
      </dialog>
    </header>
  );
}
