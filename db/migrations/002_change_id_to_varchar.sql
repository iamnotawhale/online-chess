-- Миграция для изменения ID с UUID на VARCHAR(10)

-- Удаляем зависимые таблицы
DROP TABLE IF EXISTS rating_history CASCADE;
DROP TABLE IF EXISTS moves CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS invites CASCADE;

-- Создаем invites с новым ID
CREATE TABLE invites (
  id VARCHAR(10) PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_mode VARCHAR(20) NOT NULL,
  time_control VARCHAR(20),
  rated BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_color VARCHAR(10) DEFAULT 'random',
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  accepted_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создаем games с новым ID  
CREATE TABLE games (
  id VARCHAR(10) PRIMARY KEY,
  player_white_id UUID NOT NULL REFERENCES users(id),
  player_black_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(16) DEFAULT 'active',
  result VARCHAR(16),
  result_reason VARCHAR(32),
  time_control VARCHAR(20) NOT NULL,
  fen_current TEXT DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  invite_id VARCHAR(10) REFERENCES invites(id),
  white_time_left_ms BIGINT,
  black_time_left_ms BIGINT,
  last_move_at TIMESTAMP,
  draw_offered_by_id UUID REFERENCES users(id),
  rated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP
);

-- Создаем moves с новым game_id
CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id VARCHAR(10) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  san VARCHAR(16) NOT NULL,
  fen TEXT NOT NULL,
  time_left_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создаем rating_history с новым game_id
CREATE TABLE rating_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id VARCHAR(10) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  rating_before INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  rating_change INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создаем индексы
CREATE INDEX idx_invites_creator_id ON invites(creator_id);

CREATE INDEX idx_games_player_white ON games(player_white_id);
CREATE INDEX idx_games_player_black ON games(player_black_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_created_at ON games(created_at DESC);

CREATE INDEX idx_moves_game_id ON moves(game_id);
CREATE INDEX idx_moves_game_move ON moves(game_id, move_number);

CREATE INDEX idx_rating_history_user_id ON rating_history(user_id);
CREATE INDEX idx_rating_history_created_at ON rating_history(created_at DESC);
