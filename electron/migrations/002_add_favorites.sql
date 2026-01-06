-- Migration 002: Add favorites support
ALTER TABLE history ADD COLUMN is_favorite INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_is_favorite ON history(is_favorite);

