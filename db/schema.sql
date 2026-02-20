-- ChessOnline Database Schema (MVP)

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(32) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rating INTEGER DEFAULT 1200,
  country VARCHAR(2),
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Stats
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  puzzle_rating INTEGER DEFAULT 1200,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invites
CREATE TABLE invites (
  id VARCHAR(10) PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_mode VARCHAR(20) NOT NULL, -- standard, rapid, blitz, classic, bullet
  time_control VARCHAR(20),
  rated BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_color VARCHAR(10) DEFAULT 'random',
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  accepted_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games
CREATE TABLE games (
  id VARCHAR(10) PRIMARY KEY,
  player_white_id UUID NOT NULL REFERENCES users(id),
  player_black_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(16) DEFAULT 'active', -- active, finished, abandoned
  result VARCHAR(16), -- 1-0 (white win), 0-1 (black win), 1/2-1/2 (draw)
  result_reason VARCHAR(32), -- checkmate, resignation, timeout, stalemate, agreement, abandonment
  time_control VARCHAR(20) NOT NULL, -- format: "5+3" (minutes+increment)
  fen_current TEXT DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  invite_id UUID REFERENCES invites(id),
  white_time_left_ms BIGINT,
  black_time_left_ms BIGINT,
  last_move_at TIMESTAMP,
  draw_offered_by_id UUID REFERENCES users(id),
  rated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP
);

-- Moves
CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id VARCHAR(10) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  san VARCHAR(16) NOT NULL, -- Standard Algebraic Notation
  fen TEXT NOT NULL,
  time_left_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rating History (для графиков)
CREATE TABLE rating_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id VARCHAR(10) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  rating_before INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  rating_change INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Puzzles (from Lichess API)
CREATE TABLE puzzles (
  id VARCHAR(10) PRIMARY KEY,
  fen TEXT NOT NULL,
  moves TEXT NOT NULL, -- Space-separated UCI moves
  rating INTEGER NOT NULL,
  rating_deviation INTEGER,
  themes TEXT, -- Comma-separated theme tags
  opening_tags TEXT, -- Space-separated opening tags from Lichess
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  daily_date TIMESTAMP -- NULL for random puzzles, timestamp for daily puzzles
);

-- User Puzzle Solutions (progress tracking)
CREATE TABLE user_puzzle_solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id VARCHAR(10) NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  solved BOOLEAN DEFAULT FALSE,
  penalty_applied BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, puzzle_id)
);

-- User Lesson Progress (education tracking)
CREATE TABLE user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id VARCHAR(100) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  puzzles_solved INTEGER DEFAULT 0,
  puzzles_total INTEGER NOT NULL,
  viewed_at TIMESTAMP,
  completed_at TIMESTAMP,
  UNIQUE(user_id, lesson_id)
);

-- Puzzle Rating History
CREATE TABLE puzzle_rating_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id VARCHAR(10) NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  rating_before INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  rating_change INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_rating ON users(rating DESC);

CREATE INDEX idx_invites_creator_id ON invites(creator_id);

CREATE INDEX idx_games_player_white ON games(player_white_id);
CREATE INDEX idx_games_player_black ON games(player_black_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_created_at ON games(created_at DESC);

CREATE INDEX idx_moves_game_id ON moves(game_id);
CREATE INDEX idx_moves_game_move ON moves(game_id, move_number);

CREATE INDEX idx_rating_history_user_id ON rating_history(user_id);
CREATE INDEX idx_rating_history_created_at ON rating_history(created_at DESC);

CREATE INDEX idx_puzzles_rating ON puzzles(rating);
CREATE INDEX idx_puzzles_daily_date ON puzzles(daily_date);
CREATE INDEX idx_puzzles_opening_tags ON puzzles(opening_tags);

CREATE INDEX idx_user_puzzle_solutions_user_id ON user_puzzle_solutions(user_id);
CREATE INDEX idx_user_puzzle_solutions_puzzle_id ON user_puzzle_solutions(puzzle_id);

CREATE INDEX idx_user_lesson_progress_user_id ON user_lesson_progress(user_id);
CREATE INDEX idx_user_lesson_progress_category_id ON user_lesson_progress(category_id);
CREATE INDEX idx_user_lesson_progress_completed ON user_lesson_progress(completed);

CREATE INDEX idx_puzzle_rating_history_user_id ON puzzle_rating_history(user_id);
CREATE INDEX idx_puzzle_rating_history_created_at ON puzzle_rating_history(created_at DESC);

-- Trigger для автообновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_stats_updated_at
BEFORE UPDATE ON user_stats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

