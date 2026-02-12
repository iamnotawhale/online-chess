import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { apiService } from '../api';
import { wsService, GameUpdate } from '../websocket';
import { useTranslation } from '../i18n/LanguageContext';
import { getBoardTheme, getBoardColors, BoardTheme } from '../utils/boardTheme';
import './Game.css';

interface GameData {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  whitePlayerName?: string;
  blackPlayerName?: string;
  status: string;
  fen: string;
  timeControl?: string;
  gameMode?: string;
  rated?: boolean;
  whiteTimeLeftMs?: number;
  blackTimeLeftMs?: number;
  lastMoveAt?: string;
  result?: string;
  resultReason?: string;
  drawOfferedById?: string | null;
}

interface User {
  id: string;
  email: string;
  username: string;
  rating: number;
}

export const GameView: React.FC = () => {
    // Таймер для плавного уменьшения времени
    const timerRef = useRef<number | null>(null);
    // Для диалога promotion
    const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
    const [promotionData, setPromotionData] = useState<{ from: string; to: string } | null>(null);

  const { t } = useTranslation();
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chessInstance, setChessInstance] = useState<Chess | null>(null);
  const [whiteTimeLeftMs, setWhiteTimeLeftMs] = useState<number>(0);
  const [blackTimeLeftMs, setBlackTimeLeftMs] = useState<number>(0);
  const [whiteTimeBase, setWhiteTimeBase] = useState<number>(0);
  const [blackTimeBase, setBlackTimeBase] = useState<number>(0);
  const [lastMoveAt, setLastMoveAt] = useState<number | null>(null);
  const [timeUpdateReceivedAt, setTimeUpdateReceivedAt] = useState<number>(Date.now());
  const [boardPosition, setBoardPosition] = useState<string>('start');
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [moveFens, setMoveFens] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const lastDrawOfferRef = useRef<string | null>(null);
  const isViewingHistoryRef = useRef(false);
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [boardWidth, setBoardWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 600;
    const isMobile = window.innerWidth <= 768;
    return isMobile ? Math.max(320, window.innerWidth) : 800;
  });
  const [boardTheme, setBoardThemeState] = useState<BoardTheme>(getBoardTheme());

  // Listen for board theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setBoardThemeState(getBoardTheme());
    };
    window.addEventListener('boardThemeChanged', handleThemeChange);
    return () => window.removeEventListener('boardThemeChanged', handleThemeChange);
  }, []);

  // Очистить таймер при размонтировании
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Отслеживать состояние просмотра истории в ref
  useEffect(() => {
    isViewingHistoryRef.current = isViewingHistory;
  }, [isViewingHistory]);

  // Запустить таймер, если партия активна (со второго хода белых)
  useEffect(() => {
    if (!game || !chessInstance || !wsConnected || game.status !== 'active' || lastMoveAt === null) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    // Таймер запускается только после двух полуходов (1 ход белых + 1 ход черных)
    const moveCount = chessInstance.history().length;
    if (moveCount < 2) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    timerRef.current = setInterval(() => {
      if (game.status !== 'active') return;
      
      const turn = chessInstance.turn();
      // Считаем время от момента получения последнего обновления от сервера
      const elapsedMs = Date.now() - timeUpdateReceivedAt;
      
      if (turn === 'w') {
        setWhiteTimeLeftMs(Math.max(whiteTimeBase - elapsedMs, 0));
      } else {
        setBlackTimeLeftMs(Math.max(blackTimeBase - elapsedMs, 0));
      }
    }, 100); // Update more frequently for smoother countdown
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [game, chessInstance, wsConnected, lastMoveAt, whiteTimeBase, blackTimeBase, timeUpdateReceivedAt]);

  useEffect(() => {
    loadGame();
    loadCurrentUser();
    // Connect to WebSocket
    const token = apiService.getToken();
    if (token && gameId) {
      wsService.connect(token)
        .then(() => {
          setWsConnected(true);
          // Subscribe to game updates
          wsService.subscribeToGame(gameId, handleGameUpdate);
        })
        .catch((err) => {
          console.error('WebSocket connection failed:', err);
        });
    }
    return () => {
      if (gameId) {
        wsService.unsubscribeFromGame(gameId);
      }
    };
  }, [gameId]);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      setBoardWidth(isMobile ? Math.max(320, window.innerWidth) : 800);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = (message: string, type: 'info' | 'error' = 'info', timeout = 3000) => {
    setToast({ message, type });
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), timeout);
  };

  const handleGameUpdate = (update: GameUpdate) => {
    console.log('📨 Game update received:', {
      fen: update.fenCurrent,
      whiteTime: update.whiteTimeLeftMs,
      blackTime: update.blackTimeLeftMs,
      status: update.status,
      result: update.result,
      resultReason: update.resultReason
    });
    
    // Update chess instance with new FEN immediately
    if (update.fenCurrent) {
      const currentFen = chessInstance?.fen();
      if (currentFen !== update.fenCurrent) {
        try {
          // Create new Chess instance to force React re-render
          const newChess = new Chess(update.fenCurrent);
          setChessInstance(newChess);
          console.log('♟️ Chess position updated from:', currentFen, 'to:', update.fenCurrent);
          
          // Reload move history when position changes (new move made)
          loadMoveHistory();
          
          // Return to current position when new move is made, but only if not viewing history
          setIsViewingHistory((isViewing) => {
            if (!isViewing) {
              setBoardPosition(update.fenCurrent);
            }
            return isViewing; // Preserve viewing history state
          });
        } catch (error) {
          console.error('❌ Failed to load FEN:', update.fenCurrent, error);
        }
      }
      // Don't update board position if viewing history and FEN hasn't changed
    }
    
    // Show game end notification    // Show game end notification
    if (update.status === 'completed' && update.result && update.resultReason) {
      let message = '';
      if (update.resultReason === 'checkmate') {
        if (update.result === '1-0') {
          message = '♔ Мат! Белые победили!';
        } else if (update.result === '0-1') {
          message = '♔ Мат! Черные победили!';
        }
      } else if (update.resultReason === 'stalemate') {
        message = '♔ Пат! Ничья!';
      } else if (update.resultReason === 'timeout') {
        message = '⏰ Время вышло!';
      } else if (update.resultReason === 'resignation') {
        message = '🏳️ Сдались!';
      }
      
      if (message) {
        setTimeout(() => alert(message), 500);
      }
    }
    
    setGame((prevGame) => {
      if (!prevGame) return null;
      const updatedGame = {
        ...prevGame,
        status: update.status,
        fen: update.fenCurrent,
        result: update.result,
        resultReason: update.resultReason,
        whiteTimeLeftMs: update.whiteTimeLeftMs ?? prevGame.whiteTimeLeftMs,
        blackTimeLeftMs: update.blackTimeLeftMs ?? prevGame.blackTimeLeftMs,
        lastMoveAt: update.lastMoveAt ?? prevGame.lastMoveAt,
        // Always update drawOfferedById even if it's null (draw declined)
        drawOfferedById: 'drawOfferedById' in update ? update.drawOfferedById : prevGame.drawOfferedById,
      };
      if (update.whiteTimeLeftMs !== undefined) {
        setWhiteTimeLeftMs(update.whiteTimeLeftMs);
        setWhiteTimeBase(update.whiteTimeLeftMs);
      }
      if (update.blackTimeLeftMs !== undefined) {
        setBlackTimeLeftMs(update.blackTimeLeftMs);
        setBlackTimeBase(update.blackTimeLeftMs);
      }
      // Фиксируем момент получения обновления времени
      if (update.whiteTimeLeftMs !== undefined || update.blackTimeLeftMs !== undefined) {
        setTimeUpdateReceivedAt(Date.now());
      }
      if (update.lastMoveAt) {
        setLastMoveAt(new Date(update.lastMoveAt).getTime());
      } else if (update.whiteTimeLeftMs !== undefined || update.blackTimeLeftMs !== undefined) {
        // Если получили обновление времени, но нет lastMoveAt, обновляем текущее время
        setLastMoveAt(Date.now());
      }
      if (update.drawOfferedById !== undefined) {
        const nextOfferId = update.drawOfferedById || null;
        const prevOfferId = lastDrawOfferRef.current;
        
        // New draw offer
        if (nextOfferId && nextOfferId !== prevOfferId && currentUser?.id && nextOfferId !== currentUser.id) {
          showToast(t('opponentOffersDrawMsg'), 'info', 4000);
        }
        
        // Draw offer declined (was set, now null, and current user was the one who offered)
        if (prevOfferId && !nextOfferId && prevOfferId === currentUser?.id) {
          showToast(t('drawDeclined'), 'info', 3000);
        }
        
        lastDrawOfferRef.current = nextOfferId;
      }
      return updatedGame;
    });
  };

  const loadCurrentUser = async () => {
    try {
      const user = await apiService.getMe();
      setCurrentUser(user);
    } catch (err) {
      console.error('Error loading current user:', err);
    }
  };

  const getGameMode = (timeControl?: string): string => {
    if (!timeControl) return 'Custom';
    const match = timeControl.match(/^(\d+)\+(\d+)$/);
    if (!match) return 'Custom';
    const minutes = parseInt(match[1]);
    const increment = parseInt(match[2]);
    const totalTime = minutes * 60 + increment * 40;
    
    if (totalTime < 180) return 'Bullet';
    if (totalTime < 480) return 'Blitz';
    if (totalTime < 1500) return 'Rapid';
    return 'Classical';
  };

  const loadGame = async () => {
    if (!gameId) return;
    try {
      setLoading(true);
      const gameResponse = await apiService.getGame(gameId);
      // Map API response to GameData with fenCurrent -> fen
      const gameData: GameData = {
        id: gameResponse.id,
        whitePlayerId: gameResponse.whitePlayerId,
        blackPlayerId: gameResponse.blackPlayerId,
        whitePlayerName: gameResponse.whiteUsername,
        blackPlayerName: gameResponse.blackUsername,
        status: gameResponse.status,
        fen: gameResponse.fenCurrent,
        timeControl: gameResponse.timeControl,
        gameMode: getGameMode(gameResponse.timeControl),
        rated: gameResponse.rated,
        whiteTimeLeftMs: gameResponse.whiteTimeLeftMs,
        blackTimeLeftMs: gameResponse.blackTimeLeftMs,
        lastMoveAt: gameResponse.lastMoveAt,
        result: gameResponse.result,
        resultReason: gameResponse.resultReason,
        drawOfferedById: gameResponse.drawOfferedById,
      };
      setGame(gameData);
      setWhiteTimeLeftMs(gameData.whiteTimeLeftMs || 0);
      setBlackTimeLeftMs(gameData.blackTimeLeftMs || 0);
      setWhiteTimeBase(gameData.whiteTimeLeftMs || 0);
      setBlackTimeBase(gameData.blackTimeLeftMs || 0);
      setTimeUpdateReceivedAt(Date.now()); // Запомнить момент получения времени
      if (gameData.lastMoveAt) {
        setLastMoveAt(new Date(gameData.lastMoveAt).getTime());
      } else {
        setLastMoveAt(Date.now()); // Если нет lastMoveAt, считаем что ход только что произошёл
      }
      
      // Initialize chess instance with game FEN
      const chess = new Chess(gameData.fen);
      setChessInstance(chess);
      setBoardPosition(gameData.fen);
      
      // Load move history
      await loadMoveHistory();
    } catch (err: any) {
      setError('Ошибка загрузки игры');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoveHistory = async () => {
    if (!gameId) return;
    try {
      const moves = await apiService.getGameMoves(gameId);
      const chess = new Chess(START_FEN);
      const moveNotations = moves.map((m: any) => {
        const raw = m.san || m.move || '';
        const uciPattern = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;
        try {
          if (uciPattern.test(raw)) {
            const from = raw.slice(0, 2);
            const to = raw.slice(2, 4);
            const promotion = raw.length === 5 ? raw[4].toLowerCase() : undefined;
            const result = chess.move({ from, to, promotion } as any);
            return result?.san || raw;
          }
          const result = chess.move(raw as any);
          return result?.san || raw;
        } catch (e) {
          console.error('Error parsing move for notation:', raw, e);
          return raw;
        }
      });
      const movePositions = moves.map((m: any) => m.fen || '');
      setMoveHistory(moveNotations);
      setMoveFens(movePositions);
      
      // Только обновляем currentMoveIndex если пользователь НЕ просматривает историю
      if (!isViewingHistoryRef.current) {
        setCurrentMoveIndex(moveNotations.length - 1);
      }
    } catch (err) {
      console.error('Error loading move history:', err);
    }
  };

  const handleOnDrop = (sourceSquare: string, targetSquare: string) => {
    if (!game || !chessInstance || !currentUser) return false;
    if (game.status !== 'active') return false;

    // Determine if current user is white or black
    const userIsWhite = game.whitePlayerId === currentUser.id;
    const isUsersTurn = (userIsWhite && chessInstance.turn() === 'w') ||
                        (!userIsWhite && chessInstance.turn() === 'b');

    if (!isUsersTurn) {
      alert(t('notYourTurn'));
      return false;
    }

    try {
      const move = chessInstance.moves({ verbose: true }).find(
        m => m.from === sourceSquare && m.to === targetSquare
      );

      if (!move) {
        return false;
      }

      // Check if this is a promotion move
      const piece = chessInstance.get(sourceSquare as any);
      const isPawnMove = piece?.type === 'p';
      const isLastRank = (userIsWhite && targetSquare[1] === '8') || 
                         (!userIsWhite && targetSquare[1] === '1');
      
      if (isPawnMove && isLastRank) {
        // Show promotion dialog
        setPromotionData({ from: sourceSquare, to: targetSquare });
        setPromotionDialogOpen(true);
        return true; // Keep piece in hand while waiting for promotion choice
      }

      // Regular move - make it immediately
      const result = chessInstance.move(move);
      if (!result) {
        return false;
      }
      
      // Update board position state immediately
      setBoardPosition(chessInstance.fen());
      
      // Clear selection
      setSelectedSquare(null);
      setLegalMoves([]);

      // Send move to server (WebSocket will confirm or correct the position)
      const moveNotation = `${sourceSquare}${targetSquare}`;
      wsService.sendMove(gameId!, moveNotation);
      
      console.log('Move sent to server:', moveNotation);

      return true;
    } catch (error) {
      console.error('Invalid move:', error);
      return false;
    }
  };

  const handleSquareClick = (square: string) => {
    if (!game || !chessInstance || !currentUser) return;
    if (game.status !== 'active') return;

    const userIsWhite = game.whitePlayerId === currentUser.id;
    const isUsersTurn = (userIsWhite && chessInstance.turn() === 'w') ||
                        (!userIsWhite && chessInstance.turn() === 'b');

    if (!isUsersTurn) return;

    // If a square is already selected
    if (selectedSquare) {
      // Try to make a move to the clicked square
      if (legalMoves.includes(square)) {
        handleOnDrop(selectedSquare, square);
      }
      // Deselect
      setSelectedSquare(null);
      setLegalMoves([]);
    } else {
      // Select this square and show legal moves
      const piece = chessInstance.get(square as any);
      if (piece && 
          ((piece.color === 'w' && userIsWhite) || 
           (piece.color === 'b' && !userIsWhite))) {
        const moves = chessInstance.moves({ square: square as any, verbose: true });
        const destinations = moves.map(m => m.to);
        setSelectedSquare(square);
        setLegalMoves(destinations);
      }
    }
  };

  const handlePieceDragBegin = (_piece: string, square: string) => {
    if (!chessInstance || !currentUser || !game) return;
    
    const userIsWhite = game.whitePlayerId === currentUser.id;
    const isUsersTurn = (userIsWhite && chessInstance.turn() === 'w') ||
                        (!userIsWhite && chessInstance.turn() === 'b');
    
    if (isUsersTurn) {
      const moves = chessInstance.moves({ square: square as any, verbose: true });
      const destinations = moves.map(m => m.to);
      setLegalMoves(destinations);
    }
  };

  const handlePieceDragEnd = () => {
    setLegalMoves([]);
  };

  const handlePromotionChoice = (piece: string) => {
    if (!promotionData || !game || !chessInstance || !gameId) return;

    const { from, to } = promotionData;
    
    try {
      // Make the move with promotion
      const result = chessInstance.move({
        from,
        to,
        promotion: piece,
      } as any);

      if (!result) {
        console.error('Move failed after choosing promotion');
        setPromotionDialogOpen(false);
        setPromotionData(null);
        return;
      }

      // Update board position
      setBoardPosition(chessInstance.fen());
      setSelectedSquare(null);
      setLegalMoves([]);

      // Send move to server with promotion
      const moveNotation = `${from}${to}${piece}`;
      wsService.sendMove(gameId, moveNotation);
      
      console.log('Promotion move sent:', moveNotation);

      // Close dialog
      setPromotionDialogOpen(false);
      setPromotionData(null);
    } catch (error) {
      console.error('Error during promotion:', error);
      setPromotionDialogOpen(false);
      setPromotionData(null);
    }
  };

  const getSquareStyles = () => {
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
      if (chessInstance?.get(square as any)) {
        styles[square] = {
          background: 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)',
          borderRadius: '50%',
        };
      }
    });

    // Подсветка последнего хода
    if (moveHistory.length > 0 && !isViewingHistory) {
      // Получаем последний ход в SAN или UCI
      const lastMove = moveHistory[moveHistory.length - 1];
      // Попробуем извлечь from/to из SAN или UCI
      let fromSquare = null;
      let toSquare = null;
      // UCI: e2e4, SAN: e4, Nf3, exd5, etc.
      const uciPattern = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;
      if (uciPattern.test(lastMove)) {
        fromSquare = lastMove.slice(0, 2);
        toSquare = lastMove.slice(2, 4);
      } else {
        // chess.js move history: get last move object
        try {
          const tempChess = new Chess(START_FEN);
          moveHistory.forEach(m => tempChess.move(m));
          const history = tempChess.history({ verbose: true });
          if (history.length > 0) {
            fromSquare = history[history.length - 1].from;
            toSquare = history[history.length - 1].to;
          }
        } catch {}
      }
      if (fromSquare) {
        styles[fromSquare] = {
          backgroundColor: 'rgba(52, 152, 219, 0.18)',
        };
      }
      if (toSquare) {
        styles[toSquare] = {
          backgroundColor: 'rgba(52, 152, 219, 0.28)',
        };
      }
    }

    // Highlight king in check
    try {
      const fenToUse = boardPosition === 'start' ? START_FEN : boardPosition;
      const tempChess = new Chess(fenToUse);
      if (tempChess.inCheck()) {
        const kingColor = tempChess.turn();
        const board = tempChess.board();
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
          const isCheckmate = typeof tempChess.isCheckmate === 'function'
            ? tempChess.isCheckmate()
            : false;
          styles[kingSquare] = {
            backgroundColor: 'rgba(231, 76, 60, 0.45)',
            animation: isCheckmate ? 'kingMatePulse 1s ease-in-out infinite' : undefined,
          };
        }
      }
    } catch (e) {
      console.error('Failed to compute check highlight', e);
    }

    return styles;
  };

  const goToMove = (moveIndex: number) => {
    if (!game) return;
    
    setIsViewingHistory(moveIndex < moveHistory.length - 1);
    setCurrentMoveIndex(moveIndex);
    
    // If going to start position (index -1)
    if (moveIndex < 0) {
      setBoardPosition(START_FEN);
      return;
    }

    const fenAtMove = moveFens[moveIndex];
    if (fenAtMove) {
      setBoardPosition(fenAtMove);
      return;
    }

    // Fallback: replay moves up to this point if FEN is missing
    const tempChess = new Chess(START_FEN);
    for (let i = 0; i <= moveIndex && i < moveHistory.length; i++) {
      try {
        tempChess.move(moveHistory[i]);
      } catch (e) {
        console.error('Error replaying move:', moveHistory[i], e);
      }
    }
    setBoardPosition(tempChess.fen());
  };

  const goToStart = () => {
    setIsViewingHistory(true);
    setCurrentMoveIndex(-1);
    setBoardPosition(START_FEN);
  };

  const goToPreviousMove = () => {
    if (currentMoveIndex >= -1) {
      const newIndex = currentMoveIndex - 1;
      if (newIndex >= -1) {
        goToMove(newIndex);
      }
    }
  };

  const goToNextMove = () => {
    if (currentMoveIndex < moveHistory.length - 1) {
      goToMove(currentMoveIndex + 1);
    }
  };

  const goToLatest = () => {
    if (moveHistory.length > 0) {
      goToMove(moveHistory.length - 1);
      setIsViewingHistory(false);
    }
  };

  const handleResign = async () => {
    if (!gameId) return;
    if (!confirm(t('confirmResign'))) return;

    try {
      await apiService.resignGame(gameId);
      loadGame();
    } catch (err: any) {
      alert(err.response?.data?.message || t('errorResign'));
    }
  };

  const handleOfferDraw = async () => {
    if (!gameId) return;
    if (!confirm(t('confirmOfferDraw'))) return;

    try {
      await apiService.offerDraw(gameId);
      loadGame();
    } catch (err: any) {
      alert(err.response?.data?.error || t('errorOfferDraw'));
    }
  };

  const handleRespondToDraw = async (accept: boolean) => {
    if (!gameId) return;

    try {
      await apiService.respondToDraw(gameId, accept);
      loadGame();
    } catch (err: any) {
      alert(err.response?.data?.error || t('errorRespondDraw'));
    }
  };

  const formatTime = (timeMs: number) => {
    const totalSeconds = Math.max(Math.floor(timeMs / 1000), 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getIncrementSeconds = (control?: string) => {
    if (!control || !control.includes('+')) return 0;
    const parts = control.split('+');
    if (parts.length < 2) return 0;
    const inc = parseInt(parts[1], 10);
    return Number.isNaN(inc) ? 0 : inc;
  };

  const getStatusLabel = (status: string): string => {
    const statuses: Record<string, string> = {
      active: t('active'),
      finished: t('finished'),
    };
    return statuses[status] || status;
  };

  const getResultReasonLabel = (reason?: string): string => {
    if (!reason) return '';
    const reasons: Record<string, string> = {
      checkmate: t('checkmate'),
      resignation: t('resignation'),
      timeout: t('timeout'),
      stalemate: t('stalemate'),
      agreement: t('agreement'),
    };
    return reasons[reason] || reason;
  };

  const getResultLabel = (result?: string): string => {
    if (!result) return '';
    if (result === '1/2-1/2') return t('draw');
    return result;
  };

  if (loading) {
    return <div className="game-container"><p>Загрузка игры...</p></div>;
  }

  if (error) {
    return <div className="game-container"><p className="error">{error}</p></div>;
  }

  if (!game || !chessInstance) {
    return <div className="game-container"><p>Игра не найдена</p></div>;
  }

  const isGameActive = game.status === 'active';
  const userIsWhite = currentUser && game.whitePlayerId === currentUser.id;
  const isUsersTurn = currentUser && (
    (userIsWhite && chessInstance.turn() === 'w') ||
    (!userIsWhite && chessInstance.turn() === 'b')
  );
  const incrementSeconds = getIncrementSeconds(game.timeControl);

  return (
    <div className="game-container">
      {toast && (
        <div className={`game-toast ${toast.type || 'info'}`}>
          {toast.message}
        </div>
      )}
      <div className="game-header">
        <h1>{game.gameMode} ({game.timeControl})</h1>
        <div className="game-status">
          <span className={`status-badge ${game.status === 'finished' ? 'finished' : 'active'}`}>
            {getStatusLabel(game.status).toUpperCase()}
          </span>
          {game.result && <span className="result-badge">{getResultLabel(game.result)}</span>}
          {wsConnected && game.status === 'active' && <span className="ws-badge">🟢 Live</span>}
        </div>
      </div>

      <div className="game-content">
        <div className="board-section">
          {userIsWhite ? (
            <div className="player-info black-player">
              <div className="player-name">
                <strong>♚ {t('blacks')}:</strong> {game.blackPlayerName || game.blackPlayerId}
              </div>
              <div className="player-time">{formatTime(blackTimeLeftMs)}</div>
            </div>
          ) : (
            <div className="player-info white-player">
              <div className="player-name">
                <strong>♔ {t('whites')}:</strong> {game.whitePlayerName || game.whitePlayerId}
              </div>
              <div className="player-time">{formatTime(whiteTimeLeftMs)}</div>
            </div>
          )}

          <div className="chess-board-wrapper">
            {!isGameActive && !isViewingHistory && (
              <div className="game-over-overlay">
                <div className="game-over-content">
                  <h2>{t('gameFinished')}</h2>
                  <p>{game.result === '1/2-1/2' ? '1/2-1/2' : getResultLabel(game.result)}</p>
                  {game.resultReason && <p>{getResultReasonLabel(game.resultReason)}</p>}
                </div>
              </div>
            )}
            <Chessboard
              position={boardPosition}
              onPieceDrop={handleOnDrop}
              onSquareClick={handleSquareClick}
              onPieceDragBegin={handlePieceDragBegin}
              onPieceDragEnd={handlePieceDragEnd}
              customSquareStyles={getSquareStyles()}
              boardOrientation={userIsWhite ? 'white' : 'black'}
              boardWidth={boardWidth}
              customDarkSquareStyle={{ backgroundColor: getBoardColors(boardTheme).dark }}
              customLightSquareStyle={{ backgroundColor: getBoardColors(boardTheme).light }}
              customDropSquareStyle={{
                boxShadow: 'inset 0 0 1px 4px rgb(255, 255, 0)',
              }}
            />
          </div>

          {userIsWhite ? (
            <div className="player-info white-player">
              <div className="player-name">
                <strong>♔ {t('whites')}:</strong> {game.whitePlayerName || game.whitePlayerId}
                <span className="you-badge">{t('you')}</span>
              </div>
              <div className="player-time">{formatTime(whiteTimeLeftMs)}</div>
            </div>
          ) : (
            <div className="player-info black-player">
              <div className="player-name">
                <strong>♙ {t('blacks')}:</strong> {game.blackPlayerName || game.blackPlayerId}
                <span className="you-badge">{t('you')}</span>
              </div>
              <div className="player-time">{formatTime(blackTimeLeftMs)}</div>
            </div>
          )}

          {isGameActive && (
            <div className="turn-indicator">
              {isUsersTurn ? (
                <span className="your-turn">
                  {chessInstance.turn() === 'w' ? '♔' : '♚'} {t('yourTurn')}
                </span>
              ) : (
                <span className="opponent-turn">
                  {chessInstance.turn() === 'w' ? '♔' : '♚'} {t('opponentTurn')}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="info-section">
          <div className="move-history">
            <h3>{t('moveHistory')}</h3>
            <div className="history-controls">
              <button 
                onClick={goToStart} 
                disabled={currentMoveIndex < 0}
                title={t('toStart')}
              >
                ⏮
              </button>
              <button 
                onClick={goToPreviousMove} 
                disabled={currentMoveIndex < 0}
                title={t('previous')}
              >
                ◀
              </button>
              <button 
                onClick={goToNextMove} 
                disabled={currentMoveIndex >= moveHistory.length - 1}
                title={t('next')}
              >
                ▶
              </button>
              <button 
                onClick={goToLatest} 
                disabled={!isViewingHistory}
                title={t('toLatest')}
              >
                ⏭
              </button>
            </div>
            <div className="moves-list">
              {moveHistory.length === 0 ? (
                <p className="no-moves">{t('noMoves')}</p>
              ) : (
                <div className="moves-grid">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, pairIndex) => {
                    const whiteIndex = pairIndex * 2;
                    const blackIndex = pairIndex * 2 + 1;
                    const whiteMove = moveHistory[whiteIndex];
                    const blackMove = blackIndex < moveHistory.length ? moveHistory[blackIndex] : null;
                    
                    return (
                      <div key={pairIndex} className="move-row">
                        <button
                          className={`move-button ${whiteIndex === currentMoveIndex ? 'current' : ''}`}
                          onClick={() => goToMove(whiteIndex)}
                        >
                          {whiteMove}
                        </button>
                        {blackMove ? (
                          <button
                            className={`move-button ${blackIndex === currentMoveIndex ? 'current' : ''}`}
                            onClick={() => goToMove(blackIndex)}
                          >
                            {blackMove}
                          </button>
                        ) : (
                          <div></div>
                        )}
                      </div>
                    );  
                  })}
                </div>
              )}
            </div>
          </div>
          
          <div className="game-info">
            <h3>{t('gameInfo')}</h3>
            <p><strong>{t('id')}:</strong> {game.id}</p>
            <p><strong>{t('status')}:</strong> {getStatusLabel(game.status)}</p>
            <p><strong>{t('type')}:</strong> {game.rated ? t('rated') : t('unrated')}</p>
            {game.timeControl && (
              <p>
                <strong>{t('control')}:</strong> {game.timeControl}
                {incrementSeconds > 0 && <span> ({t('incrementSuffix')} +{incrementSeconds}s)</span>}
              </p>
            )}
            <p><strong>{t('moves')}:</strong> {Math.ceil(moveHistory.length / 2)}</p>
            {game.resultReason && (
              <p><strong>{t('reason')}:</strong> {getResultReasonLabel(game.resultReason)}</p>
            )}
          </div>

          {isGameActive && (
            <>
              {game.drawOfferedById && game.drawOfferedById !== currentUser?.id && (
                <div className="draw-offer">
                  <p>{t('opponentOffersDrawMsg')}</p>
                  <div className="draw-actions">
                    <button onClick={() => handleRespondToDraw(true)} className="accept-btn">
                      {t('acceptBtn')}
                    </button>
                    <button onClick={() => handleRespondToDraw(false)} className="decline-btn">
                      {t('declineBtn')}
                    </button>
                  </div>
                </div>
              )}
              {game.drawOfferedById === currentUser?.id && (
                <div className="draw-offer-sent">
                  <p>{t('waitingForDrawResponse')}</p>
                </div>
              )}
              {!game.drawOfferedById && (
                <button type="button" onClick={handleOfferDraw} className="offer-draw-btn">
                  {t('offerDraw')}
                </button>
              )}
              <button type="button" onClick={handleResign} className="resign-btn">
                {t('resign')}
              </button>
            </>
          )}

        
        </div>
        
        {/* Promotion Dialog */}
        {promotionDialogOpen && promotionData && (
          <div className="promotion-overlay">
            <div className="promotion-dialog">
              <h3>{t('promotionTitle')}</h3>
              <div className="promotion-options">
                <button className="promotion-btn" onClick={() => handlePromotionChoice('q')}>
                  ♕ {t('promotionQueen')}
                </button>
                <button className="promotion-btn" onClick={() => handlePromotionChoice('r')}>
                  ♖ {t('promotionRook')}
                </button>
                <button className="promotion-btn" onClick={() => handlePromotionChoice('b')}>
                  ♗ {t('promotionBishop')}
                </button>
                <button className="promotion-btn" onClick={() => handlePromotionChoice('n')}>
                  ♘ {t('promotionKnight')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
