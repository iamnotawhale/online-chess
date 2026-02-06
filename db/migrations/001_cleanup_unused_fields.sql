-- Migration: Remove unused fields and tables
-- Date: 2026-02-06
-- Description: Clean up database schema by removing:
--   - matchmaking_queue table (unused, in-memory queue is used instead)
--   - pgn field from games (never used)
--   - fen_final field from games (not needed, fen_current can be used instead)

-- Drop matchmaking_queue table (not used, in-memory queue is used in MatchmakingService)
DROP TABLE IF EXISTS matchmaking_queue CASCADE;

-- Remove pgn column from games (never filled or used)
ALTER TABLE games DROP COLUMN IF EXISTS pgn;

-- Remove fen_final column from games (fen_current can be used instead)
ALTER TABLE games DROP COLUMN IF EXISTS fen_final;

-- Cleanup old indexes if they existed
DROP INDEX IF EXISTS idx_matchmaking_status;
