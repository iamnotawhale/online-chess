import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import { ChessBoardWrapper } from './common';
import './PuzzleTraining.css';
import { PuzzleData, applyUciMove } from './puzzleUtils';
import { usePuzzleGame } from './usePuzzleGame';

const FILTER_STORAGE_KEY = 'puzzleTrainingRatingFilter';

const readRatingFilter = () => {
  if (typeof window === 'undefined') return { min: 1000, max: 2000 };
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) return { min: 1000, max: 2000 };
    const parsed = JSON.parse(raw) as { min: number; max: number };
    if (!Number.isFinite(parsed?.min) || !Number.isFinite(parsed?.max)) {
      return { min: 1000, max: 2000 };
    }
    return normalizeRatingFilter({ min: parsed.min, max: parsed.max });
  } catch {
    return { min: 1000, max: 2000 };
  }
};

const writeRatingFilter = (filter: { min: number; max: number }) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filter));
  } catch {
    // Ignore storage errors.
  }
};

function normalizeRatingFilter(filter: { min: number; max: number }) {
  const minBound = 800;
  const maxBound = 2500;
  const clampedMin = Math.min(maxBound, Math.max(minBound, filter.min));
  const clampedMax = Math.min(maxBound, Math.max(minBound, filter.max));
  if (clampedMin > clampedMax) {
    return { min: clampedMax, max: clampedMin };
  }
  return { min: clampedMin, max: clampedMax };
}

