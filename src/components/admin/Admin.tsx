import { BrandStar } from "../BrandStar";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  LogOut,
  RotateCcw,
  Save,
  CircleAlert,
} from "lucide-react";
import { services } from "../../data/studio";
import { api, ApiError } from "../../lib/api";
import { validPrice, type PriceDocument } from "../../../shared/pricing";
import { cn } from "../../lib/utils";
import { GalleryEditor, type GalleryModel } from "./GalleryEditor";
import { ContactsEditor, type ContactsModel } from "./ContactsEditor";
import { PasswordEditor } from "./PasswordEditor";
import "./admin.css";

export default function Admin() {
  const [accessMode, setAccessMode] = useState(false);
  const [section, setSection] = useState<"prices" | "gallery" | "contacts" | "security">("prices");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [contactsModel, setContactsModel] = useState<ContactsModel | null>(null);
  const [contactsBusy, setContactsBusy] = useState(false);
  const contactsDirty = !!contactsModel && JSON.stringify(contactsModel.draft.contacts) !== JSON.stringify(contactsModel.published.contacts);
  const [galleryModel, setGalleryModel] = useState<GalleryModel | null>(null);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const galleryDirty = !!galleryModel && JSON.stringify(galleryModel.draft.items) !== JSON.stringify(galleryModel.published.items);
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [published, setPublished] = useState<PriceDocument | null>(null);
  const [draft, setDraft] = useState<PriceDocument | null>(null);
  const [category, setCategory] = useState("nails");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [conflict, setConflict] = useState(false);
  const dirty =
    !!published &&
    JSON.stringify(draft?.prices) !== JSON.stringify(published.prices);
  const invalid =
    draft &&
    Object.values(draft.prices).some(
      (item) =>
        !validPrice(item.summary, true) ||
        item.items.some((entry) => !validPrice(entry.price)),
    );

  useEffect(() => {
    document.title = "Керування студією — Beauty Space Victoriya";
    let active = true;
    api<{ mode: string }>("/api/auth/config")
      .then((config) => { if (active) setAccessMode(config.mode === "access"); return api("/api/admin/session"); })
      .then(() => api<PriceDocument>("/api/prices"))
      .then((value) => {
        if (active) {
          setAuthenticated(true);
          setPublished(value);
          setDraft(structuredClone(value));
        }
      })
      .catch((cause) => {
        if (active && (!(cause instanceof ApiError) || cause.status !== 401))
          setError(
            "Сервер недоступний. Перевір підключення та спробуй увійти ще раз.",
          );
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!dirty && !galleryDirty && !galleryBusy && !contactsDirty && !contactsBusy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, galleryDirty, galleryBusy, contactsDirty, contactsBusy]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      if (!draft) {
        const value = await api<PriceDocument>("/api/prices");
        setPublished(value);
        setDraft(structuredClone(value));
      }
      setAuthenticated(true);
      setPasswordChanged(false);
      setPassword("");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Не вдалося увійти. Перевір підключення.",
      );
    } finally {
      setBusy(false);
    }
  }

  function update(value: string, index?: number) {
    setDraft((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      if (index === undefined) next.prices[category].summary = value;
      else next.prices[category].items[index].price = value;
      return next;
    });
    setSaved(false);
    setConfirmDiscard(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || invalid || !dirty) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const value = await api<PriceDocument>("/api/admin/prices", {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      setPublished(value);
      setDraft(structuredClone(value));
      setSaved(true);
      setConflict(false);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401)
        setAuthenticated(false);
      if (cause instanceof ApiError && cause.status === 409) setConflict(true);
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Зміни не збережено. Перевір підключення та спробуй ще раз.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    setBusy(true);
    try {
      const value = await api<PriceDocument>("/api/prices");
      setPublished(value);
      setDraft(structuredClone(value));
      setError("");
      setConflict(false);
      setSaved(false);
      setConfirmDiscard(false);
    } catch {
      setError(
        "Не вдалося завантажити прайс. Твоя чернетка збережена у цій вкладці.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (accessMode) { window.location.assign("/cdn-cgi/access/logout"); return; }
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/logout", { method: "POST" });
      setAuthenticated(false);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401)
        setAuthenticated(false);
      else setError("Не вдалося вийти. Спробуй ще раз.");
    } finally {
      setBusy(false);
    }
  }

  if (checking)
    return (
      <main className="admin-loading" role="status">
        Відкриваємо твій простір…
      </main>
    );

  if (!authenticated)
    return (
      <main className="admin-login">
        <a href="/" className="admin-back">
          <ArrowLeft size={16} /> На сайт
        </a>
        <div className="login-card">
          <div className="admin-mark"><BrandStar /></div>
          <p className="admin-eyebrow">BEAUTY SPACE · ДЛЯ ВЛАСНИЦІ</p>
          <h1>
            Твій простір.
            <br />
            <em>Твої правила.</em>
          </h1>
          <p className="login-intro">Увійди, щоб оновити ціни, фото робіт і контакти.</p>
          {passwordChanged && <p className="admin-success" role="status">Пароль змінено. Увійди з новим паролем.</p>}
          {accessMode ? <div>
            <p className="login-intro">Підтвердь свою пошту кодом через захищений вхід. Після підтвердження повернися в цю вкладку — чернетки залишаться тут.</p>
            <a className="button" href="/admin" target="_blank" rel="noopener noreferrer">Підтвердити пошту <ArrowUpRight size={18} /></a>
            <button className="admin-secondary" disabled={busy} onClick={async () => {
              setBusy(true); setError("");
              try {
                await api("/api/admin/session");
                if (!draft) { const value = await api<PriceDocument>("/api/prices"); setPublished(value); setDraft(structuredClone(value)); }
                setAuthenticated(true);
              } catch { setError("Спочатку підтвердь вхід своєю дозволеною поштою."); }
              finally { setBusy(false); }
            }}>Я підтвердив(-ла) вхід</button>
            {error && <p className="admin-error" role="alert">{error}</p>}
          </div> : <form onSubmit={login}>
            <label htmlFor="admin-password">Пароль</label>
            <div className="password-wrap">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                maxLength={256}
                disabled={busy}
              />
              <button
                type="button"
                aria-label={
                  showPassword ? "Приховати пароль" : "Показати пароль"
                }
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            <button className="button admin-login-button" disabled={busy}>
              {busy ? "Входимо…" : "Увійти в адмінку"}
              <ArrowUpRight size={18} />
            </button>
          </form>}
          <p className="login-footnote">
            <LockKeyhole size={13} /> Доступ лише для керування студією
          </p>
        </div>
      </main>
    );

  const selected = services.find((item) => item.id === category)!;
  const changedCount =
    draft && published
      ? services.reduce(
          (count, service) =>
            count +
            Number(
              draft.prices[service.id].summary !==
                published.prices[service.id].summary,
            ) +
            draft.prices[service.id].items.filter(
              (item, index) =>
                item.price !== published.prices[service.id].items[index].price,
            ).length,
          0,
        )
      : 0;

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-brand"
        >
          beauty space <span><BrandStar /></span>
          <small>КЕРУВАННЯ СТУДІЄЮ</small>
        </a>
        <div className="admin-header-actions">
          <a href="/#services" target="_blank" rel="noopener noreferrer">
            Відкрити сайт <ArrowUpRight size={16} />
          </a>
          <button onClick={logout} disabled={busy || dirty || galleryBusy || galleryDirty || contactsBusy || contactsDirty || passwordBusy} title={dirty || galleryDirty || contactsDirty ? "Опублікуй або скасуй зміни перед виходом" : undefined}>
            <LogOut size={16} /> Вийти
          </button>
        </div>
      </header>
      <main className="admin-main">
        <nav className="admin-sections" aria-label="Розділи керування">
          <button type="button" aria-pressed={section === "prices"} onClick={() => setSection("prices")}>Ціни{dirty ? " •" : ""}</button>
          <button type="button" aria-pressed={section === "gallery"} onClick={() => setSection("gallery")}>Роботи{galleryDirty ? " •" : ""}</button>
          <button type="button" aria-pressed={section === "contacts"} onClick={() => setSection("contacts")}>Контакти{contactsDirty ? " •" : ""}</button>
          <button type="button" aria-pressed={section === "security"} onClick={() => setSection("security")}>Безпека</button>
        </nav>
        <div hidden={section !== "security"}>
          {accessMode ? <section className="admin-page-heading"><div><h1>Захищений <em>доступ.</em></h1><p>Вхід за одноразовим кодом на дозволену пошту. Пароль для цього сайту не потрібен.</p><p>Щоб змінити список людей із доступом, звернися до власника сайту.</p></div></section> : <PasswordEditor hasDrafts={dirty || galleryDirty || contactsDirty} busy={passwordBusy || busy || galleryBusy || contactsBusy} onBusy={setPasswordBusy} onSessionExpired={() => setAuthenticated(false)} onChanged={() => { setPasswordChanged(true); setError(""); setPassword(""); setAuthenticated(false); }} />}
        </div>
        <div hidden={section !== "contacts"}>
          <ContactsEditor model={contactsModel} onChange={setContactsModel} busy={contactsBusy} onBusy={setContactsBusy} onSessionExpired={() => setAuthenticated(false)} />
        </div>
        <div hidden={section !== "gallery"}>
          <GalleryEditor optimizeUploads={accessMode} model={galleryModel} onChange={setGalleryModel} busy={galleryBusy} onBusy={setGalleryBusy} onSessionExpired={() => setAuthenticated(false)} />
        </div>
        <div hidden={section !== "prices"}>
        <div className="admin-page-heading">
          <div>
            <p className="admin-eyebrow">УСЕ ПІД ТВОЇМ КОНТРОЛЕМ</p>
            <h1>
              Послуги <em>та ціни.</em>
            </h1>
            <p>Оновлюй прайс — збережені зміни одразу доступні на сайті.</p>
          </div>
          <span className="admin-status">
            <span />
            {dirty ? "Є незбережені зміни" : "Прайс опубліковано"}
          </span>
        </div>
        {error && (
          <div className="admin-error" role="alert">
            <CircleAlert size={18} />
            <span>{error}</span>
          </div>
        )}
        {saved && (
          <p role="status" className="admin-success">
            <Check size={18} /> Зміни збережено й опубліковано.
          </p>
        )}
        <form onSubmit={save}>
          <fieldset disabled={busy} className="admin-workspace">
            <nav className="admin-categories" aria-label="Категорії послуг">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  className={cn(
                    "category-button",
                    category === service.id && "active",
                  )}
                  aria-current={category === service.id ? "true" : undefined}
                  onClick={() => setCategory(service.id)}
                >
                  <span>{service.number}</span>
                  {service.name}
                  <small>{draft?.prices[service.id].items.length}</small>
                </button>
              ))}
            </nav>
            {draft && (
              <section
                className="admin-editor"
                aria-labelledby="category-title"
              >
                <div className="editor-heading">
                  <div>
                    <p className="admin-eyebrow">{selected.english}</p>
                    <h2 id="category-title">{selected.name}</h2>
                  </div>
                  <span>{draft.prices[category].items.length} позицій</span>
                </div>
                <div className="summary-field">
                  <div>
                    <label htmlFor="summary-price">
                      Ціна на картці категорії
                    </label>
                    <p>
                      Наприклад: від 550 грн. Онови її, якщо змінюєш початкову
                      вартість.
                    </p>
                  </div>
                  <div>
                    <input
                      id="summary-price"
                      value={draft.prices[category].summary}
                      maxLength={40}
                      aria-invalid={
                        !validPrice(draft.prices[category].summary, true)
                      }
                      aria-describedby="summary-hint"
                      onChange={(event) => update(event.target.value)}
                    />
                    <small id="summary-hint">
                      {!validPrice(draft.prices[category].summary, true)
                        ? "Вкажи суму від 1 до 100 000 грн."
                        : "Відображається перед розкриттям прайсу"}
                    </small>
                  </div>
                </div>
                <div className="editor-table-head">
                  <span>ПОСЛУГА</span>
                  <span>ВАРТІСТЬ</span>
                </div>
                {draft.prices[category].items.map((item, index) => (
                  <div className="admin-price-row" key={`${category}-${index}`}>
                    <div>
                      <label htmlFor={`price-${category}-${index}`}>
                        {item.name}
                      </label>
                      {item.detail && <p>{item.detail}</p>}
                    </div>
                    <div>
                      <input
                        id={`price-${category}-${index}`}
                        value={item.price}
                        maxLength={40}
                        aria-invalid={!validPrice(item.price)}
                        aria-describedby={`hint-${category}-${index}`}
                        onChange={(event) => update(event.target.value, index)}
                      />
                      <small id={`hint-${category}-${index}`}>
                        {!validPrice(item.price)
                          ? "Приклад: 550 грн або 50/70 грн."
                          : "грн · можна вказати 50/70 грн"}
                      </small>
                    </div>
                  </div>
                ))}
                {draft.prices[category].note && (
                  <p className="editor-note">{draft.prices[category].note}</p>
                )}
              </section>
            )}
          </fieldset>
          <div className="admin-savebar">
            <div>
              <strong>
                {changedCount
                  ? `Змінено полів: ${changedCount}`
                  : "Усі зміни збережено"}
              </strong>
              <span>
                {published &&
                  `Останнє збереження: ${new Date(published.updatedAt).toLocaleString("uk-UA", { dateStyle: "medium", timeStyle: "short" })}`}
              </span>
            </div>
            <div className="save-actions">
              <button
                type="button"
                className="admin-secondary"
                disabled={busy || (!dirty && !conflict)}
                onClick={() => setConfirmDiscard(true)}
              >
                <RotateCcw size={16} /> Скасувати зміни
              </button>
              <button
                className="button"
                disabled={busy || !dirty || !!invalid || conflict}
              >
                <Save size={16} />
                {busy ? "Зберігаємо…" : "Зберегти зміни"}
              </button>
            </div>
            {invalid && (
              <p className="admin-validation" role="status">
                Перевір формат цін у категоріях:{" "}
                {services
                  .filter(
                    (service) =>
                      draft &&
                      (!validPrice(draft.prices[service.id].summary, true) ||
                        draft.prices[service.id].items.some(
                          (item) => !validPrice(item.price),
                        )),
                  )
                  .map((service) => service.name)
                  .join(", ")}
                .
              </p>
            )}
            {confirmDiscard && (
              <div className="discard-confirm" role="alert">
                <p>Скасувати чернетку й завантажити опубліковані ціни?</p>
                <button type="button" onClick={discard} disabled={busy}>
                  Так, завантажити
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDiscard(false)}
                  disabled={busy}
                >
                  Продовжити редагування
                </button>
              </div>
            )}
          </div>
        </form>
        </div>
      </main>
      <footer className="admin-footer">
        Beauty Space Victoriya · З турботою про твій бізнес
      </footer>
    </div>
  );
}
