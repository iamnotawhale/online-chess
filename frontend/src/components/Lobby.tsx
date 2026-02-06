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
          {games.map((game) => {
            const isOwnGame = currentUserId === game.creatorId;
            const gameType = game.rated ? t('rated') : t('unrated');
            const gameMode = game.gameMode === 'custom' ? t('custom') : game.gameMode;
            const colorLabel = getColorLabel(getDisplayColor(game));
            
            return (
              <div 
                key={game.id} 
                className={`lobby-game-card ${isOwnGame ? 'own-game' : ''}`}
                onClick={() => !isOwnGame && handleJoinGame(game.id)}
                title={!isOwnGame ? `${t('join')} • ${game.creatorUsername}` : undefined}
              >
                <div className="lobby-card-top">
                  <span className="creator-name">{game.creatorUsername}</span>
                  <span className="creator-rating">{game.creatorRating}</span>
                  <span className="game-type-label">{gameType}</span>
                </div>
                
                <div className="lobby-card-divider"></div>
                
                <div className="lobby-card-bottom">
                  <span><span className="info-label">{t('modeLabel')}:</span> {gameMode}</span>
                  <span><span className="info-label">{t('timeLabel')}:</span> {game.timeControl}</span>
                  <span><span className="info-label">{t('colorLabel')}:</span> {colorLabel}</span>
                </div>

                {isOwnGame && (
                  <button
                    className="cancel-small-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelGame(game.id);
                    }}
                    disabled={joiningGameId === game.id}
                  >
                    {joiningGameId === game.id ? `${t('cancel')}...` : t('cancel')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default Lobby;
