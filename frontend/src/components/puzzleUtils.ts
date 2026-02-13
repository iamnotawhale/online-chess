import { Chess } from 'chess.js';

export interface PuzzleData {
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

export const getFirstOpponentMove = (data: PuzzleData): string | null => {
  if (!data.solution || data.solution.length === 0) return null;
  return data.solution[0];
};

export const applyUciMove = (game: Chess, moveUci: string): boolean => {
  const from = moveUci.substring(0, 2);
  const to = moveUci.substring(2, 4);
  const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
  try {
    const move = game.move({ from, to, promotion });
    return move !== null;
  } catch {
    return false;
  }
};

export const getPlayerColorFromPuzzle = (data: PuzzleData): 'white' | 'black' => {
  const chess = new Chess(data.fen);
  const firstMove = getFirstOpponentMove(data);
  if (firstMove) {
    if (applyUciMove(chess, firstMove)) {
      return chess.turn() === 'w' ? 'white' : 'black';
    }
  }
  return chess.turn() === 'w' ? 'white' : 'black';
};
