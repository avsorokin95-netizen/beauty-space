import type { ServicePricing } from '../../data/prices';
import { categoryContent, validPrice } from '../../../shared/pricing';

export function ServiceCopyEditor({ value, category, onChange }: { value: ServicePricing; category: string; onChange: (value: ServicePricing) => void }) {
  const content = categoryContent(value, category);
  return <div className="service-copy-editor">
    <p>Тексти, назви та ціни публікуються разом на всіх сторінках. Перші дві позиції прайсу також показуються на першому екрані відповідної послуги.</p>
    <div className="summary-field">
      <div><label htmlFor="summary-price">Ціна категорії</label><p>Наприклад: від 550 грн. Показується в розгорнутому прайсі окремо від цін конкретних процедур.</p></div>
      <div><input id="summary-price" value={value.summary} maxLength={40} aria-invalid={!validPrice(value.summary, true)} aria-describedby="summary-hint" onChange={(event) => onChange({ ...value, summary: event.target.value })} />
        <small id="summary-hint">{!validPrice(value.summary, true) ? 'Вкажи суму від 1 до 100 000 грн.' : 'Онови разом із цінами послуг, якщо потрібно.'}</small></div>
    </div>
    {(['overview', 'booking', 'note'] as const).map((key) => <div key={key}>
      <label htmlFor={`copy-${key}`}>{({ overview: 'Опис та вибір процедури', booking: 'Що повідомити перед записом', note: 'Примітка до прайсу' })[key]}</label>
      <textarea id={`copy-${key}`} value={key === 'note' ? value.note ?? '' : content[key]} maxLength={1200} rows={3} onChange={(event) => onChange({ ...value, [key]: event.target.value })} />
    </div>)}
    <details><summary>Редагувати назви та склад послуг</summary>
      {value.items.map((item, index) => <fieldset className="service-item-editor" key={index}>
        <legend>Позиція {index + 1}</legend>
        <label htmlFor={`item-name-${index}`}>Назва послуги {index + 1}</label>
        <input id={`item-name-${index}`} required maxLength={150} value={item.name} onChange={(event) => onChange({ ...value, items: value.items.map((entry, i) => i === index ? { ...entry, name: event.target.value } : entry) })} />
        <label htmlFor={`item-detail-${index}`}>Склад послуги {index + 1}</label>
        <textarea id={`item-detail-${index}`} rows={2} maxLength={600} value={item.detail ?? ''} onChange={(event) => onChange({ ...value, items: value.items.map((entry, i) => i === index ? { ...entry, detail: event.target.value } : entry) })} />
        <button type="button" className="admin-secondary" disabled={value.items.length === 1} onClick={() => onChange({ ...value, items: value.items.filter((_, i) => i !== index) })}>Прибрати позицію {index + 1}</button>
      </fieldset>)}
      <button type="button" className="admin-secondary" disabled={value.items.length >= 30} onClick={() => onChange({ ...value, items: [...value.items, { name: '', price: '' }] })}>Додати послугу</button>
      <p>Перед публікацією доданої послуги заповни її назву й ціну в прайсі нижче. Видалення набуває чинності після збереження.</p>
    </details>
  </div>;
}
