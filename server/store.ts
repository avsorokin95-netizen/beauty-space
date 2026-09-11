import { DatabaseSync } from "node:sqlite";
import { prices as initialPrices } from "../src/data/prices.ts";
import {
  validPrice,
  normalizePrice,
  type PriceDocument,
} from "../shared/pricing.ts";

export class PricingStore {
  db: DatabaseSync;

  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS revisions (
        revision INTEGER PRIMARY KEY, updated_at TEXT NOT NULL, prices TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);`);
    if (!this.db.prepare("PRAGMA table_info(sessions)").all().some((column) => column.name === "credential_hash")) {
      this.db.exec("ALTER TABLE sessions ADD COLUMN credential_hash TEXT NOT NULL DEFAULT ''");
    }
    this.db
      .prepare("INSERT OR IGNORE INTO revisions VALUES (1, ?, ?)")
      .run(new Date().toISOString(), JSON.stringify(initialPrices));
  }

  read(): PriceDocument {
    const row = this.db
      .prepare("SELECT * FROM revisions ORDER BY revision DESC LIMIT 1")
      .get()!;
    return {
      revision: Number(row.revision),
      updatedAt: String(row.updated_at),
      prices: JSON.parse(String(row.prices)),
    };
  }

  save(input: unknown): PriceDocument {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const current = this.read();
      if (
        !input ||
        typeof input !== "object" ||
        !("revision" in input) ||
        !("prices" in input)
      )
        throw new Error("validation");
      if (input.revision !== current.revision) throw new Error("conflict");
      const incoming = input.prices as PriceDocument["prices"];
      const keys = Object.keys(current.prices);
      if (
        !incoming ||
        typeof incoming !== "object" ||
        Object.keys(incoming).length !== keys.length
      )
        throw new Error("validation");
      for (const id of keys) {
        const category = incoming[id];
        const stored = current.prices[id];
        if (
          !category ||
          !validPrice(category.summary, true) ||
          !Array.isArray(category.items) ||
          category.items.length !== stored.items.length
        )
          throw new Error("validation");
        stored.summary = normalizePrice(category.summary);
        stored.items.forEach((item, index) => {
          const value = category.items[index]?.price;
          if (!validPrice(value)) throw new Error("validation");
          item.price = normalizePrice(value);
        });
      }
      const document = {
        ...current,
        revision: current.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      this.db
        .prepare("INSERT INTO revisions VALUES (?, ?, ?)")
        .run(
          document.revision,
          document.updatedAt,
          JSON.stringify(document.prices),
        );
      this.db.exec("COMMIT");
      return document;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}
