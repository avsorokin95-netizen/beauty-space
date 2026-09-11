import express, { type Express } from "express";
import { type DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { initialGallery } from "../src/data/gallery.ts";
import { MAX_GALLERY_ITEMS, validInstagram, type GalleryDocument, type GalleryItem } from "../shared/gallery.ts";

const mediaName = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export function registerGallery(app: Express, db: DatabaseSync, directory: string) {
  const media = resolve(directory, "media");
  mkdirSync(media, { recursive: true, mode: 0o700 });
  db.exec("CREATE TABLE IF NOT EXISTS gallery_revisions (revision INTEGER PRIMARY KEY, updated_at TEXT NOT NULL, items TEXT NOT NULL)");
  db.prepare("INSERT OR IGNORE INTO gallery_revisions VALUES (1, ?, ?)")
    .run(new Date().toISOString(), JSON.stringify(initialGallery));
  const read = (): GalleryDocument => {
    const row = db.prepare("SELECT * FROM gallery_revisions ORDER BY revision DESC LIMIT 1").get()!;
    return { revision: Number(row.revision), updatedAt: String(row.updated_at), items: JSON.parse(String(row.items)) };
  };
  // Apply this content addition once; subsequent admin deletions stay deleted.
  db.exec("CREATE TABLE IF NOT EXISTS gallery_migrations (name TEXT PRIMARY KEY)");
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const [name, works] of [
      ["expanded-portfolio-v1", initialGallery.slice(3, 6)],
      ["pedicure-portfolio-v1", initialGallery.slice(6, 7)],
    ] as const) {
      if (db.prepare("SELECT name FROM gallery_migrations WHERE name = ?").get(name)) continue;
      const current = read();
      const additions = works.filter((item) => !current.items.some((saved) => saved.id === item.id || saved.src === item.src));
      if (additions.length) db.prepare("INSERT INTO gallery_revisions VALUES (?, ?, ?)").run(current.revision + 1, new Date().toISOString(), JSON.stringify([...current.items, ...additions]));
      db.prepare("INSERT INTO gallery_migrations VALUES (?)").run(name);
    }
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  const validSource = (src: unknown): src is string => {
    if (typeof src !== "string") return false;
    if (initialGallery.some((item) => item.src === src)) return true;
    const name = src.replace(/^\/api\/media\//, "");
    return src === `/api/media/${name}` && mediaName.test(name) && existsSync(join(media, name));
  };
  app.get("/api/gallery", (_req, res) => res.json(read()));
  app.get("/api/media/:name", (req, res) => {
    const name = String(req.params.name);
    if (!mediaName.test(name) || !existsSync(join(media, name))) {
      res.status(404).json({ message: "Фото не знайдено." });
      return;
    }
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.type("webp").sendFile(join(media, name), { dotfiles: "allow" });
  });
  // Registered after the shared /api/admin session guard in app.ts.
  app.post("/api/admin/gallery/upload", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "8mb" }), async (req, res, next) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      res.status(415).json({ message: "Обери фото JPG, PNG або WebP до 8 МБ." });
      return;
    }
    let output: Buffer;
    try {
      const photo = sharp(req.body, { limitInputPixels: 25_000_000, failOn: "warning" });
      const metadata = await photo.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages ?? 1) > 1) throw new Error("format");
      output = await photo.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch {
      res.status(415).json({ message: "Не вдалося прочитати фото. Обери неанімоване JPG, PNG або WebP до 25 мегапікселів." });
      return;
    }
    try {
      const name = `${randomUUID()}.webp`;
      await writeFile(join(media, name), output, { flag: "wx", mode: 0o600 });
      res.status(201).json({ src: `/api/media/${name}` });
    } catch (error) { next(error); }
  });
  app.put("/api/admin/gallery", (req, res, next) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const current = read();
      if (!req.body || !Number.isInteger(req.body.revision) || !Array.isArray(req.body.items)) throw new Error("validation");
      if (req.body.revision !== current.revision) throw new Error("conflict");
      if (req.body.items.length < 1 || req.body.items.length > MAX_GALLERY_ITEMS) throw new Error("validation");
      const ids = new Set<string>();
      const items: GalleryItem[] = req.body.items.map((item: GalleryItem) => {
        if (!item || typeof item.id !== "string" || !/^work-[A-Za-z0-9-]{1,64}$/.test(item.id) || ids.has(item.id) || !validSource(item.src) ||
          typeof item.title !== "string" || !item.title.trim() || item.title.length > 100 ||
          typeof item.label !== "string" || !item.label.trim() || item.label.length > 60 || !validInstagram(item.instagram)) throw new Error("validation");
        ids.add(item.id);
        return { id: item.id, src: item.src, title: item.title.trim(), label: item.label.trim(), instagram: item.instagram };
      });
      const document = { revision: current.revision + 1, updatedAt: new Date().toISOString(), items };
      db.prepare("INSERT INTO gallery_revisions VALUES (?, ?, ?)").run(document.revision, document.updatedAt, JSON.stringify(items));
      db.exec("COMMIT");
      res.json(document);
    } catch (error) {
      db.exec("ROLLBACK");
      if (error instanceof Error && error.message === "conflict") res.status(409).json({ message: "Роботи вже змінено в іншій вкладці. Завантаж опубліковану версію." });
      else if (error instanceof Error && error.message === "validation") res.status(400).json({ message: "Перевір фото, підписи та посилання на дописи Instagram." });
      else next(error);
    }
  });
}
