import React, { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getBoardTheme, getBoardColors, BoardTheme } from '../../utils/boardTheme';
import { useChessBoardStyles } from '../../hooks/useChessBoardStyles';
import { useSquareClick } from '../../hooks/useSquareClick';

export interface ChessBoardWrapperProps {
  position: string;
  game: Chess | null;
  onMove?: (from: string, to: string) => boolean;
  onPieceDrop?: (sourceSquare: string, targetSquare: string) => boolean;
  lastMove?: { from: string; to: string } | null;
  orientation?: 'white' | 'black';
  boardWidth?: number;
  isInteractive?: boolean;
  showLegalMoves?: boolean;
  showCheck?: boolean;
  arePiecesDraggable?: boolean;
  customSquareStyles?: { [square: string]: React.CSSProperties };
  onPieceDragBegin?: (piece: string, square: string) => void;
  onPieceDragEnd?: () => void;
}

export const ChessBoardWrapper: React.FC<ChessBoardWrapperProps> = ({
  position,
  game,
  onMove,
  onPieceDrop,
  lastMove,
  orientation = 'white',
  boardWidth = 800,
  isInteractive = true,
  showLegalMoves = true,
  showCheck = true,
  arePiecesDraggable = true,
  customSquareStyles = {},
  onPieceDragBegin,
  onPieceDragEnd,
}) => {
  const [boardTheme, setBoardThemeState] = useState<BoardTheme>(getBoardTheme());

  // Listen for board theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setBoardThemeState(getBoardTheme());
    };
    window.addEventListener('boardThemeChanged', handleThemeChange);
    return () => window.removeEventListener('boardThemeChanged', handleThemeChange);
  }, []);

  // Square click handling
  const squareClick = useSquareClick({
    game,
    isInteractive: isInteractive && showLegalMoves,
    onMove,
  });

  // Compute square styles
  const computedStyles = useChessBoardStyles({
    game,
    selectedSquare: showLegalMoves ? squareClick.selectedSquare : null,
    legalMoves: showLegalMoves ? squareClick.legalMoves : [],
    lastMove,
    showCheck,
  });

  // Merge custom styles with computed styles
  const finalStyles = { ...computedStyles, ...customSquareStyles };

  // Handle piece drag begin
  const handlePieceDragBegin = (piece: string, square: string) => {
    if (showLegalMoves && game) {
      const moves = game.moves({ square: square as any, verbose: true });
      const destinations = moves.map(m => m.to);
      squareClick.setLegalMoves(destinations);
    }
    onPieceDragBegin?.(piece, square);
  };

  // Handle piece drag end
  const handlePieceDragEnd = () => {
    if (showLegalMoves) {
      squareClick.setLegalMoves([]);
    }
    onPieceDragEnd?.();
  };

  // Handle piece drop or square click
  const handleOnDrop = onPieceDrop || ((from: string, to: string) => {
    const result = onMove?.(from, to);
    if (result !== false && showLegalMoves) {
      squareClick.clearSelection();
    }
    return result ?? false;
  });

  return (
    <Chessboard
      position={position}
      onPieceDrop={handleOnDrop}
      onSquareClick={showLegalMoves ? squareClick.handleSquareClick : undefined}
      onPieceDragBegin={handlePieceDragBegin}
      onPieceDragEnd={handlePieceDragEnd}
      customSquareStyles={finalStyles}
      boardOrientation={orientation}
      boardWidth={boardWidth}
      arePiecesDraggable={arePiecesDraggable && isInteractive}
      customDarkSquareStyle={{ backgroundColor: getBoardColors(boardTheme).dark }}
      customLightSquareStyle={{ backgroundColor: getBoardColors(boardTheme).light }}
      customBoardStyle={{
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
      }}
    />
  );
};
