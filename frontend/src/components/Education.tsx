import React, { useState, useEffect } from 'react';
import lessonsData from '../data/lessons.json';
import './Education.css';

interface Lesson {
  id: string;
  title: string;
  order: number;
  description: string;
  puzzle_themes: string[];
  puzzle_limit: number;
}

interface Subtopic {
  id: string;
  name: string;
  opening: string;
  icon: string;
  elo_range: string;
  description: string;
  puzzles_count: number;
  lessons: Lesson[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  subtopics: Subtopic[];
}

export const Education: React.FC = () => {
  const [selectedSubtopic, setSelectedSubtopic] = useState<Subtopic | null>(null);
  const [userProgress, setUserProgress] = useState<Record<string, number>>({});

  const category: Category = lessonsData.categories[0];

  useEffect(() => {
    // Загрузить прогресс пользователя
    const progress: Record<string, number> = {};
    category.subtopics.forEach(st => {
      progress[st.opening] = Math.floor(Math.random() * 100); // Mock data
    });
    setUserProgress(progress);
  }, [category]);

  if (!selectedSubtopic) {
    return (
      <div className="education-container">
        <div className="education-header">
          <div className="header-info">
            <h1>📚 {category.name}</h1>
            <p>{category.description}</p>
          </div>
        </div>

        <div className="education-grid">
          {category.subtopics.map(subtopic => (
            <div
              key={subtopic.id}
              className="subtopic-card"
              onClick={() => setSelectedSubtopic(subtopic)}
            >
              <div className="card-header">
                <span className="icon">{subtopic.icon}</span>
                <h3>{subtopic.name}</h3>
              </div>

              <p className="card-opening">{subtopic.opening.replace(/_/g, ' ')}</p>
              <p className="card-description">{subtopic.description}</p>

              <div className="card-stats">
                <span className="stat">📖 {subtopic.puzzles_count.toLocaleString()} пазлов</span>
                <span className="stat">⭐ {subtopic.elo_range}</span>
              </div>

              <div className="progress-wrapper">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${userProgress[subtopic.opening] || 0}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {userProgress[subtopic.opening] || 0}% пройдено
                </span>
              </div>

              <button className="card-btn">Начать обучение →</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="education-container">
      <button
        className="back-btn"
        onClick={() => setSelectedSubtopic(null)}
      >
        ← Назад к дебютам
      </button>

      <div className="lesson-header">
        <h1>
          <span className="icon">{selectedSubtopic.icon}</span>
          {selectedSubtopic.name}
        </h1>
        <p>{selectedSubtopic.description}</p>
      </div>

      <div className="lessons-wrapper">
        <div className="lessons-sidebar">
          <div className="sidebar-info">
            <h3>🎯 Прогресс</h3>
            <p>Пазлов в уроках: {selectedSubtopic.puzzles_count.toLocaleString()}</p>
            <p>Уроков: {selectedSubtopic.lessons.length}</p>
          </div>

          <div className="lessons-list">
            <h3>📝 Уроки</h3>
            {selectedSubtopic.lessons.map(lesson => (
              <div
                key={lesson.id}
                className="lesson-item"
              >
                <div className="lesson-order">{lesson.order}</div>
                <div className="lesson-content">
                  <h4>{lesson.title}</h4>
                  <p>{lesson.description}</p>
                  <div className="lesson-themes">
                    {lesson.puzzle_themes.map(theme => (
                      <span key={theme} className="theme-tag">{theme}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lessons-main">
          <div className="mini-board-placeholder">
            <div className="placeholder-text">
              ♔ ♕ ♖ ♗ ♘ ♙
            </div>
            <p>Интерактивная доска (скоро)</p>
          </div>

          <div className="lesson-content-text">
            <h2>Основы {selectedSubtopic.name}</h2>
            <p>
              {selectedSubtopic.name} — {selectedSubtopic.description}
            </p>

            <div className="lesson-action">
              <button className="btn-primary">
                ▶️ Начать тренировку пазлов ({selectedSubtopic.lessons[0].puzzle_limit} задач)
              </button>
              <button className="btn-secondary">
                📖 Читать детально
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
