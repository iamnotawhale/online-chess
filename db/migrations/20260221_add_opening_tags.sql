-- Add opening tags to puzzles table

ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS opening_tags TEXT;

CREATE INDEX IF NOT EXISTS idx_puzzles_opening_tags ON puzzles(opening_tags);
