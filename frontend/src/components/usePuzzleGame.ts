import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { apiService } from '../api';
import { TranslationKey } from '../i18n/translations';
import {
  PuzzleData,
  applyUciMove,
  getFirstOpponentMove,
  getPlayerColorFromPuzzle
} from './puzzleUtils';

type PuzzleStatus = 'playing' | 'correct' | 'wrong' | 'complete';

type UsePuzzleGameOptions = {
  puzzle: PuzzleData | null;
  loading?: boolean;
  disableMoves?: boolean;
  skipAutoFirstMove?: boolean;
  autoFirstMoveDelayMs?: number;
  onComplete?: (gameCopy: Chess) => void;
  onCorrect?: (gameCopy: Chess, nextMove?: string | null) => void;
  onWrong?: () => void;
  onRatingChange?: (rating: number, delta: number) => void;
};

type UsePuzzleGameResult = {
  game: Chess;
  position: string;
  userMoves: string[];
  status: PuzzleStatus;
  messageKey: TranslationKey | '';
  playerColor: 'white' | 'black';
  isOpponentMoving: boolean;
  setGame: (game: Chess) => void;
  setPosition: (fen: string) => void;
  setUserMoves: (moves: string[]) => void;
  setStatus: (status: PuzzleStatus) => void;
  setMessageKey: (key: TranslationKey | '') => void;
  setPlayerColor: (color: 'white' | 'black') => void;
  handleMove: (sourceSquare: string, targetSquare: string) => boolean;
  checkSolution: (puzzleId: string, moves: string[], gameCopy: Chess, prevFen: string) => Promise<boolean>;
};

export const usePuzzleGame = ({
  puzzle,
  loading = false,
  disableMoves = false,
  skipAutoFirstMove = false,
  autoFirstMoveDelayMs = 400,
  onComplete,
  onCorrect,
  onWrong,
  onRatingChange
}: UsePuzzleGameOptions): UsePuzzleGameResult => {
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState('');
  const [userMoves, setUserMoves] = useState<string[]>([]);
  const [status, setStatus] = useState<PuzzleStatus>('playing');
  const [messageKey, setMessageKey] = useState<TranslationKey | ''>('');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [isOpponentMoving, setIsOpponentMoving] = useState(false);
  const autoPlayedPuzzleId = useRef<string | null>(null);

  useEffect(() => {
    if (!puzzle) return;
    autoPlayedPuzzleId.current = null;

    const chess = new Chess(puzzle.fen);
    setGame(chess);
    setPosition(chess.fen());
    setUserMoves([]);
    setPlayerColor(getPlayerColorFromPuzzle(puzzle));
  }, [puzzle?.id]);

  useEffect(() => {
    if (!puzzle) return;
    autoPlayedPuzzleId.current = null;

    const chess = new Chess(puzzle.fen);
    setGame(chess);
    setPosition(chess.fen());
    setUserMoves([]);
    setPlayerColor(getPlayerColorFromPuzzle(puzzle));
  }, [puzzle?.id]);

  // Play opponent's first move - same as original main branch logic
  useEffect(() => {
    if (!puzzle || loading || skipAutoFirstMove) return undefined;
    if (!puzzle.solution || puzzle.solution.length === 0) return undefined;
    if (autoPlayedPuzzleId.current === puzzle.id) return undefined;

    const firstOpponentMove = getFirstOpponentMove(puzzle);
    if (!firstOpponentMove) return undefined;

    autoPlayedPuzzleId.current = puzzle.id;
    const baseGame = new Chess(puzzle.fen);

    setIsOpponentMoving(true);

    let timeoutId: number | undefined;
    const rafId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        timeoutId = window.setTimeout(() => {
          try {
            if (!applyUciMove(baseGame, firstOpponentMove)) {
              setIsOpponentMoving(false);
              return;
            }

            // Player color is determined by who moves AFTER the opponent's first move
            const playerIsWhite = baseGame.turn() === 'w';
            setPlayerColor(playerIsWhite ? 'white' : 'black');

            setGame(baseGame);
            setPosition(baseGame.fen());
            setUserMoves([firstOpponentMove]);
          } catch (error) {
            console.error('Failed to play opponent\'s first move:', error);
          } finally {
            setIsOpponentMoving(false);
          }
        }, autoFirstMoveDelayMs);
      });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [puzzle, loading, skipAutoFirstMove, autoFirstMoveDelayMs]);

  useEffect(() => {
    if (status !== 'wrong') return undefined;

    const timer = window.setTimeout(() => {
      setMessageKey('');
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [status]);

  const checkSolution = async (puzzleId: string, moves: string[], gameCopy: Chess, prevFen: string) => {
    try {
      const response = await apiService.checkPuzzleSolution(puzzleId, moves, 0);

      if (typeof response?.puzzleRating === 'number' && typeof response?.puzzleRatingChange === 'number') {
        onRatingChange?.(response.puzzleRating, response.puzzleRatingChange);
      }

      if (response.complete) {
        setStatus('complete');
        setMessageKey('puzzleComplete');
        setGame(gameCopy);
        setPosition(gameCopy.fen());
        onComplete?.(gameCopy);
        return true;
      }

      if (response.correct) {
        setStatus('correct');
        setMessageKey('puzzleCorrect');
        setGame(gameCopy);
        setPosition(gameCopy.fen());

        if (response.nextMove) {
          setIsOpponentMoving(true);
          setTimeout(() => {
            setGame(prevGame => {
              const newGame = new Chess(prevGame.fen());
              applyUciMove(newGame, response.nextMove);
              setPosition(newGame.fen());
              return newGame;
            });

            setUserMoves(prev => [...prev, response.nextMove]);
            setIsOpponentMoving(false);
          }, 600);
        }

        onCorrect?.(gameCopy, response.nextMove);
        return true;
      }

      setStatus('wrong');
      setMessageKey('puzzleWrong');
      setGame(new Chess(prevFen));
      setPosition(prevFen);
      setUserMoves(prev => prev.slice(0, -1));
      onWrong?.();
      return false;
    } catch {
      return false;
    }
  };

  const handleMove = (sourceSquare: string, targetSquare: string): boolean => {
    if (!puzzle || status === 'complete' || isOpponentMoving || disableMoves) return false;

    const prevFen = game.fen();
    const gameCopy = new Chess(prevFen);

    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move === null) return false;

      // Build UCI notation with promotion if applicable
      let moveUci = `${sourceSquare}${targetSquare}`;
      if (move.promotion) {
        moveUci += move.promotion;
      }

      const newUserMoves = [...userMoves, moveUci];
      setUserMoves(newUserMoves);

      checkSolution(puzzle.id, newUserMoves, gameCopy, prevFen);
      return true;
    } catch (error) {
      console.error('Move error:', error);
      return false;
    }
  };

  return {
    game,
    position,
    userMoves,
    status,
    messageKey,
    playerColor,
    isOpponentMoving,
    setGame,
    setPosition,
    setUserMoves,
    setStatus,
    setMessageKey,
    setPlayerColor,
    handleMove,
    checkSolution
  };
};
