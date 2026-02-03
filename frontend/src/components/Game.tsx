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
  result?: string;
  resultReason?: string;
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
    console.log('Game update received:', update);
    setGame((prevGame) => {
      if (!prevGame) return null;
      const updatedGame = {
        ...prevGame,
        status: update.status,
        fen: update.fenCurrent,
        result: update.result,
        resultReason: update.resultReason,
      };
      // Update chess instance with new FEN
      if (chessInstance) {
        chessInstance.load(update.fenCurrent);
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
        result: gameResponse.result,
        resultReason: gameResponse.resultReason,
      };
      setGame(gameData);
      
      // Initialize chess instance with game FEN
      const chess = new Chess(gameData.fen);
      setChessInstance(chess);
    } catch (err: any) {
      setError('Ошибка загрузки игры');
      console.error(err);
    } finally {
      setLoading(false);
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

      // Make the move on the client side
      chessInstance.move(move);

      // Send move to server
      const moveNotation = `${sourceSquare}${targetSquare}`;
      wsService.sendMove(gameId!, moveNotation);

      return true;
    } catch (error) {
      console.error('Invalid move:', error);
      return false;
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
            <strong>♔ Белые:</strong> {game.whitePlayerName || game.whitePlayerId}
            {userIsWhite && <span className="you-badge">Вы</span>}
          </div>

          <div className="chess-board-wrapper">
            {!isGameActive && (
              <div className="game-over-overlay">
                <div className="game-over-content">
                  <h2>Игра окончена</h2>
                  <p>{game.result}</p>
                  {game.resultReason && <p>{game.resultReason}</p>}
                </div>
              </div>
            )}
            <Chessboard
              position={chessInstance.fen()}
              onPieceDrop={handleOnDrop}
              boardWidth={400}
              customDarkSquareStyle={{ backgroundColor: '#739552' }}
              customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
              customDropSquareStyle={{
                boxShadow: 'inset 0 0 1px 4px rgb(255, 255, 0)',
              }}
            />
          </div>

          <div className="player-info black-player">
            <strong>♚ Чёрные:</strong> {game.blackPlayerName || game.blackPlayerId}
            {!userIsWhite && currentUser && <span className="you-badge">Вы</span>}
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
            <p><strong>Ходов:</strong> {Math.floor(chessInstance.moves().length / 2)}</p>
            {game.resultReason && (
              <p><strong>Причина:</strong> {game.resultReason}</p>
            )}
          </div>

          {isGameActive && (
            <button type="button" onClick={handleResign} className="resign-btn">
              Сдаться
            </button>
          )}

          <div className="fen-display">
            <strong>FEN:</strong>
            <code>{game.fen}</code>
          </div>
        </div>
      </div>
    </div>
  );
};
