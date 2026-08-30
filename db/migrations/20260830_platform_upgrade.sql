-- Platform upgrade: presence, challenges, per-TC ratings, puzzle rush, arenas

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

ALTER TABLE games ADD COLUMN IF NOT EXISTS takeback_offered_by_id UUID REFERENCES users(id);

CREATE TABLE IF NOT EXISTS game_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time_control VARCHAR(20) NOT NULL,
  rated BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  game_id VARCHAR(10) REFERENCES games(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_challenges_challenged_status
  ON game_challenges(challenged_id, status);

CREATE TABLE IF NOT EXISTS user_ratings (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1200,
  games_played INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, category)
);

CREATE TABLE IF NOT EXISTS puzzle_rush_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  puzzles_solved INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_puzzle_rush_scores_user_created
  ON puzzle_rush_scores(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS arenas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  time_control VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arena_participants (
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (arena_id, user_id)
);

-- Seed one active arena if none exists
INSERT INTO arenas (id, name, time_control, status, starts_at, ends_at)
SELECT gen_random_uuid(), 'Weekly Blitz Arena', '3+2', 'active',
       NOW() - INTERVAL '1 hour', NOW() + INTERVAL '7 days'
WHERE NOT EXISTS (SELECT 1 FROM arenas WHERE status = 'active');
