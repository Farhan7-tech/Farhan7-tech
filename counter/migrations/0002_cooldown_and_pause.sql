-- Adds the cooldown and owner-pause columns to an existing counters table (already applied to the live DB).
ALTER TABLE counters ADD COLUMN last_at INTEGER;
ALTER TABLE counters ADD COLUMN paused_until INTEGER;
