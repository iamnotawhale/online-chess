import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { apiService } from '../api';
import { wsService, GameUpdate } from '../websocket';
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
  whiteTimeLeftMs?: number;
  blackTimeLeftMs?: number;
  lastMoveAt?: string;
  result?: string;
  resultReason?: string;
  drawOfferedById?: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  rating: number;
}

export const GameView: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chessInstance, setChessInstance] = useState<Chess | null>(null);
  const [whiteTimeLeftMs, setWhiteTimeLeftMs] = useState<number>(0);
  const [blackTimeLeftMs, setBlackTimeLeftMs] = useState<number>(0);
  const [boardPosition, setBoardPosition] = useState<string>('start');
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [isViewingHistory, setIsViewingHistory] = useState(false);

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
          
          // Return to current position when new move is made
          setIsViewingHistory(false);
          setBoardPosition(update.fenCurrent);
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
      };
      if (update.whiteTimeLeftMs !== undefined) {
        setWhiteTimeLeftMs(update.whiteTimeLeftMs);
      }
      if (update.blackTimeLeftMs !== undefined) {
        setBlackTimeLeftMs(update.blackTimeLeftMs);
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
      const moveNotations = moves.map(m => m.san || m.move);
      setMoveHistory(moveNotations);
      setCurrentMoveIndex(moveNotations.length - 1);
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
      alert('Сейчас не ваш ход');
      return false;
    }

    try {
      const move = chessInstance.moves({ verbose: true }).find(
        m => m.from === sourceSquare && m.to === targetSquare
      );

      if (!move) {
        return false;
      }

      // Optimistically update UI (make move locally)
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
      setIsDragging(true);
    }
  };

  const handlePieceDragEnd = () => {
    setLegalMoves([]);
    setIsDragging(false);
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
      
      // If there's a piece on this square (capture), show different highlight
      if (chessInstance?.get(square as any)) {
        styles[square] = {
          background: 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)',
          borderRadius: '50%',
        };
      }
    });
    
    return styles;
  };

  const goToMove = (moveIndex: number) => {
    if (!game) return;
    
    setIsViewingHistory(moveIndex < moveHistory.length - 1);
    setCurrentMoveIndex(moveIndex);
    
    // If going to start position (index -1)
    if (moveIndex < 0) {
      setBoardPosition('start');
      return;
    }
    
    // Replay moves up to this point
    const tempChess = new Chess();
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
    setBoardPosition('start');
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
    if (!confirm('Вы уверены, что хотите сдаться?')) return;

    try {
      await apiService.resignGame(gameId);
      loadGame();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка при сдаче');
    }
  };

  const handleOfferDraw = async () => {
    if (!gameId) return;
    if (!confirm('Предложить ничью?')) return;

    try {
      await apiService.offerDraw(gameId);
      loadGame();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка при предложении ничьи');
    }
  };

  const handleRespondToDraw = async (accept: boolean) => {
    if (!gameId) return;

    try {
      await apiService.respondToDraw(gameId, accept);
      loadGame();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка при ответе на предложение');
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
      <div className="game-header">
        <h1>Шахматная игра</h1>
        <div className="game-status">
          <span className="status-badge">{game.status.toUpperCase()}</span>
          {game.result && <span className="result-badge">{game.result}</span>}
          {wsConnected && <span className="ws-badge">🟢 Live</span>}
        </div>
      </div>

      <div className="game-content">
        <div className="board-section">
          <div className="player-info white-player">
            <div className="player-name">
              <strong>♔ Белые:</strong> {game.whitePlayerName || game.whitePlayerId}
              {userIsWhite && <span className="you-badge">Вы</span>}
            </div>
            <div className="player-time">{formatTime(whiteTimeLeftMs)}</div>
          </div>

          <div className="chess-board-wrapper">
            {!isGameActive && !isViewingHistory && (
              <div className="game-over-overlay">
                <div className="game-over-content">
                  <h2>Игра окончена</h2>
                  <p>{game.result}</p>
                  {game.resultReason && <p>{game.resultReason}</p>}
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
              boardWidth={400}
              customDarkSquareStyle={{ backgroundColor: '#739552' }}
              customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
              customDropSquareStyle={{
                boxShadow: 'inset 0 0 1px 4px rgb(255, 255, 0)',
              }}
            />
          </div>

          <div className="player-info black-player">
            <div className="player-name">
              <strong>♚ Чёрные:</strong> {game.blackPlayerName || game.blackPlayerId}
              {!userIsWhite && currentUser && <span className="you-badge">Вы</span>}
            </div>
            <div className="player-time">{formatTime(blackTimeLeftMs)}</div>
          </div>

          {isGameActive && (
            <div className="turn-indicator">
              {isUsersTurn ? (
                <span className="your-turn">
                  {chessInstance.turn() === 'w' ? '♔' : '♚'} Ваш ход
                </span>
              ) : (
                <span className="opponent-turn">
                  {chessInstance.turn() === 'w' ? '♔' : '♚'} Ход противника
                </span>
              )}
            </div>
          )}
        </div>

        <div className="info-section">
          <div className="game-info">
            <h3>Информация об игре</h3>
            <p><strong>ID:</strong> {game.id}</p>
            <p><strong>Статус:</strong> {game.status}</p>
            {game.timeControl && (
              <p>
                <strong>Контроль:</strong> {game.timeControl}
                {incrementSeconds > 0 && <span> (инкремент +{incrementSeconds}s)</span>}
              </p>
            )}
            <p><strong>Ходов:</strong> {Math.floor(chessInstance.moves().length / 2)}</p>
            {game.resultReason && (
              <p><strong>Причина:</strong> {game.resultReason}</p>
            )}
          </div>

          {isGameActive && (
            <>
              {game.drawOfferedById && game.drawOfferedById !== currentUser?.id && (
                <div className="draw-offer">
                  <p>Противник предлагает ничью</p>
                  <div className="draw-actions">
                    <button onClick={() => handleRespondToDraw(true)} className="accept-btn">
                      Принять
                    </button>
                    <button onClick={() => handleRespondToDraw(false)} className="decline-btn">
                      Отклонить
                    </button>
                  </div>
                </div>
              )}
              {game.drawOfferedById === currentUser?.id && (
                <div className="draw-offer-sent">
                  <p>Ожидание ответа на предложение ничьи...</p>
                </div>
              )}
              {!game.drawOfferedById && (
                <button type="button" onClick={handleOfferDraw} className="offer-draw-btn">
                  Предложить ничью
                </button>
              )}
              <button type="button" onClick={handleResign} className="resign-btn">
                Сдаться
              </button>
            </>
          )}

          <div className="move-history">
            <h3>История ходов</h3>
            <div className="history-controls">
              <button onClick={goToStart} disabled={currentMoveIndex < 0}>⏮ В начало</button>
              <button onClick={goToPreviousMove} disabled={currentMoveIndex < 0}>◀ Назад</button>
              <button onClick={goToNextMove} disabled={currentMoveIndex >= moveHistory.length - 1}>Вперед ▶</button>
              <button onClick={goToLatest} disabled={!isViewingHistory}>⏭ К актуальной</button>
            </div>
            <div className="moves-list">
              {moveHistory.length === 0 ? (
                <p className="no-moves">Ходов пока нет</p>
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
        </div>
      </div>
    </div>
  );
};
