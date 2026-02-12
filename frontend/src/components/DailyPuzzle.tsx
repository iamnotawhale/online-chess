import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import './DailyPuzzle.css';
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

export const DailyPuzzle: React.FC = () => {
  const { t } = useTranslation();
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState('');
  const [userMoves, setUserMoves] = useState<string[]>([]);
  const [status, setStatus] = useState<'playing' | 'correct' | 'wrong' | 'complete'>('playing');
  const [messageKey, setMessageKey] = useState<TranslationKey | ''>('');
  const [loading, setLoading] = useState(true);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [isOpponentMoving, setIsOpponentMoving] = useState(false);

  useEffect(() => {
    loadDailyPuzzle();
  }, []);

  const loadDailyPuzzle = async () => {
    try {
      const data = await apiService.getDailyPuzzle();
      setPuzzle(data);
      
      const chess = new Chess(data.fen);
      
      setGame(chess);
      setPosition(chess.fen());
      setUserMoves([]);
      setStatus('playing');
      setMessageKey('');
      
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
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load daily puzzle:', error);
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
    if (status === 'complete' || !puzzle || isOpponentMoving) return false;

    const gameCopy = new Chess(game.fen());
    
    // Try to make the move
    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // always promote to queen for puzzles
      });

      if (move === null) return false;

      const moveUci = `${sourceSquare}${targetSquare}`;
      const newUserMoves = [...userMoves, moveUci];
      console.log('=== USER MOVE ===');
      console.log('Current userMoves:', userMoves);
      console.log('New move:', moveUci);
      console.log('Sending to backend:', newUserMoves);
      console.log('Current position:', game.fen());
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
      console.log('=== CHECKING SOLUTION ===');
      console.log('Puzzle ID:', puzzleId);
      console.log('Moves array:', moves);
      
      // Check solution
      const response = await apiService.checkPuzzleSolution(puzzleId, moves, 0);
      
      console.log('=== BACKEND RESPONSE ===');
      console.log('Correct:', response.correct);
      console.log('Complete:', response.complete);
      console.log('Next move:', response.nextMove);
      console.log('Full solution:', response.solution);

      if (response.complete) {
        setStatus('complete');
        setMessageKey('puzzleComplete');
        setGame(gameCopy);
        setPosition(gameCopy.fen());
        return true;
      } else if (response.correct) {
        setStatus('correct');
        setMessageKey('puzzleCorrect');
        setGame(gameCopy);
        setPosition(gameCopy.fen());
        
        // Auto-play opponent's response move after player's correct move
        if (response.nextMove) {
          console.log('=== SCHEDULING OPPONENT MOVE ===');
          console.log('Will play:', response.nextMove, 'in 600ms');
          setIsOpponentMoving(true);
          setTimeout(() => {
            console.log('=== EXECUTING OPPONENT MOVE ===');
            const opponentFrom = response.nextMove.substring(0, 2);
            const opponentTo = response.nextMove.substring(2, 4);
            console.log('From:', opponentFrom, 'To:', opponentTo);
            
            setGame(prevGame => {
              const newGame = new Chess(prevGame.fen());
              console.log('Before opponent move:', prevGame.fen());
              newGame.move({ from: opponentFrom, to: opponentTo, promotion: 'q' });
              console.log('After opponent move:', newGame.fen());
              setPosition(newGame.fen());
              return newGame;
            });
            
            setUserMoves(prev => {
              console.log('Adding opponent move to userMoves:', prev, '+', response.nextMove);
              return [...prev, response.nextMove];
            });
            setIsOpponentMoving(false);
          }, 600);
        }
        return true;
      } else {
        setStatus('wrong');
        setMessageKey('puzzleWrong');
        return false;
      }
    } catch (e) {
      return false;
    }
  };

  const handleReset = () => {
    if (puzzle) {
      const chess = new Chess(puzzle.fen);
      setGame(chess);
      setPosition(chess.fen());
      setUserMoves([]);
      setStatus('playing');
      setMessageKey('');
      
      // Auto-play opponent's first move after a delay
      setIsOpponentMoving(true);
      setTimeout(() => {
        if (puzzle.solution && puzzle.solution.length > 0) {
          const firstOpponentMove = puzzle.solution[0];
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
            setIsOpponentMoving(false);
          } catch (error) {
            console.error('Failed to play opponent\'s first move:', error);
            setIsOpponentMoving(false);
          }
        }
      }, 600);
    }
  };

  if (loading) {
    return <div className="daily-puzzle-loading">{t('loading')}</div>;
  }

  if (!puzzle) {
    return <div className="daily-puzzle-error">{t('puzzleNotAvailable')}</div>;
  }

  return (
    <div className="daily-puzzle-container">
      <div className="puzzle-header">
        <h3>🧩 {t('dailyPuzzle')}</h3>
        <span className="puzzle-rating">⭐ {puzzle.rating}</span>
      </div>
      
      <div className="puzzle-board">
        <Chessboard
          position={position}
          onPieceDrop={handleMove}
          boardWidth={280}
          boardOrientation="white"
          customBoardStyle={{
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
          }}
        />
      </div>

      {messageKey && (
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
        
        {puzzle.alreadySolved && (
          <div className="puzzle-solved-badge">✓ {t('puzzleAlreadySolved')}</div>
        )}
      </div>

      <div className="puzzle-actions">
        <button onClick={handleReset} className="puzzle-btn-reset">
          {t('puzzleReset')}
        </button>
        <a href="/puzzles" className="puzzle-btn-train">
          {t('puzzleTrainMore')}
        </a>
      </div>

      <div className="puzzle-stats">
        <span>{t('puzzleSolved')}: {puzzle.totalSolved}</span>
        <span>{t('puzzleAttempted')}: {puzzle.totalAttempts}</span>
      </div>
    </div>
  );
};
