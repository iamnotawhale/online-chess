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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invites
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(16) UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time_control VARCHAR(16) NOT NULL, -- blitz, rapid, classical
  minutes INTEGER NOT NULL,
  increment_sec INTEGER DEFAULT 0,
  status VARCHAR(16) DEFAULT 'active', -- active, used, expired
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- Games
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_white_id UUID NOT NULL REFERENCES users(id),
  player_black_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(16) DEFAULT 'active', -- active, finished, abandoned
  result VARCHAR(16), -- white_win, black_win, draw
  result_reason VARCHAR(32), -- checkmate, resignation, timeout, stalemate, agreement
  time_control VARCHAR(16) NOT NULL,
  minutes INTEGER NOT NULL,
  increment_sec INTEGER DEFAULT 0,
  pgn TEXT,
  fen_final TEXT,
  invite_id UUID REFERENCES invites(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP
);

-- Moves
CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
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
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  rating_before INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  rating_change INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matchmaking Queue
CREATE TABLE matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time_control VARCHAR(16) NOT NULL,
  minutes INTEGER NOT NULL,
  increment_sec INTEGER DEFAULT 0,
  rating_min INTEGER,
  rating_max INTEGER,
  status VARCHAR(16) DEFAULT 'waiting', -- waiting, matched, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, status)
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_rating ON users(rating DESC);

CREATE INDEX idx_invites_code ON invites(code);
CREATE INDEX idx_invites_host_id ON invites(host_id);
CREATE INDEX idx_invites_status ON invites(status);

CREATE INDEX idx_games_player_white ON games(player_white_id);
CREATE INDEX idx_games_player_black ON games(player_black_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_created_at ON games(created_at DESC);

CREATE INDEX idx_moves_game_id ON moves(game_id);
CREATE INDEX idx_moves_game_move ON moves(game_id, move_number);

CREATE INDEX idx_rating_history_user_id ON rating_history(user_id);
CREATE INDEX idx_rating_history_created_at ON rating_history(created_at DESC);

CREATE INDEX idx_matchmaking_status ON matchmaking_queue(status, time_control, rating_min, rating_max);

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
