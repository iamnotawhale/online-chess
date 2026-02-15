-- Fix migration: remove extra Hibernate auto-generated columns from user_puzzle_solutions
-- These columns (attempts, solved_at, time_spent_seconds) were added by Hibernate's ddl-auto
-- but are not defined in the actual entity, causing constraint violations

ALTER TABLE user_puzzle_solutions DROP COLUMN IF EXISTS attempts;
ALTER TABLE user_puzzle_solutions DROP COLUMN IF EXISTS solved_at;
ALTER TABLE user_puzzle_solutions DROP COLUMN IF EXISTS time_spent_seconds;
