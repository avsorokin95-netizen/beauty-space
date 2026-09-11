import { useContacts } from "../hooks/useContacts";
import { useState } from "react";
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
        beauty space<span className="logo-star">✳</span>
      </span>
      <small>BY VICTORIYA</small>
    </a>
  );
}
export function Header() {
  const studio = useContacts();
  const [open, setOpen] = useState(false);
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
          aria-label={open ? "Закрити меню" : "Відкрити меню"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <nav
        id="mobile-nav"
        aria-label="Мобільна навігація"
        className="mobile-nav"
        hidden={!open}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        {navigation.map((item) => (
          <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
            {item.label}
            <ArrowUpRight size={18} />
          </a>
        ))}
      </nav>
    </header>
  );
}
