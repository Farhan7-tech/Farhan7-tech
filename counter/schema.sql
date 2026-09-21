CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  last_at INTEGER,       -- ms timestamp of the last view that was counted (cooldown)
  paused_until INTEGER   -- ms timestamp; no views are counted before this (owner pause link)
);
INSERT OR IGNORE INTO counters (name, n) VALUES ('profile', 0);
