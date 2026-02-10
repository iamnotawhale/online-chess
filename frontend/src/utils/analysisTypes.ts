// Types for game analysis

export interface MoveAnalysis {
  moveNumber: number;
  isWhiteMove: boolean;
  move: string; // e.g., "e2e4" or "e4"
  evaluation: number; // Stockfish evaluation in centipawns
  bestMove?: string;
  bestEvaluation?: number;
  alternatives?: {
    move: string;
    evaluation: number;
  }[];
  isMistake: boolean; // Big blunder
  isInaccuracy: boolean; // Small mistake
  isBlunder: boolean; // Major mistake (evaluation drop > 200)
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
  moves: MoveAnalysis[];
  analysisProgress: number; // 0-100
}

export interface AnalysisProgress {
  moveNumber: number;
  totalMoves: number;
  percentage: number;
  currentMove: string;
}

// Evaluation thresholds
export const BLUNDER_THRESHOLD = 200; // cp (centipawns)
export const MISTAKE_THRESHOLD = 50; // cp
export const INACCURACY_THRESHOLD = 20; // cp
