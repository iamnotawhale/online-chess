import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { useTranslation } from '../i18n/LanguageContext';
import { apiService, LessonProgress } from '../api';
import { ChessBoardWrapper } from './common/ChessBoardWrapper';
import { LessonTheoryModal } from './LessonTheoryModal';
import lessonsData from '../data/lessons.json';
import openingTranslations from '../data/openingTranslations.json';
import openingLines from '../data/openingLines.json';
import lessonTheory from '../data/lessonTheory.json';
import './Education.css';

const ACTIVE_LESSON_STORAGE_KEY = 'educationActiveLesson';
const EDUCATION_CATEGORY_STORAGE_KEY = 'educationCategory';
const EDUCATION_SUBTOPIC_STORAGE_KEY = 'educationSubtopic';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<Subtopic | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({});
  const [miniBoardWidth, setMiniBoardWidth] = useState(360);
  const [miniLineFens, setMiniLineFens] = useState<string[]>([]);
  const [miniLineMoves, setMiniLineMoves] = useState<string[]>([]);
  const [miniLineLastMoves, setMiniLineLastMoves] = useState<Array<{ from: string; to: string }>>([]);
  const [miniLineIndex, setMiniLineIndex] = useState(0);
  const [miniAutoPlay, setMiniAutoPlay] = useState(false);
  const [isTheoryModalOpen, setIsTheoryModalOpen] = useState(false);
  const [modalTheoryData, setModalTheoryData] = useState<{ title: string; content: string } | null>(null);
  const handleReadMore = () => {
    const lessonId = selectedLesson?.id;
    console.log('handleReadMore called, lessonId:', lessonId, 'selectedLesson:', selectedLesson);
    if (!lessonId) {
      console.log('No lessonId found');
      return;
    }

    const theory = (lessonTheory as Record<string, any>)[lessonId];
    console.log('Found theory:', theory, 'for lessonId:', lessonId);
    if (theory) {
      setModalTheoryData(theory);
      setIsTheoryModalOpen(true);
    } else {
      console.log('No theory found for lessonId:', lessonId);
    }
  };

  const categories: Category[] = lessonsData.categories;

  // Helper functions for localized text
  const formatOpeningTag = (openingTag: string): string => openingTag.replace(/_/g, ' ');

  const getCategoryName = (category: Category): string => {
    const translations = openingTranslations.categoryNames as Record<string, Record<string, string>>;
    return translations[category.id]?.[language] || translations[category.id]?.['ru'] || category.name;
  };

  const getCategoryDescription = (category: Category): string => {
    const translations = openingTranslations.categoryDescriptions as Record<string, Record<string, string>>;
    return translations[category.id]?.[language] || translations[category.id]?.['ru'] || category.description;
  };

  const getOpeningName = (subtopic: Subtopic): string => {
    const translations = openingTranslations.openings as Record<string, Record<string, string>>;
    return translations[subtopic.opening]?.[language]
      || translations[subtopic.opening]?.['ru']
      || formatOpeningTag(subtopic.opening);
  };

  const getOpeningDescription = (subtopic: Subtopic): string => {
    const translations = openingTranslations.descriptions as Record<string, Record<string, string>>;
    return translations[subtopic.opening]?.[language]
      || translations[subtopic.opening]?.['ru']
      || subtopic.description;
  };

  const getOpeningLineMoves = (openingTag: string): string[] => {
    const lines = openingLines.lines as Record<string, { moves: string[] }>;
    
    // Try direct match
    if (lines[openingTag]) {
      return lines[openingTag].moves || [];
    }
    
    // Try with underscore to CamelCase conversion
    const camelCase = openingTag
      .split('_')
      .map((word, idx) => {
        if (idx === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('_');
    
    if (lines[camelCase]) {
      return lines[camelCase].moves || [];
    }
    
    console.warn(`Opening "${openingTag}" not found in openingLines`);
    return [];
  };

  const getLessonTitle = (lesson: Lesson): string => {
    // Extract lesson type from id: e.g., "italian_game_basics" -> "basics"
    const parts = lesson.id.split('_');
    const lessonType = parts[parts.length - 1]; // basics, traps, or tactics

    if (lessonType === 'basics') {
      return t('lessonBasics');
    } else if (lessonType === 'traps') {
      return t('lessonTraps');
    } else if (lessonType === 'tactics') {
      return t('lessonTactics');
    }
    return lesson.title;
  };

  const getLessonDescription = (lesson: Lesson): string => {
    // Extract lesson type from id: e.g., "italian_game_basics" -> "basics"
    const parts = lesson.id.split('_');
    const lessonType = parts[parts.length - 1]; // basics, traps, or tactics

    if (lessonType === 'basics') {
      return t('lessonBasicsDesc');
    } else if (lessonType === 'traps') {
      return t('lessonTrapsDesc');
    } else if (lessonType === 'tactics') {
      return t('lessonTacticsDesc');
    }
    return lesson.description;
  };

  useEffect(() => {
    // Try to restore from localStorage
    let restoredCategory = null;
    let restoredSubtopic = null;
    
    if (typeof window !== 'undefined') {
      try {
        // First, try to restore active lesson (from PuzzleTraining)
        const activeLesson = window.localStorage.getItem(ACTIVE_LESSON_STORAGE_KEY);
        if (activeLesson) {
          const parsed = JSON.parse(activeLesson) as any;
          if (parsed?.categoryId && parsed?.subtopicId) {
            const category = categories.find(c => c.id === parsed.categoryId);
            if (category) {
              restoredCategory = category;
              const subtopic = category.subtopics.find(s => s.id === parsed.subtopicId);
              if (subtopic) {
                restoredSubtopic = subtopic;
                console.log('Restored active lesson from localStorage:', category.id, subtopic.id);
              }
            }
          }
        }
        
        // If no active lesson, try to restore category/subtopic selection
        if (!restoredSubtopic) {
          const categoryId = window.localStorage.getItem(EDUCATION_CATEGORY_STORAGE_KEY);
          const subtopicId = window.localStorage.getItem(EDUCATION_SUBTOPIC_STORAGE_KEY);
          
          if (categoryId && subtopicId) {
            const category = categories.find(c => c.id === categoryId);
            if (category) {
              restoredCategory = category;
              const subtopic = category.subtopics.find(s => s.id === subtopicId);
              if (subtopic) {
                restoredSubtopic = subtopic;
                console.log('Restored category/subtopic selection from localStorage:', category.id, subtopic.id);
              }
            }
          }
        }
      } catch {
        // Ignore errors
      }
    }
    
    setSelectedCategory(restoredCategory);
    setSelectedSubtopic(restoredSubtopic);

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

  // Save category/subtopic selection to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedSubtopic && selectedCategory) {
      window.localStorage.setItem(EDUCATION_CATEGORY_STORAGE_KEY, selectedCategory.id);
      window.localStorage.setItem(EDUCATION_SUBTOPIC_STORAGE_KEY, selectedSubtopic.id);
      console.log('Saved category/subtopic to localStorage:', selectedCategory.id, selectedSubtopic.id);
    }
  }, [selectedSubtopic?.id, selectedCategory?.id]);


  // Sync state with URL parameters
  useEffect(() => {
    const categoryId = searchParams.get('category');
    const subtopicId = searchParams.get('subtopic');

    let newCategory = null;
    let newSubtopic = null;

    if (categoryId) {
      newCategory = categories.find(c => c.id === categoryId) || null;
      if (newCategory && subtopicId) {
        newSubtopic = newCategory.subtopics.find(s => s.id === subtopicId) || null;
      }
      if (newCategory && !subtopicId) {
        newSubtopic = null;
      }
    }

    setSelectedCategory(newCategory);
    setSelectedSubtopic(newSubtopic);
  }, [searchParams, categories]);

  useEffect(() => {
    // Auto-select first lesson when subtopic is selected (but not initially)
    if (selectedSubtopic && selectedSubtopic.lessons.length > 0) {
      // Only auto-select if we just selected this subtopic  
      setSelectedLesson(selectedSubtopic.lessons[0]);
      console.log('Auto-selected first lesson:', selectedSubtopic.lessons[0].id);
    } else if (!selectedSubtopic) {
      // Clear lesson selection when subtopic is cleared
      setSelectedLesson(null);
    }
  }, [selectedSubtopic?.id]);

  useEffect(() => {
    if (!selectedSubtopic) return;

    try {
      const moves = getOpeningLineMoves(selectedSubtopic.opening);
      const chess = new Chess();
      const fens = [chess.fen()];
      const lineMoves: string[] = [];
      const lastMoves: Array<{ from: string; to: string }> = [];

      moves.forEach((move) => {
        try {
          const result = chess.move(move, { strict: false });
          if (!result) return;
          lineMoves.push(result.san);
          lastMoves.push({ from: result.from, to: result.to });
          fens.push(chess.fen());
        } catch (e) {
          console.warn(`Invalid move "${move}" for opening ${selectedSubtopic.opening}:`, e);
        }
      });

      setMiniLineFens(fens);
      setMiniLineMoves(lineMoves);
      setMiniLineLastMoves(lastMoves);
      setMiniLineIndex(0);
      setMiniAutoPlay(false);
    } catch (e) {
      console.error('Error processing opening lines:', e);
      setMiniLineFens([new Chess().fen()]);
      setMiniLineMoves([]);
      setMiniLineLastMoves([]);
    }
  }, [selectedSubtopic?.opening]);

  useEffect(() => {
    const updateMiniBoardWidth = () => {
      if (typeof window === 'undefined') return;
      const containerWidth = document.querySelector('.mini-board-card')?.clientWidth || 400;
      const width = Math.min(Math.max(280, containerWidth - 44), 600);
      setMiniBoardWidth(width);
      console.log('Updated mini board width:', width, 'from container:', containerWidth);
    };

    // Use multiple requestAnimationFrames to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateMiniBoardWidth();
      });
    });
    
    window.addEventListener('resize', updateMiniBoardWidth);
    return () => window.removeEventListener('resize', updateMiniBoardWidth);
  }, []);

  // Update mini board width when subtopic changes (board content changes)
  useEffect(() => {
    if (!selectedSubtopic) return;
    
    const updateMiniBoardWidth = () => {
      if (typeof window === 'undefined') return;
      const containerWidth = document.querySelector('.mini-board-card')?.clientWidth || 400;
      const width = Math.min(Math.max(280, containerWidth - 44), 600);
      setMiniBoardWidth(width);
      console.log('Updated mini board width on subtopic change:', width);
    };

    // Wait for DOM to settle after subtopic change
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateMiniBoardWidth();
        });
      });
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [selectedSubtopic?.id]);

  useEffect(() => {
    if (!miniAutoPlay || miniLineFens.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setMiniLineIndex((prev) => (prev + 1) % miniLineFens.length);
    }, 1400);

    return () => window.clearInterval(timer);
  }, [miniAutoPlay, miniLineFens.length]);

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
      // Ignore progress update errors to avoid breaking the UI.
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
      // Ignore localStorage errors.
    }
  };

  const startLessonTraining = async (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setActiveLesson(lesson);
    await updateProgressForLesson(lesson, { total: lesson.puzzle_limit });
    navigate('/puzzles?mode=lesson');
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

  // View: Category selection
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
              onClick={() => setSearchParams({category: category.id})}
            >
              <div className="category-icon">{category.icon}</div>
              <h3>{getCategoryName(category)}</h3>
              <p>{getCategoryDescription(category)}</p>
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

  // View: Opening selection within category
  if (!selectedSubtopic) {
    return (
      <div className="education-container">
        <div className="category-header">
          <h1>
            <span className="icon">{selectedCategory.icon}</span>
            {getCategoryName(selectedCategory)}
          </h1>
          <p>{getCategoryDescription(selectedCategory)}</p>
        </div>

        <div className="openings-grid">
          {selectedCategory.subtopics.map(subtopic => (
            <div
              key={subtopic.id}
              className="subtopic-card"
              onClick={() => setSearchParams({category: searchParams.get('category') || '', subtopic: subtopic.id})}
            >
              <div className="card-header">
                <span className="icon">{subtopic.icon}</span>
                <h3>{getOpeningName(subtopic)}</h3>
              </div>

              <p className="card-opening">{getOpeningDescription(subtopic)}</p>

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

  // View: Lesson page
  return (
    <div className="education-container">
      <div className="lesson-header">
        <h1>
          <span className="icon">{selectedSubtopic.icon}</span>
          {getOpeningName(selectedSubtopic)}
        </h1>
        <p>{getOpeningDescription(selectedSubtopic)}</p>
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
                  <h4>{getLessonTitle(lesson)}</h4>
                  <p>{getLessonDescription(lesson)}</p>
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
          <div className="mini-board-card">
            <div className="mini-board-header">
              <div>
                <h3>{t('openingLinePreview')}</h3>
                <p className="mini-board-subtitle">
                  {miniLineMoves.length > 0 
                    ? miniLineMoves.map((move, idx) => {
                        const moveNumber = Math.floor(idx / 2) + 1;
                        const isWhiteMove = idx % 2 === 0;
                        return isWhiteMove ? `${moveNumber}. ${move}` : `${moveNumber}... ${move}`;
                      }).join(' ')
                    : t('lineComingSoon')}
                </p>
              </div>
            </div>

            <div className="mini-board-board">
              <ChessBoardWrapper
                position={miniLineFens[miniLineIndex] || new Chess().fen()}
                game={new Chess(miniLineFens[miniLineIndex] || new Chess().fen())}
                boardWidth={miniBoardWidth}
                isInteractive={false}
                showLegalMoves={false}
                showCheck={false}
                arePiecesDraggable={false}
                lastMove={miniLineIndex > 0 ? miniLineLastMoves[miniLineIndex - 1] : null}
              />
            </div>

            <div className="mini-board-controls">
              <button
                type="button"
                className="mini-board-btn"
                onClick={() => setMiniLineIndex(0)}
                disabled={miniLineIndex === 0}
              >
                ⏮
              </button>
              <button
                type="button"
                className="mini-board-btn"
                onClick={() => setMiniLineIndex((prev) => Math.max(0, prev - 1))}
                disabled={miniLineIndex === 0}
              >
                ◀
              </button>
              <button
                type="button"
                className="mini-board-btn mini-board-text-btn"
                onClick={() => setMiniAutoPlay(prev => !prev)}
              >
                {miniAutoPlay ? t('previewPause') : t('previewPlay')}
              </button>
              <button
                type="button"
                className="mini-board-btn"
                onClick={() => setMiniLineIndex((prev) => Math.min(miniLineFens.length - 1, prev + 1))}
                disabled={miniLineIndex >= miniLineFens.length - 1}
              >
                ▶
              </button>
              <button
                type="button"
                className="mini-board-btn"
                onClick={() => setMiniLineIndex(miniLineFens.length - 1)}
                disabled={miniLineIndex >= miniLineFens.length - 1}
              >
                ⏭
              </button>
            </div>
          </div>

          <div className="lesson-content-text">
            <h2>{t('lessonBasics')} {getOpeningName(selectedSubtopic)}</h2>
            <p>
              {getOpeningName(selectedSubtopic)} — {getOpeningDescription(selectedSubtopic)}
            </p>

            <div className="lesson-action">
              <button
                className="btn-primary"
                onClick={() => startLessonTraining(selectedLesson || selectedSubtopic.lessons[0])}
              >
                {t('startPuzzleTraining')} ({(selectedLesson || selectedSubtopic.lessons[0]).puzzle_limit} {t('tasksCompleted')})
              </button>
              <button className="btn-secondary" onClick={handleReadMore}>
                {t('readMore')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalTheoryData && (
        <LessonTheoryModal
          isOpen={isTheoryModalOpen}
          title={modalTheoryData.title}
          content={modalTheoryData.content}
          onClose={() => setIsTheoryModalOpen(false)}
        />
      )}
    </div>
  );
};
