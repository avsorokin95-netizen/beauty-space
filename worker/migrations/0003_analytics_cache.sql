-- Last successful Cloudflare report, shared across all admin sessions.
CREATE TABLE IF NOT EXISTS analytics_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value TEXT NOT NULL
);
