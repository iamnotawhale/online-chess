-- Добавить таблицу для отслеживания прогресса в обучении

CREATE TABLE IF NOT EXISTS user_lesson_progress (
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

-- Индексы для производительности
CREATE INDEX idx_user_lesson_progress_user_id ON user_lesson_progress(user_id);
CREATE INDEX idx_user_lesson_progress_category_id ON user_lesson_progress(category_id);
CREATE INDEX idx_user_lesson_progress_completed ON user_lesson_progress(completed);
