import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import './PuzzleTraining.css';
import { TranslationKey } from '../i18n/translations';

interface PuzzleData {
  id: string;
  fen: string;
  solution: string[];
  rating: number;
  themes: string[];
  alreadySolved: boolean;
  previousAttempts: number | null;
  totalSolved: number;
  totalAttempts: number;
}

export const PuzzleTraining: React.FC = () => {
  const { t } = useTranslation();
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState('');
  const [userMoves, setUserMoves] = useState<string[]>([]);
  const [status, setStatus] = useState<'playing' | 'correct' | 'wrong' | 'complete'>('playing');
  const [messageKey, setMessageKey] = useState<TranslationKey | ''>('');
  const [loading, setLoading] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [streak, setStreak] = useState(0);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [ratingFilter, setRatingFilter] = useState({ min: 1000, max: 2000 });

  useEffect(() => {
    loadRandomPuzzle();
  }, []);

  const loadRandomPuzzle = async () => {
    setLoading(true);
    try {
      const data = await apiService.getRandomPuzzle(ratingFilter.min, ratingFilter.max);
      setPuzzle(data);
      
      const chess = new Chess(data.fen);
      
      setGame(chess);
      setPosition(chess.fen());
      setUserMoves([]);
      setStatus('playing');
      setMessageKey('');
      setShowSolution(false);
      setLoading(false);
      
      // Auto-play opponent's first move after a delay
      setTimeout(() => {
        if (data.solution && data.solution.length > 0) {
          const firstOpponentMove = data.solution[0];
          const opponentFrom = firstOpponentMove.substring(0, 2);
          const opponentTo = firstOpponentMove.substring(2, 4);
          
          try {
            const gameCopy = new Chess(chess.fen());
            gameCopy.move({ from: opponentFrom, to: opponentTo, promotion: 'q' });
            
            // Player color is determined by who moves AFTER the opponent's first move
            const playerIsWhite = gameCopy.turn() === 'w';
            setPlayerColor(playerIsWhite ? 'white' : 'black');
            
            setGame(gameCopy);
            setPosition(gameCopy.fen());
            setUserMoves([firstOpponentMove]);
          } catch (error) {
            console.error('Failed to play opponent\'s first move:', error);
          }
        }
      }, 600);
    } catch (error) {
      console.error('Failed to load puzzle:', error);
      setMessageKey('puzzleLoadError');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'wrong') return undefined;

    const timer = window.setTimeout(() => {
      setMessageKey('');
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [status]);

  const handleMove = (sourceSquare: string, targetSquare: string): boolean => {
    if (status === 'complete' || showSolution || !puzzle) return false;

    const gameCopy = new Chess(game.fen());
    
    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move === null) return false;

      const moveUci = `${sourceSquare}${targetSquare}`;
      const newUserMoves = [...userMoves, moveUci];
      setUserMoves(newUserMoves);

      // Check solution asynchronously
      checkSolution(puzzle.id, newUserMoves, gameCopy);
      
      return true;
    } catch (error) {
      console.error('Move error:', error);
      return false;
    }
  };

  const checkSolution = async (puzzleId: string, moves: string[], gameCopy: Chess) => {
    try {
      const response = await apiService.checkPuzzleSolution(puzzleId, moves, 0);

      if (response.complete) {
        setStatus('complete');
        setMessageKey('puzzleComplete');
        setStreak(streak + 1);
        setGame(gameCopy);
        setPosition(gameCopy.fen());
        
        // Auto-load next puzzle after 2 seconds
        setTimeout(() => {
          loadRandomPuzzle();
        }, 2000);
        
        return true;
      } else if (response.correct) {
        setStatus('correct');
        setMessageKey('puzzleCorrect');
        setGame(gameCopy);
        setPosition(gameCopy.fen());
        
        // Auto-play opponent's response move after player's correct move
        if (response.nextMove) {
          setTimeout(() => {
            const opponentFrom = response.nextMove.substring(0, 2);
            const opponentTo = response.nextMove.substring(2, 4);
            
            setGame(prevGame => {
              const newGame = new Chess(prevGame.fen());
              newGame.move({ from: opponentFrom, to: opponentTo, promotion: 'q' });
              setPosition(newGame.fen());
              return newGame;
            });
            
            setUserMoves(prev => [...prev, response.nextMove]);
          }, 600);
        }
        return true;
      } else {
        setStatus('wrong');
        setMessageKey('puzzleWrong');
        setStreak(0);
        return false;
      }
    } catch (e) {
      return false;
    }
  };

  const handleShowSolution = () => {
    setShowSolution(true);
    setStatus('wrong');
    setStreak(0);
    setMessageKey('');
    
    if (puzzle) {
      // Play through the solution
      const chess = new Chess(puzzle.fen);
      puzzle.solution.forEach(move => {
        const from = move.substring(0, 2);
        const to = move.substring(2, 4);
        chess.move({ from, to, promotion: 'q' });
      });
      setGame(chess);
      setPosition(chess.fen());
    }
  };

  const handleSkip = () => {
    setStreak(0);
    setMessageKey('');
    loadRandomPuzzle();
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
      <div className="puzzle-training-header">
        <h2>🧩 {t('puzzleTraining')}</h2>
        <div className="puzzle-streak">
          🔥 {t('puzzleStreak')}: <strong>{streak}</strong>
        </div>
      </div>

      <div className="puzzle-training-content">
        <div className="puzzle-left">
          <div className="puzzle-board-container">
            <Chessboard
              position={position}
              onPieceDrop={handleMove}
              boardWidth={Math.min(500, window.innerWidth - 40)}
              boardOrientation="white"
              customBoardStyle={{
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
              }}
            />
          </div>

          {messageKey && (
            <div className={`puzzle-feedback ${status}`}>
              {t(messageKey)}
            </div>
          )}
        </div>

        <div className="puzzle-right">
          <div className="puzzle-info-card">
            <div className="puzzle-rating-badge">
              ⭐ {puzzle.rating}
            </div>
            
            <div className="puzzle-themes-list">
              <span className="theme-tag">
                {playerColor === 'white' ? 'white' : 'black'}
              </span>
              {puzzle.themes.map((theme, idx) => (
                <span key={idx} className="theme-tag">{theme}</span>
              ))}
            </div>

            {puzzle.alreadySolved && (
              <div className="puzzle-solved-indicator">
                ✓ {t('puzzleAlreadySolved')}
              </div>
            )}
          </div>

          <div className="puzzle-controls">
            <button 
              onClick={handleShowSolution} 
              className="btn btn-secondary"
              disabled={showSolution || status === 'complete'}
            >
              💡 {t('puzzleShowSolution')}
            </button>
            <button 
              onClick={handleSkip} 
              className="btn btn-secondary"
            >
              ⏭️ {t('puzzleSkip')}
            </button>
            <button 
              onClick={loadRandomPuzzle} 
              className="btn btn-primary"
              disabled={loading}
            >
              🔄 {t('puzzleNext')}
            </button>
          </div>

          <div className="puzzle-stats-card">
            <h4>{t('puzzleYourStats')}</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{puzzle.totalSolved}</span>
                <span className="stat-label">{t('puzzleSolved')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{puzzle.totalAttempts}</span>
                <span className="stat-label">{t('puzzleAttempted')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {puzzle.totalAttempts > 0 
                    ? Math.round((puzzle.totalSolved / puzzle.totalAttempts) * 100) 
                    : 0}%
                </span>
                <span className="stat-label">{t('puzzleAccuracy')}</span>
              </div>
            </div>
          </div>

          <div className="puzzle-filter-card">
            <h4>{t('puzzleDifficulty')}</h4>
            <div className="rating-filter">
              <label>
                {t('puzzleMinRating')}: {ratingFilter.min}
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
                {t('puzzleMaxRating')}: {ratingFilter.max}
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
