// Types for game analysis

export interface MoveAnalysis {
  moveNumber: number;
  isWhiteMove: boolean;
  move: string;
  evaluation: number;
  bestMove?: string;
  bestEvaluation?: number;
  centipawnLoss?: number;
  alternatives?: {
    move: string;
    evaluation: number;
  }[];
  isMistake: boolean;
  isInaccuracy: boolean;
  isBlunder: boolean;
}

export interface GameAnalysisResult {
  gameId: string;
  totalMoves: number;
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteMistakes: number;
  blackMistakes: number;
  whiteBlunders: number;
  blackBlunders: number;
  whiteInaccuracies?: number;
  blackInaccuracies?: number;
  moves: MoveAnalysis[];
  analysisProgress: number;
}

export interface AnalysisProgress {
  moveNumber: number;
  totalMoves: number;
  percentage: number;
  currentMove: string;
}

// Evaluation thresholds
export const BLUNDER_THRESHOLD = 300;
export const MISTAKE_THRESHOLD = 100;
export const INACCURACY_THRESHOLD = 50;
