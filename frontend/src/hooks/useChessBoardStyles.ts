import { Chess } from 'chess.js';
import { useMemo } from 'react';

export interface BoardStylesConfig {
  game: Chess | null;
  selectedSquare?: string | null;
  legalMoves?: string[];
  lastMove?: { from: string; to: string } | null;
  showCheck?: boolean;
}

export const useChessBoardStyles = (config: BoardStylesConfig) => {
  const { game, selectedSquare, legalMoves = [], lastMove, showCheck = true } = config;

  return useMemo(() => {
    const styles: { [square: string]: React.CSSProperties } = {};

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

    // Highlight last move
    if (lastMove) {
      styles[lastMove.from] = {
        backgroundColor: 'rgba(52, 152, 219, 0.18)',
      };
      styles[lastMove.to] = {
        backgroundColor: 'rgba(52, 152, 219, 0.28)',
      };
    }

    // Highlight king in check
    if (showCheck && game) {
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
  }, [game, selectedSquare, legalMoves, lastMove, showCheck]);
};
