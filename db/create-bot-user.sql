-- Create bot user for playing against computer
-- Run this with: psql -U chess -d chessonline -h localhost -p 5433 -f create-bot-user.sql

-- Delete bot user if it exists (to avoid conflicts)
DELETE FROM user_stats WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000001';

-- Create bot user
INSERT INTO users (id, username, email, password_hash, rating, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'StockfishBot',
    'bot@chessonline.app',
    '',
    1600,
    NOW(),
    NOW()
);

-- Create bot user stats
INSERT INTO user_stats (user_id, wins, losses, draws, total_games, games_played, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    0,
    0,
    0,
    0,
    0,
    NOW()
);

-- Verify bot user was created
SELECT id, username, email, rating FROM users WHERE id = '00000000-0000-0000-0000-000000000001';
