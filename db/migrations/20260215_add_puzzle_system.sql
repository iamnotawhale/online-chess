-- Migration: Add puzzle rating system columns
-- Safe migration for existing production data

-- Add puzzle_rating to user_stats
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS puzzle_rating INTEGER;
UPDATE user_stats SET puzzle_rating = 1200 WHERE puzzle_rating IS NULL;
ALTER TABLE user_stats ALTER COLUMN puzzle_rating SET NOT NULL;
ALTER TABLE user_stats ALTER COLUMN puzzle_rating SET DEFAULT 1200;

-- Add penalty_applied to user_puzzle_solutions
ALTER TABLE user_puzzle_solutions ADD COLUMN IF NOT EXISTS penalty_applied BOOLEAN;
UPDATE user_puzzle_solutions SET penalty_applied = FALSE WHERE penalty_applied IS NULL;
ALTER TABLE user_puzzle_solutions ALTER COLUMN penalty_applied SET NOT NULL;
ALTER TABLE user_puzzle_solutions ALTER COLUMN penalty_applied SET DEFAULT FALSE;
