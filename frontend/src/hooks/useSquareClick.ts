import { Chess } from 'chess.js';
import { useState, useCallback } from 'react';

export interface UseSquareClickConfig {
  game: Chess | null;
  isInteractive?: boolean;
  onMove?: (from: string, to: string) => boolean;
}

export const useSquareClick = (config: UseSquareClickConfig) => {
  const { game, isInteractive = true, onMove } = config;
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  const handleSquareClick = useCallback((square: string) => {
    if (!game || !isInteractive) return;

    // If a square is already selected
    if (selectedSquare) {
      // Try to make a move to the clicked square
      if (legalMoves.includes(square)) {
        const success = onMove?.(selectedSquare, square);
        if (success !== false) {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      } else {
        // Deselect or select new square
        const piece = game.get(square as any);
        if (piece) {
          const moves = game.moves({ square: square as any, verbose: true });
          const destinations = moves.map(m => m.to);
          if (destinations.length > 0) {
            setSelectedSquare(square);
            setLegalMoves(destinations);
          } else {
            setSelectedSquare(null);
            setLegalMoves([]);
          }
        } else {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      }
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
  }, [game, isInteractive, selectedSquare, legalMoves, onMove]);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  return {
    selectedSquare,
    legalMoves,
    handleSquareClick,
    clearSelection,
    setLegalMoves,
  };
};
