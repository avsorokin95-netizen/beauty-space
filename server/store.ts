import { DatabaseSync } from "node:sqlite";
import { prices as initialPrices } from "../src/data/prices.ts";
import {
  validatePrices,
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
      current.prices = validatePrices(input.prices, current.prices);
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
