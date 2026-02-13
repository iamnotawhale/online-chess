import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import { getBoardTheme, getBoardColors, BoardTheme } from '../utils/boardTheme';
import './DailyPuzzle.css';
import { PuzzleData } from './puzzleUtils';
import { usePuzzleGame } from './usePuzzleGame';

export const DailyPuzzle: React.FC = () => {
  const { t } = useTranslation();
  const getBoardWidth = () => 320;

  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [boardWidth, setBoardWidth] = useState(getBoardWidth);
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
    status,
    messageKey,
    playerColor,
    handleMove,
    userMoves,
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
    if (!game || status === 'complete' || puzzle?.alreadySolved) return;

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
