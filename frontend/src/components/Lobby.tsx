import React, { useState, useEffect } from 'react';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import './Lobby.css';

interface LobbyGame {
  id: string;
  creatorUsername: string;
  creatorRating: number;
  creatorId: string;
  gameMode: string;
  timeControl: string;
  preferredColor: string;
  rated: boolean;
  createdAt: string;
}

interface LobbyProps {
  onGameStart?: (gameId: string) => void;
  onGameCancelled?: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onGameStart, onGameCancelled }) => {
  const { t } = useTranslation();
  const [games, setGames] = useState<LobbyGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadLobbyGames();
    const interval = setInterval(loadLobbyGames, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await apiService.getMe();
      setCurrentUserId(user.id);
    } catch (err) {
      console.error('Ошибка загрузки пользователя', err);
    }
  };

  const loadLobbyGames = async () => {
    try {
      const response = await apiService.getLobbyGames();
      setGames(response);
      setError('');
    } catch (err) {
      setError(t('error'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    setJoiningGameId(gameId);
    try {
      const response = await apiService.joinLobbyGame(gameId);
      if (onGameStart) {
        onGameStart(response.gameId);
      }
      setGames(games.filter(g => g.id !== gameId));
    } catch (err) {
      setError(t('error'));
      console.error(err);
    } finally {
      setJoiningGameId(null);
    }
  };

  const handleCancelGame = async (gameId: string) => {
    setJoiningGameId(gameId);
    try {
      await apiService.cancelLobbyGame(gameId);
      setGames(games.filter(g => g.id !== gameId));
      setError('');
      onGameCancelled?.();
    } catch (err) {
      setError(t('error'));
      console.error(err);
    } finally {
      setJoiningGameId(null);
    }
  };

  const getColorLabel = (color: string) => {
    const colors: Record<string, string> = {
      white: t('white'),
      black: t('black'),
      random: t('random'),
    };
    return colors[color] || color;
  };

  const getDisplayColor = (game: LobbyGame): string => {
    // Если текущий пользователь - создатель, показываем его выбранный цвет
    if (currentUserId === game.creatorId) {
      return game.preferredColor;
    }
    
    // Для других игроков показываем противоположный цвет
    if (game.preferredColor === 'white') {
      return 'black';
    } else if (game.preferredColor === 'black') {
      return 'white';
    } else {
      // Если random, остаётся random
      return 'random';
    }
  };

  if (loading && games.length === 0) {
    return <><p>{t('loading')}</p></>;
  }

  return (
    <>
      <h2>{t('lobby')}</h2>
      {error && <p className="error">{error}</p>}
      
      {games.length === 0 ? (
        <p className="no-games">{t('noAvailableGames')}</p>
      ) : (
        <div className="games-grid">
          {games.map((game) => (
            <div key={game.id} className="lobby-game-card">
              <div className="game-header">
                <div className="creator-info">
                  <span className="creator-name">{game.creatorUsername}</span>
                  <span className="creator-rating">{game.creatorRating}</span>
                </div>
                <div className="game-type">
                  {game.rated ? <span className="badge rated">{t('rated')}</span> : <span className="badge casual">{t('unrated')}</span>}
                </div>
              </div>
              
              <div className="game-details">
                <div className="detail-row">
                  <span className="label">{t('gameMode')}:</span>
                  <span className="value">{game.gameMode === 'custom' ? t('custom') : game.gameMode}</span>
                </div>
                <div className="detail-row">
                  <span className="label">{t('timeControl')}:</span>
                  <span className="value">{game.timeControl}</span>
                </div>
                <div className="detail-row">
                  <span className="label">{t('preferredColor')}:</span>
                  <span className="value">{getColorLabel(getDisplayColor(game))}</span>
                </div>
              </div>

              <button
                className="join-btn"
                onClick={() => currentUserId === game.creatorId ? handleCancelGame(game.id) : handleJoinGame(game.id)}
                disabled={joiningGameId === game.id}
              >
                {joiningGameId === game.id 
                  ? (currentUserId === game.creatorId ? `${t('cancel')}...` : `${t('join')}...`)
                  : (currentUserId === game.creatorId ? t('cancel') : t('join'))
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default Lobby;
