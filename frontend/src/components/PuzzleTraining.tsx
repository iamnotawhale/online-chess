import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import './PuzzleTraining.css';
import { PuzzleData, applyUciMove } from './puzzleUtils';
import { usePuzzleGame } from './usePuzzleGame';

export const PuzzleTraining: React.FC = () => {
  const { t } = useTranslation();
  const puzzleStorageKey = 'puzzleTrainingActive';
  const hintStorageKey = 'puzzleTrainingHintUsed';
  const [boardWidth, setBoardWidth] = useState(800);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [ratingFilter, setRatingFilter] = useState({ min: 1000, max: 2000 });
  const {
    game,
    position,
    userMoves,
    status,
    messageKey,
    playerColor,
    handleMove,
    checkSolution,
    setStatus,
    setMessageKey,
    setUserMoves
  } = usePuzzleGame({
    puzzle,
    loading,
    autoFirstMoveDelayMs: 400,
    onComplete: () => {
      setStreak(prev => prev + 1);
      // Update local puzzle statistics for completed puzzle
      if (puzzle) {
        setPuzzle(prev => prev ? {
          ...prev,
          totalSolved: (prev.totalSolved || 0) + 1,
          totalAttempts: (prev.totalAttempts || 0) + 1
        } : null);
      }
      setTimeout(() => {
        clearStoredPuzzle();
        clearHintUsed();
        loadRandomPuzzle(true);
      }, 2000);
    },
    onCorrect: () => {
      // Don't count attempts for intermediate correct moves
      // Attempts are only counted on completion or error
    },
    onWrong: () => {
      setStreak(0);
      // Update local puzzle statistics for wrong attempt
      if (puzzle) {
        setPuzzle(prev => prev ? {
          ...prev,
          totalAttempts: (prev.totalAttempts || 0) + 1
        } : null);
      }
    }
  });

  const readStoredPuzzle = (): PuzzleData | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(puzzleStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PuzzleData;
      if (!parsed?.id || !parsed?.fen || !Array.isArray(parsed?.solution)) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const writeStoredPuzzle = (data: PuzzleData) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(puzzleStorageKey, JSON.stringify(data));
    } catch {
      // Ignore storage errors.
    }
  };

  const clearStoredPuzzle = () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(puzzleStorageKey);
    } catch {
      // Ignore storage errors.
    }
  };

  const readHintUsed = (puzzleId: string) => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(hintStorageKey) === puzzleId;
    } catch {
      return false;
    }
  };

  const markHintUsed = (puzzleId: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(hintStorageKey, puzzleId);
    } catch {
      // Ignore storage errors.
    }
  };

  const clearHintUsed = () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(hintStorageKey);
    } catch {
      // Ignore storage errors.
    }
  };

  useEffect(() => {
    loadRandomPuzzle(false);
  }, []);

  useEffect(() => {
    const updateBoardWidth = () => {
      if (typeof window === 'undefined') return;
      const isMobile = window.innerWidth <= 768;
      const nextWidth = isMobile
        ? Math.max(280, window.innerWidth - 24)
        : Math.min(800, Math.max(280, window.innerWidth - 40));
      setBoardWidth(nextWidth);
    };

    updateBoardWidth();
    window.addEventListener('resize', updateBoardWidth);
    return () => window.removeEventListener('resize', updateBoardWidth);
  }, []);

  const loadRandomPuzzle = async (forceNew: boolean) => {
    setLoading(true);
    if (!forceNew) {
      const stored = readStoredPuzzle();
      if (stored && !stored.alreadySolved) {
        setPuzzle(stored);
        setStatus('playing');
        setMessageKey('');
        setHintUsed(readHintUsed(stored.id));
        setLoading(false);
        return;
      }
    }

    try {
      const data = await apiService.getRandomPuzzle(ratingFilter.min, ratingFilter.max);
      setPuzzle(data);
      writeStoredPuzzle(data);
      clearHintUsed();
      setStatus('playing');
      setMessageKey('');
      setHintUsed(false);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load puzzle:', error);
      setMessageKey('puzzleLoadError');
      setLoading(false);
    }
  };


  const handleHint = () => {
    if (!puzzle || hintUsed || status === 'complete') return;
    if (!puzzle.solution || puzzle.solution.length === 0) return;

    const gameCopy = new Chess(game.fen());
    const prevFen = game.fen();
    const expectedMove = puzzle.solution[userMoves.length];
    if (!expectedMove) return;

    if (!applyUciMove(gameCopy, expectedMove)) return;

    const newUserMoves = [...userMoves, expectedMove];
    setHintUsed(true);
    markHintUsed(puzzle.id);
    setUserMoves(newUserMoves);
    checkSolution(puzzle.id, newUserMoves, gameCopy, prevFen);
  };

  const handleSkip = () => {
    setStreak(0);
    setStatus('wrong');
    setMessageKey('puzzleWrong');
    clearStoredPuzzle();
    clearHintUsed();
    loadRandomPuzzle(true);
  };

  if (loading && !puzzle) {
    return (
      <div className="puzzle-training-container">
        <div className="puzzle-loading">{t('loading')}</div>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="puzzle-training-container">
        <div className="puzzle-error">{t('puzzleNotAvailable')}</div>
      </div>
    );
  }

  return (
    <div className="puzzle-training-container">
      <div className="puzzle-header">
        <h3>{t('puzzleTraining')}</h3>
        <span className="puzzle-streak-badge">
          🔥 {streak}
        </span>
      </div>

      <div className="puzzle-training-grid">
        <div className="puzzle-board-section">
          <Chessboard
            position={position}
            onPieceDrop={handleMove}
            boardWidth={boardWidth}
            boardOrientation={playerColor}
            customBoardStyle={{
              borderRadius: '4px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
            }}
          />

          {messageKey && (
            <div className={`puzzle-message ${status}`}>
              {t(messageKey)}
            </div>
          )}
        </div>

        <div className="puzzle-sidebar">
          <div className="puzzle-container puzzle-info-section">
            <div className="puzzle-rating">⭐ {puzzle.rating}</div>
            
            <div className="puzzle-themes">
              <span className="puzzle-theme-tag">
                {playerColor === 'white' ? 'white' : 'black'}
              </span>
              {puzzle.themes.map((theme, idx) => (
                <span key={idx} className="puzzle-theme-tag">{theme}</span>
              ))}
            </div>

            {puzzle.alreadySolved && (
              <div className="puzzle-solved-badge">
                ✓ {t('puzzleAlreadySolved')}
              </div>
            )}
          </div>

          <div className="puzzle-container puzzle-actions">
            <button 
              onClick={handleHint} 
              className="btn btn-secondary btn-sm"
              disabled={hintUsed || status === 'complete'}
            >
              {t('puzzleShowSolution')}
            </button>
            <button 
              onClick={handleSkip} 
              className="btn btn-secondary btn-sm"
            >
              {t('puzzleSkip')}
            </button>
            <button 
              onClick={() => {
                clearStoredPuzzle();
                clearHintUsed();
                loadRandomPuzzle(true);
              }} 
              className="btn btn-primary btn-sm"
              disabled={loading}
            >
              {t('puzzleNext')}
            </button>
          </div>

          <div className="puzzle-container puzzle-stats">
            <div className="stats-row">
              <div className="stat">
                <span className="stat-value">{puzzle.totalSolved}</span>
                <span className="stat-label">{t('puzzleSolved')}</span>
              </div>
              <div className="stat">
                <span className="stat-value">{puzzle.totalAttempts}</span>
                <span className="stat-label">{t('puzzleAttempted')}</span>
              </div>
              <div className="stat">
                <span className="stat-value">
                  {puzzle.totalAttempts > 0 
                    ? Math.round((puzzle.totalSolved / puzzle.totalAttempts) * 100) 
                    : 0}%
                </span>
                <span className="stat-label">{t('puzzleAccuracy')}</span>
              </div>
            </div>
          </div>

          <div className="puzzle-container puzzle-difficulty">
            <div className="filter-group">
              <label>
                {t('puzzleMinRating')}: <strong>{ratingFilter.min}</strong>
              </label>
              <input 
                type="range" 
                min="800" 
                max="2500" 
                step="100"
                value={ratingFilter.min}
                onChange={(e) => setRatingFilter({ ...ratingFilter, min: parseInt(e.target.value) })}
              />
              
              <label>
                {t('puzzleMaxRating')}: <strong>{ratingFilter.max}</strong>
              </label>
              <input 
                type="range" 
                min="800" 
                max="2500" 
                step="100"
                value={ratingFilter.max}
                onChange={(e) => setRatingFilter({ ...ratingFilter, max: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
