import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext';
import { apiService, LessonProgress } from '../api';
import lessonsData from '../data/lessons.json';
import openingTranslations from '../data/openingTranslations.json';
import './Education.css';

const ACTIVE_LESSON_STORAGE_KEY = 'educationActiveLesson';

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
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<Subtopic | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({});

  const categories: Category[] = lessonsData.categories;

  // Helper functions for localized text
  const getCategoryName = (categoryId: string): string => {
    const translations = openingTranslations.categoryNames as any;
    return translations[categoryId]?.[language] || translations[categoryId]?.['ru'] || '';
  };

  const getCategoryDescription = (categoryId: string): string => {
    const translations = openingTranslations.categoryDescriptions as any;
    return translations[categoryId]?.[language] || translations[categoryId]?.['ru'] || '';
  };

  const getOpeningName = (openingTag: string): string => {
    const translations = openingTranslations.openings as any;
    return translations[openingTag]?.[language] || translations[openingTag]?.['ru'] || openingTag;
  };

  const getOpeningDescription = (openingTag: string): string => {
    const translations = openingTranslations.descriptions as any;
    return translations[openingTag]?.[language] || translations[openingTag]?.['ru'] || '';
  };

  useEffect(() => {
    // Restore category and subtopic from localStorage if returning from PuzzleTraining
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(ACTIVE_LESSON_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as any;
          if (parsed?.categoryId && parsed?.subtopicId) {
            const category = categories.find(c => c.id === parsed.categoryId);
            if (category) {
              setSelectedCategory(category);
              const subtopic = category.subtopics.find(s => s.id === parsed.subtopicId);
              if (subtopic) {
                setSelectedSubtopic(subtopic);
              }
            }
          }
        }
      } catch {
        // Ignore errors
      }
    }

    const loadProgress = async () => {
      try {
        const progressList = await apiService.getLessonProgress();
        const progressMap: Record<string, LessonProgress> = {};
        progressList.forEach(item => {
          if (item.lessonId) {
            progressMap[item.lessonId] = item;
          }
        });
        setLessonProgress(progressMap);
      } catch {
        setLessonProgress({});
      }
    };

    loadProgress();
  }, [categories]);

  const updateProgressForLesson = async (
    lesson: Lesson,
    options?: { solved?: number; total?: number; completed?: boolean }
  ) => {
    if (!selectedCategory) {
      return;
    }

    try {
      const payload = {
        lessonId: lesson.id,
        categoryId: selectedCategory.id,
        puzzlesSolved: Math.max(0, options?.solved ?? 0),
        puzzlesTotal: Math.max(0, options?.total ?? lesson.puzzle_limit),
        completed: options?.completed ?? false,
      };
      const saved = await apiService.updateLessonProgress(payload);
      setLessonProgress(prev => ({ ...prev, [saved.lessonId]: saved }));
    } catch {
      // Игнорируем ошибки обновления прогресса, чтобы не ломать UI.
    }
  };

  const setActiveLesson = (lesson: Lesson) => {
    if (!selectedCategory || typeof window === 'undefined') {
      return;
    }

    if (!selectedSubtopic?.opening) {
      return;
    }

    try {
      window.localStorage.setItem(
        ACTIVE_LESSON_STORAGE_KEY,
        JSON.stringify({
          lessonId: lesson.id,
          categoryId: selectedCategory.id,
          subtopicId: selectedSubtopic.id,
          openingTag: selectedSubtopic.opening,
          themes: lesson.puzzle_themes,
          puzzlesTotal: lesson.puzzle_limit,
        })
      );
    } catch {
      // Игнорируем ошибки localStorage.
    }
  };

  const startLessonTraining = async (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setActiveLesson(lesson);
    await updateProgressForLesson(lesson, { total: lesson.puzzle_limit });
    navigate('/puzzles');
  };

  const getSubtopicProgress = (subtopic: Subtopic) => {
    const totals = subtopic.lessons.reduce(
      (acc, lesson) => {
        const progress = lessonProgress[lesson.id];
        const puzzlesTotal = progress?.puzzlesTotal ?? lesson.puzzle_limit;
        const puzzlesSolved = progress?.puzzlesSolved ?? 0;
        return {
          solved: acc.solved + Math.max(0, puzzlesSolved),
          total: acc.total + Math.max(0, puzzlesTotal),
        };
      },
      { solved: 0, total: 0 }
    );

    if (totals.total === 0) {
      return 0;
    }

    return Math.min(100, Math.round((totals.solved / totals.total) * 100));
  };

  // Вид: Выбор категории
  if (!selectedCategory) {
    return (
      <div className="education-container">
        <div className="education-header">
          <div className="header-info">
            <h1>{t('educationTitle')}</h1>
            <p>{t('educationSubtitle')}</p>
          </div>
          <div className="header-stats">
            <div className="stat-badge">
              <span className="badge-value">{categories.length}</span>
              <span className="badge-label">{t('categories')}</span>
            </div>
            <div className="stat-badge">
              <span className="badge-value">{categories.reduce((acc, c) => acc + c.subtopics.length, 0)}</span>
              <span className="badge-label">{t('openings')}</span>
            </div>
            <div className="stat-badge">
              <span className="badge-value">900K+</span>
              <span className="badge-label">{t('puzzles')}</span>
            </div>
          </div>
        </div>

        <div className="categories-grid">
          {categories.map(category => (
            <div
              key={category.id}
              className="category-card"
              onClick={() => setSelectedCategory(category)}
            >
              <div className="category-icon">{category.icon}</div>
              <h3>{getCategoryName(category.id)}</h3>
              <p>{getCategoryDescription(category.id)}</p>
              <div className="category-meta">
                <span>📖 {category.subtopics.length} {t('openingCount')}</span>
                <span>💎 {category.subtopics.reduce((acc, s) => acc + s.puzzles_count, 0).toLocaleString()} {t('puzzleCount')}</span>
              </div>
              <button className="category-btn">{t('explore')}</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Вид: Выбор дебюта в категории
  if (!selectedSubtopic) {
    return (
      <div className="education-container">
        <button
          className="back-btn"
          onClick={() => setSelectedCategory(null)}
        >
          {t('backToCategories')}
        </button>

        <div className="category-header">
          <h1>
            <span className="icon">{selectedCategory.icon}</span>
            {getCategoryName(selectedCategory.id)}
          </h1>
          <p>{getCategoryDescription(selectedCategory.id)}</p>
        </div>

        <div className="openings-grid">
          {selectedCategory.subtopics.map(subtopic => (
            <div
              key={subtopic.id}
              className="subtopic-card"
              onClick={() => setSelectedSubtopic(subtopic)}
            >
              <div className="card-header">
                <span className="icon">{subtopic.icon}</span>
                <h3>{getOpeningName(subtopic.opening)}</h3>
              </div>

              <p className="card-opening">{getOpeningName(subtopic.opening).toLowerCase()}</p>

              <div className="card-stats">
                <span className="stat">📖 {subtopic.puzzles_count.toLocaleString()} {t('puzzles')}</span>
                <span className="stat">⭐ {subtopic.elo_range}</span>
              </div>

              <div className="progress-wrapper">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${getSubtopicProgress(subtopic)}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {getSubtopicProgress(subtopic)}% {t('completedPercent')}
                </span>
              </div>

              <button className="card-btn">{t('explore')}</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Вид: Страница урока
  return (
    <div className="education-container">
      <button
        className="back-btn"
        onClick={() => setSelectedSubtopic(null)}
      >
        {t('back')}
      </button>

      <div className="lesson-header">
        <h1>
          <span className="icon">{selectedSubtopic.icon}</span>
          {getOpeningName(selectedSubtopic.opening)}
        </h1>
        <p>{getOpeningDescription(selectedSubtopic.opening)}</p>
      </div>

      <div className="lessons-wrapper">
        <div className="lessons-sidebar">
          <div className="sidebar-info">
            <h3>{t('progress')}</h3>
            <p>{t('puzzlesLabel')}: {selectedSubtopic.puzzles_count.toLocaleString()}</p>
            <p>{t('lessonsLabel')}: {selectedSubtopic.lessons.length}</p>
          </div>

          <div className="lessons-list">
            <h3>{t('lessons')}</h3>
            {selectedSubtopic.lessons.map(lesson => (
              <div
                key={lesson.id}
                className={`lesson-item ${selectedLesson?.id === lesson.id ? 'active' : ''}`}
                onClick={() => setSelectedLesson(lesson)}
              >
                <div className="lesson-order">{lesson.order}</div>
                <div className="lesson-content">
                  <h4>{lesson.title}</h4>
                  <p>{lesson.description}</p>
                  <div className="lesson-progress">
                    {lessonProgress[lesson.id]?.puzzlesSolved ?? 0}/{lessonProgress[lesson.id]?.puzzlesTotal ?? lesson.puzzle_limit} {t('tasksCompleted')}
                  </div>
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
            <h2>{t('lessonBasics')} {getOpeningName(selectedSubtopic.opening)}</h2>
            <p>
              {getOpeningName(selectedSubtopic.opening)} — {getOpeningDescription(selectedSubtopic.opening)}
            </p>

            <div className="lesson-action">
              <button
                className="btn-primary"
                onClick={() => startLessonTraining(selectedLesson || selectedSubtopic.lessons[0])}
              >
                {t('startPuzzleTraining')} ({(selectedLesson || selectedSubtopic.lessons[0]).puzzle_limit} {t('tasksCompleted')})
              </button>
              <button className="btn-secondary">
                {t('readMore')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
