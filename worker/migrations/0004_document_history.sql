-- Additive only. Export the remote D1 database before applying this migration.
-- Existing documents and all analytics tables remain untouched.
CREATE TABLE IF NOT EXISTS document_history (
  kind TEXT NOT NULL,
  revision INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data)),
  PRIMARY KEY (kind, revision)
);
INSERT OR IGNORE INTO document_history SELECT kind, revision, updated_at, data FROM documents;
CREATE TRIGGER IF NOT EXISTS document_history_insert AFTER INSERT ON documents BEGIN
  INSERT OR IGNORE INTO document_history VALUES (NEW.kind, NEW.revision, NEW.updated_at, NEW.data);
END;
CREATE TRIGGER IF NOT EXISTS document_history_update AFTER UPDATE ON documents BEGIN
  INSERT OR IGNORE INTO document_history VALUES (OLD.kind, OLD.revision, OLD.updated_at, OLD.data);
  INSERT OR IGNORE INTO document_history VALUES (NEW.kind, NEW.revision, NEW.updated_at, NEW.data);
END;
CREATE TRIGGER IF NOT EXISTS document_history_delete BEFORE DELETE ON documents BEGIN
  INSERT OR IGNORE INTO document_history VALUES (OLD.kind, OLD.revision, OLD.updated_at, OLD.data);
END;
