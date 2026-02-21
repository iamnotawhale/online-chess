import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import { ChessBoardWrapper } from './common';
import './DailyPuzzle.css';
import { PuzzleData } from './puzzleUtils';
import { usePuzzleGame } from './usePuzzleGame';

export const DailyPuzzle: React.FC = () => {
  const { t } = useTranslation();
  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const MAX_DAILY_BOARD_WIDTH = 380;
  const getBoardWidth = () => {
    if (typeof window === 'undefined') return 320;
    return Math.min(Math.max(180, window.innerWidth - 64), MAX_DAILY_BOARD_WIDTH);
  };

  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [boardWidth, setBoardWidth] = useState(getBoardWidth);

  const {
    game,
    position,
    status,
    messageKey,
    playerColor,
    handleMove,
    userMoves,
    setStatus,
    setMessageKey
  } = usePuzzleGame({
    puzzle,
    autoFirstMoveDelayMs: 400,
    onComplete: () => {
      setPuzzle(prev => (prev ? { ...prev, alreadySolved: true } : null));
    }
  });

  useEffect(() => {
    loadDailyPuzzle();
  }, []);

  useEffect(() => {
    if (loading || !puzzle) return;

    const updateBoardWidth = () => {
      const containerWidth = boardContainerRef.current?.clientWidth ?? 0;
      if (containerWidth > 0) {
        const safeWidth = Math.max(160, Math.floor(containerWidth) - 2);
        setBoardWidth(Math.min(safeWidth, MAX_DAILY_BOARD_WIDTH));
        return;
      }
      setBoardWidth(getBoardWidth());
    };

    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(updateBoardWidth);
    });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && boardContainerRef.current) {
      resizeObserver = new ResizeObserver(() => updateBoardWidth());
      resizeObserver.observe(boardContainerRef.current);
    }

    window.addEventListener('resize', updateBoardWidth);
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateBoardWidth);
    };
  }, [loading, puzzle]);

  const loadDailyPuzzle = async () => {
    try {
      const data = await apiService.getDailyPuzzle();
      setPuzzle(data);
      
      // If already solved, show message and disable the board
      if (data.alreadySolved) {
        setStatus('complete');
        setMessageKey('puzzleAlreadySolved');
      }
      
      if (!data.alreadySolved) {
        setStatus('playing');
      }
      if (!data.alreadySolved) {
        setMessageKey('');
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load daily puzzle:', error);
      setMessageKey('puzzleLoadError');
      setLoading(false);
    }
  };

  // Calculate highlight styles for last move


  if (loading) {
    return <div className="daily-puzzle-loading">{t('loading')}</div>;
  }

  if (!puzzle) {
    return <div className="daily-puzzle-error">{t('puzzleNotAvailable')}</div>;
  }

  const lastMove = userMoves.length > 0
    ? {
        from: userMoves[userMoves.length - 1].slice(0, 2),
        to: userMoves[userMoves.length - 1].slice(2, 4),
      }
    : null;

  return (
    <div className="section daily-puzzle-widget">
      <h2 className="puzzle-header-title">
        <span>{t('dailyPuzzle')}</span>
        <span className="puzzle-rating">⭐ {puzzle.rating}</span>
      </h2>

      <div className="puzzle-board" ref={boardContainerRef}>
        <ChessBoardWrapper
          position={position}
          game={game}
          onMove={handleMove}
          lastMove={lastMove}
          orientation={playerColor}
          boardWidth={boardWidth}
          isInteractive={status !== 'complete' && !puzzle.alreadySolved}
        />
        {puzzle.alreadySolved && (
          <div className="puzzle-solved-overlay">
            <div className="puzzle-solved-text">
              {t('puzzleAlreadySolved')}
            </div>
          </div>
        )}
      </div>

      {messageKey && status !== 'complete' && (
        <div className={`puzzle-message ${status}`}>
          {t(messageKey)}
        </div>
      )}

      <div className="puzzle-info">
        <div className="puzzle-themes">
          <span className="puzzle-theme-tag">
            {playerColor === 'white' ? 'white' : 'black'}
          </span>
          {puzzle.themes.map((theme, idx) => (
            <span key={idx} className="puzzle-theme-tag">{theme}</span>
          ))}
        </div>
      </div>

      <div className="puzzle-actions">
        <a href="/puzzles" className="btn btn-primary">
          {t('puzzleTrainMore')}
        </a>
      </div>
    </div>
  );
};
