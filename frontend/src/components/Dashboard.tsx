import React, { useState, useEffect } from 'react';
import { apiService } from '../api';
import './Dashboard.css';

interface User {
  id: string;
  email: string;
  username: string;
  rating: number;
}

interface Game {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  whiteUsername?: string;
  blackUsername?: string;
  status: string;
  result?: string;
  resultReason?: string;
  timeControl?: string;
  createdAt?: string;
  finishedAt?: string;
  ratingChange?: number;
}

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [games, setGames] = useState<Game[]>([]);
  const [finishedGames, setFinishedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteGameMode, setInviteGameMode] = useState<'bullet' | 'blitz' | 'rapid'>('blitz');
  const [inviteTimeControl, setInviteTimeControl] = useState('5+3');
  const [gameMode, setGameMode] = useState<'bullet' | 'blitz' | 'rapid'>('blitz');
  const [timeControl, setTimeControl] = useState('5+3');
  const [isQueued, setIsQueued] = useState(false);
  const [matchmakingMessage, setMatchmakingMessage] = useState('');
  const [matchmakingLoading, setMatchmakingLoading] = useState(false);

  const GAME_MODE_LABELS: Record<'bullet' | 'blitz' | 'rapid', string> = {
    bullet: 'Bullet (1-2 мин) ',
    blitz: 'Blitz (3-5 мин)',
    rapid: 'Rapid (10-25 мин)',
  };

  const TIME_CONTROLS: Record<'bullet' | 'blitz' | 'rapid', string[]> = {
    bullet: ['1+0', '2+1'],
    blitz: ['3+0', '3+2', '5+0', '5+3'],
    rapid: ['10+0', '10+5', '15+10', '25+0'],
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [userData, ratingData, gamesData, finishedGamesData] = await Promise.all([
        apiService.getMe(),
        apiService.getCurrentRating(),
        apiService.getMyGames(),
        apiService.getMyFinishedGames(),
      ]);
      setUser(userData);
      setRating(ratingData.rating);
      setGames(gamesData);
      setFinishedGames(finishedGamesData);
    } catch (err: any) {
      setError('Ошибка загрузки данных');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  useEffect(() => {
    if (!isQueued) return;
    const intervalId = setInterval(async () => {
      try {
        const status = await apiService.getMatchmakingStatus();
        if (status.matched && status.gameId) {
          window.location.href = `/game/${status.gameId}`;
          return;
        }
        setIsQueued(status.queued);
      } catch (err) {
        console.error('Ошибка проверки матчмейкинга', err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isQueued]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      const response = await apiService.createInvite({
        gameMode: inviteGameMode,
        timeControl: inviteTimeControl,
      });
      setInviteLink(response.inviteUrl);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка создания ссылки');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      alert('Ссылка скопирована');
      setTimeout(() => {
        setInviteLink('');
      }, 1500);
    } catch (err) {
      console.error('Failed to copy invite link', err);
    }
  };

  const handleHideInvite = () => {
    setInviteLink('');
  };

  const handleJoinMatchmaking = async (e: React.FormEvent) => {
    e.preventDefault();
    setMatchmakingLoading(true);
    setMatchmakingMessage('');
    try {
      const response = await apiService.joinMatchmaking({
        gameMode,
        timeControl,
      });
      if (response.matched && response.gameId) {
        window.location.href = `/game/${response.gameId}`;
        return;
      }
      setIsQueued(true);
      setMatchmakingMessage(response.message || 'Вы в очереди на матч');
    } catch (err: any) {
      setMatchmakingMessage(err.response?.data?.error || 'Ошибка матчмейкинга');
    } finally {
      setMatchmakingLoading(false);
    }
  };

  const handleLeaveMatchmaking = async () => {
    setMatchmakingLoading(true);
    try {
      await apiService.leaveMatchmaking();
      setIsQueued(false);
      setMatchmakingMessage('Вы вышли из очереди');
    } catch (err: any) {
      setMatchmakingMessage(err.response?.data?.error || 'Ошибка выхода из очереди');
    } finally {
      setMatchmakingLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-container"><p>Загрузка...</p></div>;
  }

  if (error) {
    return <div className="dashboard-container"><p className="error">{error}</p></div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>{user?.username}</h1>
        <div className="rating-box">
          <span className="rating-label">Рейтинг:</span>
          <span className="rating-value">{rating}</span>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="section">
          <h2>Матчмейкинг</h2>
          <form onSubmit={handleJoinMatchmaking} className="invite-form">
            <select
              value={gameMode}
              onChange={(e) => {
                const mode = e.target.value as 'bullet' | 'blitz' | 'rapid';
                setGameMode(mode);
                setTimeControl(TIME_CONTROLS[mode][0]);
              }}
              required
              style={{ padding: '12px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '16px' }}
              disabled={matchmakingLoading || isQueued}
            >
              {Object.entries(GAME_MODE_LABELS).map(([mode, label]) => (
                <option key={mode} value={mode}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={timeControl}
              onChange={(e) => setTimeControl(e.target.value)}
              required
              style={{ padding: '12px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '16px' }}
              disabled={matchmakingLoading || isQueued}
            >
              {TIME_CONTROLS[gameMode].map((tc) => (
                <option key={tc} value={tc}>
                  {tc}
                </option>
              ))}
            </select>
            {!isQueued ? (
              <button type="submit" disabled={matchmakingLoading}>
                Найти матч
              </button>
            ) : (
              <button type="button" onClick={handleLeaveMatchmaking} disabled={matchmakingLoading}>
                Выйти из очереди
              </button>
            )}
          </form>
          {matchmakingMessage && <p>{matchmakingMessage}</p>}
        </div>

        <div className="section">
          <h2>Пригласить по ссылке</h2>
          <form onSubmit={handleCreateInvite} className="invite-form">
            <select
              value={inviteGameMode}
              onChange={(e) => {
                const mode = e.target.value as 'bullet' | 'blitz' | 'rapid';
                setInviteGameMode(mode);
                setInviteTimeControl(TIME_CONTROLS[mode][0]);
              }}
              required
              disabled={inviteLoading}
            >
              {Object.entries(GAME_MODE_LABELS).map(([mode, label]) => (
                <option key={mode} value={mode}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={inviteTimeControl}
              onChange={(e) => setInviteTimeControl(e.target.value)}
              required
              disabled={inviteLoading}
            >
              {TIME_CONTROLS[inviteGameMode].map((tc) => (
                <option key={tc} value={tc}>
                  {tc}
                </option>
              ))}
            </select>
            {inviteLink ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleHideInvite();
                }}
                disabled={inviteLoading}
              >
                Скрыть
              </button>
            ) : (
              <button type="submit" disabled={inviteLoading}>
                Сгенерировать ссылку
              </button>
            )}
          </form>
          {inviteLink && (
            <div className="invite-link-box">
              <div className="invite-link-row">
                <input type="text" readOnly value={inviteLink} />
                <button type="button" onClick={handleCopyInvite}>Копировать</button>
              </div>
              <div className="invite-qr">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(inviteLink)}`}
                  alt="QR"
                />
              </div>
            </div>
          )}
        </div>

        <div className="section">
          <h2>Мои игры ({games.length})</h2>
          {games.length === 0 ? (
            <p>У вас пока нет активных игр</p>
          ) : (
            <div className="games-list">
              {games.map((game) => (
                <div key={game.id} className="game-card">
                  <div className="game-status">{game.status}</div>
                  {game.result && <div className="game-result">{game.result}</div>}
                  <a href={`/game/${game.id}`} className="game-link">Посмотреть игру</a>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section">
          <h2>Завершенные игры ({finishedGames.length})</h2>
          {finishedGames.length === 0 ? (
            <p>У вас пока нет завершенных игр</p>
          ) : (
            <div className="finished-games-list">
              {finishedGames.map((game) => {
                const isWhite = game.whitePlayerId === user?.id;
                const opponentName = isWhite ? game.blackUsername : game.whiteUsername;
                const userWon = 
                  (isWhite && game.result === 'white_win') ||
                  (!isWhite && game.result === 'black_win');
                const isDraw = game.result === 'draw';

                return (
                  <div key={game.id} className={`finished-game-card ${userWon ? 'won' : isDraw ? 'draw' : 'lost'}`}>
                    <div className="game-header">
                      <span className={`result-icon ${userWon ? 'win' : isDraw ? 'draw' : 'loss'}`}>
                        {userWon ? '✓' : isDraw ? '=' : '✗'}
                      </span>
                      <span className="opponent">vs {opponentName || 'Unknown'}</span>
                      {game.ratingChange !== undefined && (
                        <span className={`rating-change ${game.ratingChange >= 0 ? 'positive' : 'negative'}`}>
                          {game.ratingChange >= 0 ? '+' : ''}{game.ratingChange}
                        </span>
                      )}
                    </div>
                    <div className="game-details">
                      <span className="time-control">{game.timeControl}</span>
                      <span className="result-reason">{game.resultReason}</span>
                      {game.createdAt && (
                        <span className="game-date">{formatDateTime(game.createdAt)}</span>
                      )}
                    </div>
                    <a href={`/game/${game.id}`} className="game-link">Просмотреть</a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