export const PuzzleTraining: React.FC = () => {
  const { t } = useTranslation();
  const puzzleStorageKey = 'puzzleTrainingActive';
  const hintStorageKey = 'puzzleTrainingHintUsed';
  const [boardWidth, setBoardWidth] = useState(800);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [ratingFilter, setRatingFilter] = useState(() => readRatingFilter());
  const [puzzleElo, setPuzzleElo] = useState<number | null>(null);
  const [puzzleEloDelta, setPuzzleEloDelta] = useState(0);
  const [ratingHistory, setRatingHistory] = useState<number[]>([]);
  
  // Move history states
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [moveFens, setMoveFens] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [displayPosition, setDisplayPosition] = useState<string>('start');

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
    },
    onRatingChange: (rating, delta) => {
      setPuzzleElo(rating);
      setPuzzleEloDelta(delta);
    },
    onHistoryUpdate: (history) => {
      setRatingHistory(history.slice(0, 8));
    }
  });

  useEffect(() => {
    const loadRatingHistory = async () => {
      try {
        const history = await apiService.getPuzzleRatingHistory();
        const deltas = Array.isArray(history)
          ? history
              .map((item) => item?.ratingChange)
              .filter((value) => Number.isFinite(value))
          : [];
        setRatingHistory(deltas.slice(0, 8));
      } catch {
        setRatingHistory([]);
      }
    };

    loadRatingHistory();
  }, []);

  useEffect(() => {
    writeRatingFilter(ratingFilter);
  }, [ratingFilter]);

  // Update display position based on history navigation
  useEffect(() => {
    if (!puzzle) {
      setDisplayPosition('start');
      return;
    }

    if (isViewingHistory) {
      if (currentMoveIndex < 0) {
        // Show starting position
        setDisplayPosition(puzzle.fen);
      } else if (currentMoveIndex < moveFens.length) {
        setDisplayPosition(moveFens[currentMoveIndex]);
      }
    } else {
      // Show current game position
      setDisplayPosition(position);
    }
  }, [isViewingHistory, currentMoveIndex, position, puzzle?.fen, moveFens]);

  const readStoredPuzzle = (): PuzzleData | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(puzzleStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PuzzleData;
      if (!parsed?.id || !parsed?.fen || typeof parsed?.firstMove !== 'string') return null;
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
        setPuzzleElo(typeof stored.userPuzzleRating === 'number' ? stored.userPuzzleRating : null);
        setPuzzleEloDelta(0);
        setStatus('playing');
        setMessageKey('');
        setHintUsed(readHintUsed(stored.id));
        setLoading(false);
        try {
          const ratingResponse = await apiService.getPuzzleRating();
          if (typeof ratingResponse?.rating === 'number') {
            setPuzzleElo(ratingResponse.rating);
          }
        } catch {
          // Ignore rating fetch errors.
        }
        return;
      }
    }

    try {
      const data = await apiService.getRandomPuzzle(ratingFilter.min, ratingFilter.max);
      setPuzzle(data);
      setPuzzleElo(typeof data.userPuzzleRating === 'number' ? data.userPuzzleRating : null);
      setPuzzleEloDelta(0);
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


  const handleHint = async () => {
    if (!puzzle || hintUsed || status === 'complete') return;

    try {
      const response = await apiService.getPuzzleHint(puzzle.id, userMoves);
      
      if (!response?.nextMove) {
        console.error('No hint available');
        return;
      }

      const gameCopy = new Chess(game.fen());
      const prevFen = game.fen();

      if (!applyUciMove(gameCopy, response.nextMove)) {
        console.error('Failed to apply hint move');
        return;
      }

      const newUserMoves = [...userMoves, response.nextMove];
      setHintUsed(true);
      markHintUsed(puzzle.id);
      setUserMoves(newUserMoves);
      checkSolution(puzzle.id, newUserMoves, gameCopy, prevFen);
    } catch (error) {
      console.error('Failed to get hint:', error);
    }
  };

  const handleSkip = () => {
    setStreak(0);
    setStatus('wrong');
    setMessageKey('puzzleWrong');
    clearStoredPuzzle();
    clearHintUsed();
    loadRandomPuzzle(true);
  };

  // Generate move history from userMoves
  useEffect(() => {
    if (!puzzle || !game) {
      setMoveHistory([]);
      setMoveFens([]);
      setCurrentMoveIndex(-1);
      setIsViewingHistory(false);
      return;
    }

    try {
      const tempGame = new Chess(puzzle.fen);
      const notations: string[] = [];
      const fens: string[] = [];

      // Apply each move and collect notation + FEN
      for (const uciMove of userMoves) {
        const from = uciMove.slice(0, 2);
        const to = uciMove.slice(2, 4);
        const promotion = uciMove.length === 5 ? uciMove[4].toLowerCase() : undefined;
        
        try {
          const result = tempGame.move({ from, to, promotion } as any);
          if (result) {
            notations.push(result.san);
            fens.push(tempGame.fen());
          }
        } catch (e) {
          console.error('Error generating move notation:', uciMove, e);
        }
      }

      setMoveHistory(notations);
      setMoveFens(fens);
      
      // Auto-scroll to latest move if not viewing history
      if (!isViewingHistory) {
        setCurrentMoveIndex(notations.length - 1);
      }
    } catch (err) {
      console.error('Error generating move history:', err);
    }
  }, [userMoves, puzzle?.id]);

  // Navigation functions
  const goToMove = (moveIndex: number) => {
    if (!puzzle) return;
    
    setIsViewingHistory(moveIndex < moveHistory.length - 1);
    setCurrentMoveIndex(moveIndex);
  };

  const goToStart = () => {
    if (!puzzle) return;
    setIsViewingHistory(true);
    setCurrentMoveIndex(-1);
  };

  const goToPreviousMove = () => {
    if (currentMoveIndex >= 0) {
      const newIndex = currentMoveIndex - 1;
      goToMove(newIndex);
    }
  };

  const goToNextMove = () => {
    if (currentMoveIndex < moveHistory.length - 1) {
      goToMove(currentMoveIndex + 1);
    }
  };

  const goToLatest = () => {
    if (moveHistory.length > 0) {
      setCurrentMoveIndex(moveHistory.length - 1);
      setIsViewingHistory(false);
    }
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

  // Calculate last move for highlighting
  // When viewing history, highlight the current move; otherwise highlight the actual last move
  const lastMove = (() => {
    if (isViewingHistory && currentMoveIndex >= 0 && currentMoveIndex < userMoves.length) {
      const moveUci = userMoves[currentMoveIndex];
      return {
        from: moveUci.slice(0, 2),
        to: moveUci.slice(2, 4),
      };
    } else if (!isViewingHistory && userMoves.length > 0) {
      const moveUci = userMoves[userMoves.length - 1];
      return {
        from: moveUci.slice(0, 2),
        to: moveUci.slice(2, 4),
      };
    }
    return null;
  })();

  const getDeltaTone = (delta: number) => {
    const absDelta = Math.abs(delta);
    if (absDelta <= 3) return 'neutral';
    return delta > 0 ? 'positive' : 'negative';
  };

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
          <ChessBoardWrapper
            position={displayPosition}
            game={game}
            onMove={handleMove}
            lastMove={lastMove}
            orientation={playerColor}
            boardWidth={boardWidth}
            isInteractive={status !== 'complete' && !isViewingHistory}
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

          {moveHistory.length > 0 && (
            <div className="puzzle-container puzzle-moves-history">
              <div className="moves-controls">
                <button 
                  onClick={goToStart} 
                  disabled={currentMoveIndex === -1}
                  title={t('toStart')}
                >
                  ⏮
                </button>
                <button 
                  onClick={goToPreviousMove} 
                  disabled={currentMoveIndex <= -1}
                  title={t('previous')}
                >
                  ◀
                </button>
                <button 
                  onClick={goToNextMove} 
                  disabled={currentMoveIndex >= moveHistory.length - 1}
                  title={t('next')}
                >
                  ▶
                </button>
                <button 
                  onClick={goToLatest} 
                  disabled={!isViewingHistory}
                  title={t('toLatest')}
                >
                  ⏭
                </button>
              </div>
              <div className="moves-list">
                <div className="moves-grid">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, pairIndex) => {
                    const whiteIndex = pairIndex * 2;
                    const blackIndex = pairIndex * 2 + 1;
                    const whiteMove = moveHistory[whiteIndex];
                    const blackMove = blackIndex < moveHistory.length ? moveHistory[blackIndex] : null;
                    
                    return (
                      <div key={pairIndex} className="move-row">
                        <span className="move-number">{pairIndex + 1}.</span>
                        <button
                          className={`move-button ${whiteIndex === currentMoveIndex ? 'current' : ''}`}
                          onClick={() => goToMove(whiteIndex)}
                        >
                          {whiteMove}
                        </button>
                        {blackMove ? (
                          <button
                            className={`move-button ${blackIndex === currentMoveIndex ? 'current' : ''}`}
                            onClick={() => goToMove(blackIndex)}
                          >
                            {blackMove}
                          </button>
                        ) : (
                          <div></div>
                        )}
                      </div>
                    );  
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="puzzle-container puzzle-stats">
            <div className="stats-row">
              <div className="stat">
                <span className="stat-value">{puzzleElo ?? '-'}</span>
                <span className="stat-label">{t('puzzleElo')}</span>
                {puzzleEloDelta !== 0 && (
                  <span className={`puzzle-elo-change ${puzzleEloDelta > 0 ? 'positive' : 'negative'}`}>
                    {puzzleEloDelta > 0 ? `+${puzzleEloDelta}` : puzzleEloDelta}
                  </span>
                )}
              </div>
            </div>
            {ratingHistory.length > 0 && (
              <div className="puzzle-elo-history">
                {ratingHistory.map((delta, idx) => (
                  <span key={`${delta}-${idx}`} className={`puzzle-elo-pill ${getDeltaTone(delta)}`}>
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                ))}
              </div>
            )}
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
                onChange={(e) =>
                  setRatingFilter(
                    normalizeRatingFilter({
                      ...ratingFilter,
                      min: parseInt(e.target.value)
                    })
                  )
                }
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
                onChange={(e) =>
                  setRatingFilter(
                    normalizeRatingFilter({
                      ...ratingFilter,
                      max: parseInt(e.target.value)
                    })
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
