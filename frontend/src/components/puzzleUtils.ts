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

export type PuzzleMoveRow = {
  moveNumber: number;
  white?: string;
  black?: string;
  whiteIndex?: number;
  blackIndex?: number;
};

export const buildPuzzleMoveRows = (startFen: string, notations: string[]): PuzzleMoveRow[] => {
  if (notations.length === 0) return [];

  const startsWithBlack = new Chess(startFen).turn() === 'b';
  const rows: PuzzleMoveRow[] = [];
  let index = 0;
  let moveNumber = 1;

  if (startsWithBlack) {
    rows.push({
      moveNumber: 1,
      black: notations[0],
      blackIndex: 0,
    });
    index = 1;
    moveNumber = 2;
  }

  while (index < notations.length) {
    const whiteIndex = index;
    const white = notations[index];
    index += 1;
    const hasBlack = index < notations.length;
    const blackIndex = hasBlack ? index : undefined;
    const black = hasBlack ? notations[index] : undefined;
    if (hasBlack) index += 1;

    rows.push({
      moveNumber,
      white,
      whiteIndex,
      black,
      blackIndex,
    });
    moveNumber += 1;
  }

  return rows;
};
