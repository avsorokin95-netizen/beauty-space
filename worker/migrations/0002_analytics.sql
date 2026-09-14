-- Only daily aggregate click counts. No visitor identifiers or URLs.
CREATE TABLE IF NOT EXISTS analytics_daily (
  day TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('booking', 'phone', 'instagram', 'telegram', 'directions')),
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event)
);
