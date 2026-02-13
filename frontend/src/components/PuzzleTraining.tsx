import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import { getBoardTheme, getBoardColors, BoardTheme } from '../utils/boardTheme';
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
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [boardTheme, setBoardThemeState] = useState<BoardTheme>(getBoardTheme());

  // Listen for board theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setBoardThemeState(getBoardTheme());
    };
    window.addEventListener('boardThemeChanged', handleThemeChange);
    return () => window.removeEventListener('boardThemeChanged', handleThemeChange);
  }, []);

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

  // Calculate highlight styles for last move
  const getLastMoveStyles = () => {
    const styles: { [key: string]: React.CSSProperties } = {};
    if (userMoves.length > 0) {
      const lastMove = userMoves[userMoves.length - 1];
      const fromSquare = lastMove.slice(0, 2);
      const toSquare = lastMove.slice(2, 4);
      styles[fromSquare] = {
        backgroundColor: 'rgba(52, 152, 219, 0.18)',
      };
      styles[toSquare] = {
        backgroundColor: 'rgba(52, 152, 219, 0.28)',
      };
    }
    return styles;
  };

  // Calculate square styles for selected square and legal moves
  const getSquareStyles = () => {
    const styles: { [square: string]: React.CSSProperties } = { ...getLastMoveStyles() };

    // Highlight selected square
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(255, 255, 0, 0.4)',
      };
    }

    // Highlight legal move squares
    legalMoves.forEach(square => {
      styles[square] = {
        background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%',
      };
      if (game?.get(square as any)) {
        styles[square] = {
          background: 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)',
          borderRadius: '50%',
        };
      }
    });

    // Highlight king in check
    if (game) {
      try {
        if (game.inCheck()) {
          const kingColor = game.turn();
          const board = game.board();
          let kingSquare: string | null = null;

          for (let rank = 0; rank < board.length; rank++) {
            for (let file = 0; file < board[rank].length; file++) {
              const piece = board[rank][file];
              if (piece && piece.type === 'k' && piece.color === kingColor) {
                const fileChar = String.fromCharCode('a'.charCodeAt(0) + file);
                const rankChar = String(8 - rank);
                kingSquare = `${fileChar}${rankChar}`;
                break;
              }
            }
            if (kingSquare) break;
          }

          if (kingSquare) {
            const isCheckmate = game.isCheckmate();
            styles[kingSquare] = {
              backgroundColor: 'rgba(231, 76, 60, 0.45)',
              animation: isCheckmate ? 'kingMatePulse 1s ease-in-out infinite' : undefined,
            };
          }
        }
      } catch (e) {
        console.error('Failed to compute check highlight', e);
      }
    }

    return styles;
  };

  // Handle square click to select pieces and make moves
  const handleSquareClick = (square: string) => {
    if (!game || status === 'complete') return;

    // If a square is already selected
    if (selectedSquare) {
      // Try to make a move to the clicked square
      if (legalMoves.includes(square)) {
        handleMove(selectedSquare, square);
      }
      // Deselect
      setSelectedSquare(null);
      setLegalMoves([]);
    } else {
      // Select this square and show legal moves
      const piece = game.get(square as any);
      if (piece) {
        const moves = game.moves({ square: square as any, verbose: true });
        const destinations = moves.map(m => m.to);
        if (destinations.length > 0) {
          setSelectedSquare(square);
          setLegalMoves(destinations);
        }
      }
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
            onSquareClick={handleSquareClick}
            boardWidth={boardWidth}
            boardOrientation={playerColor}
            customDarkSquareStyle={{ backgroundColor: getBoardColors(boardTheme).dark }}
            customLightSquareStyle={{ backgroundColor: getBoardColors(boardTheme).light }}
            customBoardStyle={{
              borderRadius: '4px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
            }}
            customSquareStyles={getSquareStyles()}
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
