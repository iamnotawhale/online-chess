import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import './DailyPuzzle.css';
import { PuzzleData } from './puzzleUtils';
import { usePuzzleGame } from './usePuzzleGame';

export const DailyPuzzle: React.FC = () => {
  const { t } = useTranslation();
  const getBoardWidth = () => 320;

  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [boardWidth, setBoardWidth] = useState(getBoardWidth);
  const {
    position,
    status,
    messageKey,
    playerColor,
    handleMove,
    setStatus,
    setMessageKey
  } = usePuzzleGame({
    puzzle,
    loading,
    disableMoves: puzzle?.alreadySolved ?? false,
    autoFirstMoveDelayMs: 0,
    onComplete: () => {
      setPuzzle(prev => (prev ? { ...prev, alreadySolved: true } : null));
    }
  });

  useEffect(() => {
    loadDailyPuzzle();
  }, []);

  useEffect(() => {
    setBoardWidth(getBoardWidth());
  }, []);

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


  if (loading) {
    return <div className="daily-puzzle-loading">{t('loading')}</div>;
  }

  if (!puzzle) {
    return <div className="daily-puzzle-error">{t('puzzleNotAvailable')}</div>;
  }

  return (
    <div className="section">
      <div className="puzzle-header">
        <h3>{t('dailyPuzzle')}</h3>
        <span className="puzzle-rating">⭐ {puzzle.rating}</span>
      </div>
      
      <div className="puzzle-board">
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
        <a href="/puzzles" className="puzzle-btn-train">
          {t('puzzleTrainMore')}
        </a>
      </div>
    </div>
  );
};
