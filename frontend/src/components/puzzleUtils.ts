import { Chess } from 'chess.js';

export interface PuzzleData {
  id: string;
  fen: string;
  firstMove: string; // Only first opponent move, not full solution
  rating: number;
  themes: string[];
  alreadySolved: boolean;
  userPuzzleRating?: number;
}

export const getFirstOpponentMove = (data: PuzzleData): string | null => {
  return data.firstMove || null;
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
