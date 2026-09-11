CREATE TABLE documents (
  kind TEXT PRIMARY KEY CHECK (kind IN ('prices', 'contacts', 'gallery')),
  revision INTEGER NOT NULL CHECK (revision > 0),
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data))
);
