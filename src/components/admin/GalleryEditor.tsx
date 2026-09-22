import { useEffect, useState, type FormEvent } from "react";
import { ImagePlus, Save, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { preparePhoto } from "../../lib/prepare-photo";
import { MAX_GALLERY_ALT_LENGTH, MAX_GALLERY_ITEMS, validGalleryAlt, validInstagram, type GalleryDocument, type GalleryItem } from "../../../shared/gallery";
import { galleryAlt, galleryPhotoDescription } from "../../../shared/gallery-descriptions";

export interface GalleryModel { draft: GalleryDocument; published: GalleryDocument }
interface Props {
  optimizeUploads?: boolean;
  model: GalleryModel | null;
  onChange: (model: GalleryModel) => void;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onSessionExpired: () => void;
}

export function GalleryEditor({ model, onChange, busy, onBusy, onSessionExpired, optimizeUploads = false }: Props) {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const dirty = !!model && JSON.stringify(model.draft.items) !== JSON.stringify(model.published.items);
  const invalid = model?.draft.items.some((item) => !item.title.trim() || !item.label.trim() || !validGalleryAlt(item.alt) || !validInstagram(item.instagram));

  useEffect(() => {
    if (model) return;
    const controller = new AbortController();
    api<GalleryDocument>("/api/gallery", { signal: controller.signal })
      .then((value) => { onChange({ draft: structuredClone(value), published: value }); setError(""); })
      .catch(() => { if (!controller.signal.aborted) setError("Не вдалося завантажити роботи."); });
    return () => controller.abort();
  }, [model, onChange, attempt]);

  function failure(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) onSessionExpired();
    if (cause instanceof ApiError && cause.status === 409) setConflict(true);
    setError(cause instanceof ApiError ? cause.message : "Зміни не збережено. Перевір підключення та спробуй ще раз.");
  }
  function update(index: number, patch: Partial<GalleryItem>) {
    if (!model) return;
    const draft = structuredClone(model.draft);
    Object.assign(draft.items[index], patch);
    onChange({ ...model, draft });
    setSaved(false);
    setConfirmDiscard(false);
  }
  function changeItems(items: GalleryItem[]) {
    if (!model) return;
    onChange({ ...model, draft: { ...model.draft, items } });
    setSaved(false); setConfirmDiscard(false);
  }
  function move(index: number, direction: number) {
    if (!model) return;
    const items = [...model.draft.items];
    [items[index], items[index + direction]] = [items[index + direction], items[index]];
    changeItems(items);
  }
  async function upload(index: number, file?: File) {
    if (!file) return;
    setError(""); setSaved(false);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setError("Обери фото JPG, PNG або WebP розміром до 8 МБ."); return;
    }
    onBusy(true);
    try {
      const photo = optimizeUploads ? await preparePhoto(file) : file;
      const result = await api<{ src: string }>("/api/admin/gallery/upload", { method: "POST", headers: { "Content-Type": photo.type }, body: photo });
      if (index === -1 && model) changeItems([...model.draft.items, { id: `work-${crypto.randomUUID()}`, src: result.src, alt: "", instagram: "", title: "Нова робота", label: "МАНІКЮР" }]);
      else update(index, { src: result.src, alt: "", instagram: "" });
    } catch (cause) { failure(cause); }
    finally { onBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!model || !dirty || invalid || conflict || busy) return;
    onBusy(true); setError(""); setSaved(false);
    try {
      const value = await api<GalleryDocument>("/api/admin/gallery", { method: "PUT", body: JSON.stringify(model.draft) });
      onChange({ draft: structuredClone(value), published: value });
      setSaved(true);
    } catch (cause) { failure(cause); }
    finally { onBusy(false); }
  }
  async function discard() {
    onBusy(true);
    try {
      const value = await api<GalleryDocument>("/api/gallery");
      onChange({ draft: structuredClone(value), published: value });
      setError(""); setConflict(false); setSaved(false); setConfirmDiscard(false);
    } catch (cause) { failure(cause); }
    finally { onBusy(false); }
  }

  return <section aria-label="Керування роботами">
    <div className="admin-page-heading">
      <div><p className="admin-eyebrow">BEAUTY В ДЕТАЛЯХ</p><h1>Твої <em>роботи.</em></h1>
        <p>Заміни фото та підписи. Натисни «Опублікувати роботи», щоб оновити сайт.</p></div>
    </div>
    {error && <p role="alert" className="admin-error">{error}</p>}
    {saved && <p role="status" className="admin-success">Роботи збережено й опубліковано.</p>}
    {!model ? <div role="status">{error ? <button className="admin-secondary" onClick={() => setAttempt((n) => n + 1)}>Спробувати ще раз</button> : "Завантажуємо роботи…"}</div> :
      <form onSubmit={save}>
        <div className="gallery-add">
          <label htmlFor="add-gallery-photo"><ImagePlus size={18} /> Додати роботу ({model.draft.items.length} / {MAX_GALLERY_ITEMS})</label>
          <input id="add-gallery-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || model.draft.items.length >= MAX_GALLERY_ITEMS} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void upload(-1, file); }} />
        </div>
        <fieldset disabled={busy} className="gallery-admin-grid">
          {model.draft.items.map((item, index) => <article className="gallery-admin-card" key={item.id}>
            <div className="gallery-admin-preview"><img src={item.src} alt={galleryAlt(item)} /><span>{String(index + 1).padStart(2, "0")}</span></div>
            <div className="gallery-admin-fields">
              <div className="gallery-item-actions">
                <button type="button" className="icon-button" aria-label={`Перемістити роботу ${index + 1} раніше`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={18} /></button>
                <button type="button" className="icon-button" aria-label={`Перемістити роботу ${index + 1} далі`} disabled={index === model.draft.items.length - 1} onClick={() => move(index, 1)}><ArrowDown size={18} /></button>
                <button type="button" className="icon-button" aria-label={`Видалити роботу ${index + 1}`} disabled={model.draft.items.length === 1} onClick={() => changeItems(model.draft.items.filter((work) => work.id !== item.id))}><Trash2 size={18} /></button>
              </div>
              <label className="gallery-upload" htmlFor={`upload-${item.id}`}><ImagePlus size={18} /> Замінити фото {index + 1}</label>
              <input id={`upload-${item.id}`} type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="gallery-upload-hint"
                onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void upload(index, file); }} />
              <label htmlFor={`title-${item.id}`}>Назва роботи {index + 1}</label>
              <input id={`title-${item.id}`} value={item.title} maxLength={100} required onChange={(event) => update(index, { title: event.target.value })} />
              <label htmlFor={`label-${item.id}`}>Категорія / підпис {index + 1}</label>
              <input id={`label-${item.id}`} value={item.label} maxLength={60} required onChange={(event) => update(index, { label: event.target.value })} />
              <label htmlFor={`alt-${item.id}`}>Опис фото {index + 1} <small>необов’язково</small></label>
              <textarea id={`alt-${item.id}`} value={item.alt ?? galleryPhotoDescription(item.src) ?? ""} rows={3} maxLength={MAX_GALLERY_ALT_LENGTH}
                aria-describedby={`alt-hint-${item.id}`} aria-invalid={!validGalleryAlt(item.alt)} onChange={(event) => update(index, { alt: event.target.value })} />
              <small className="gallery-description-hint" id={`alt-hint-${item.id}`}>Коротко опиши, що видно на фото: процедуру, колір і дизайн. Цей текст допомагає людям, які користуються читачем екрана. До {MAX_GALLERY_ALT_LENGTH} символів.</small>
              <label htmlFor={`instagram-${item.id}`}>Instagram роботи {index + 1} <small>необов’язково</small></label>
              <input id={`instagram-${item.id}`} type="url" value={item.instagram} maxLength={300} placeholder="https://www.instagram.com/p/…" aria-invalid={!validInstagram(item.instagram)}
                onChange={(event) => update(index, { instagram: event.target.value.trim() })} />
              {!validInstagram(item.instagram) && <small className="admin-validation">Вкажи посилання на допис або Reel в Instagram.</small>}
            </div>
          </article>)}
        </fieldset>
        <p className="gallery-upload-hint" id="gallery-upload-hint">JPG, PNG або WebP · до 8 МБ. Після заміни фото додай його опис і посилання на відповідний допис, якщо він є.</p>
        <div className="admin-savebar">
          <div><strong role="status">{busy ? "Обробляємо…" : dirty ? "Є неопубліковані зміни" : "Усі роботи опубліковано"}</strong><span>Завантаження фото не змінює сайт до публікації.</span></div>
          <div className="save-actions">
            <button type="button" className="admin-secondary" disabled={busy || (!dirty && !conflict)} onClick={() => setConfirmDiscard(true)}>Скасувати зміни робіт</button>
            <button className="button" disabled={busy || !dirty || invalid || conflict}><Save size={16} /> Опублікувати роботи</button>
          </div>
          {confirmDiscard && <div className="discard-confirm" role="alert"><p>Скасувати чернетку й завантажити опубліковані роботи?</p><button type="button" disabled={busy} onClick={discard}>Так, завантажити роботи</button><button type="button" disabled={busy} onClick={() => setConfirmDiscard(false)}>Продовжити редагування</button></div>}
        </div>
      </form>}
  </section>;
}
