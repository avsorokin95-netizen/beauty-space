import type { Express } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { studio } from '../src/data/studio.ts';
import { contactFields, validContact, type ContactData, type ContactDocument } from '../shared/contacts.ts';

export function registerContacts(app: Express, db: DatabaseSync) {
  db.exec('CREATE TABLE IF NOT EXISTS contact_revisions (revision INTEGER PRIMARY KEY, updated_at TEXT NOT NULL, contacts TEXT NOT NULL)');
  const seed = Object.fromEntries(contactFields.map(({ key }) => [key, studio[key]]));
  db.prepare('INSERT OR IGNORE INTO contact_revisions VALUES (1, ?, ?)').run(new Date().toISOString(), JSON.stringify(seed));
  const read = (): ContactDocument => {
    const row = db.prepare('SELECT * FROM contact_revisions ORDER BY revision DESC LIMIT 1').get()!;
    return { revision: Number(row.revision), updatedAt: String(row.updated_at), contacts: JSON.parse(String(row.contacts)) };
  };
  app.get('/api/contacts', (_req, res) => res.json(read()));
  app.put('/api/admin/contacts', (req, res, next) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const current = read();
      const input = req.body;
      if (!input || !Number.isInteger(input.revision) || !input.contacts || typeof input.contacts !== 'object') throw new Error('validation');
      if (input.revision !== current.revision) throw new Error('conflict');
      const contacts = {} as ContactData;
      for (const { key } of contactFields) {
        const value = input.contacts[key];
        if (!validContact(key, value)) throw new Error('validation');
        contacts[key] = value.trim();
      }
      const result = { revision: current.revision + 1, updatedAt: new Date().toISOString(), contacts };
      db.prepare('INSERT INTO contact_revisions VALUES (?, ?, ?)').run(result.revision, result.updatedAt, JSON.stringify(contacts));
      db.exec('COMMIT');
      res.json(result);
    } catch (error) {
      db.exec('ROLLBACK');
      if (error instanceof Error && error.message === 'conflict') res.status(409).json({ message: 'Контакти вже змінено в іншій вкладці. Завантаж актуальну версію.' });
      else if (error instanceof Error && error.message === 'validation') res.status(400).json({ message: 'Перевір телефон, адресу та посилання. Усі поля обов’язкові.' });
      else next(error);
    }
  });
}
