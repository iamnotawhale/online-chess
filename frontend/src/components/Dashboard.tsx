import React, { useState, useEffect } from 'react';
import { apiService } from '../api';
import { Lobby } from './Lobby';
import { DailyPuzzle } from './DailyPuzzle';
import { useTranslation } from '../i18n/LanguageContext';
import { wsService } from '../websocket';
import { InviteByLinkModal } from './InviteByLinkModal.tsx';
import './Dashboard.css';

interface User {
  id: string;
  email: string;
  username: string;
  rating: number;
  country?: string;
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
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [games, setGames] = useState<Game[]>([]);
  const [finishedGames, setFinishedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchmakingMessage, setMatchmakingMessage] = useState('');
  const [matchmakingLoading, setMatchmakingLoading] = useState(false);
  const [showAllActiveGames, setShowAllActiveGames] = useState(false);
  const [finishedGamesPage, setFinishedGamesPage] = useState(0);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  const [queuedMode, setQueuedMode] = useState<string>('');
  const [queuedTimeControl, setQueuedTimeControl] = useState<string>('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(0);
  const [customColor, setCustomColor] = useState<'random' | 'white' | 'black'>('random');
  const [customIsRated, setCustomIsRated] = useState(true);

  // Matchmaking presets
  const MATCHMAKING_PRESETS = [
     { gameMode: 'bullet' as const, timeControl: '1+0' },
     { gameMode: 'bullet' as const, timeControl: '2+1' },
     { gameMode: 'blitz' as const, timeControl: '3+0' },
     { gameMode: 'blitz' as const, timeControl: '3+2' },
     { gameMode: 'blitz' as const, timeControl: '5+0' },
     { gameMode: 'blitz' as const, timeControl: '5+3' },
     { gameMode: 'rapid' as const, timeControl: '10+0' },
     { gameMode: 'rapid' as const, timeControl: '10+5' },
     { gameMode: 'rapid' as const, timeControl: '15+10' },
     { gameMode: 'rapid' as const, timeControl: '25+0' },
     { gameMode: 'classic' as const, timeControl: '30+0' },
     { gameMode: 'classic' as const, timeControl: '30+30' },
     { gameMode: 'custom' as const, timeControl: 'custom' },
  ];

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [userData, ratingData, gamesData, finishedGamesData, matchmakingStatus] = await Promise.all([
        apiService.getMe(),
        apiService.getCurrentRating(),
        apiService.getMyGames(),
        apiService.getMyFinishedGames(),
        apiService.getMatchmakingStatus(),
      ]);
      setUser(userData);
      setRating(ratingData.rating);
      setGames(gamesData);
      setIsQueued(matchmakingStatus.queued);
      
      // Восстанавливаем параметры матчмейкинга если пользователь в очереди
      if (matchmakingStatus.queued && matchmakingStatus.gameMode && matchmakingStatus.timeControl) {
        setQueuedMode(matchmakingStatus.gameMode);
        setQueuedTimeControl(matchmakingStatus.timeControl);
      }
      
      // Сортируем завершенные игры по времени окончания (новые сверху)
      const sortedFinishedGames = [...finishedGamesData].sort((a, b) => {
        const dateA = new Date(a.finishedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.finishedAt || b.createdAt || 0).getTime();
        return dateB - dateA; // DESC
      });
      setFinishedGames(sortedFinishedGames);
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

  // Connect to WebSocket and subscribe to game-started events
  useEffect(() => {
    const token = apiService.getToken();
    if (!token) {
      console.warn('No auth token found, skipping WebSocket connection');
      return;
    }

    // Connect to WebSocket first
    wsService.connect(token)
      .then(() => {
        console.log('✅ WebSocket connected in Dashboard');
        // Now subscribe to game-started events
        const unsubscribe = wsService.subscribeToGameStarted((message) => {
          console.log('Game started via WebSocket:', message);
          if (message.gameId) {
            window.location.href = `/game/${message.gameId}`;
          }
        });
        
        // Store unsubscribe function for cleanup
        return unsubscribe;
      })
      .catch((err) => {
        console.error('Failed to connect WebSocket in Dashboard:', err);
      });

    return () => {
      // Cleanup handled by wsService
    };
  }, []);

  // Вспомогательная функция для установки сообщения с автоматическим таймаутом
  const setMessageWithTimeout = (message: string, timeout: number = 3000) => {
    setMatchmakingMessage(message);
    if (message) {
      setTimeout(() => {
        setMatchmakingMessage('');
      }, timeout);
    }
  };

  const handleJoinMatchmaking = async (gameMode: 'bullet' | 'blitz' | 'rapid' | 'classic' | 'custom', timeControl: string) => {
    if (matchmakingLoading || isQueued) return;
    
    // Handle custom mode
    if (gameMode === 'custom' && timeControl === 'custom') {
      setShowCustomForm(!showCustomForm);
      return;
    }
    
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
      setQueuedMode(gameMode);
      setQueuedTimeControl(timeControl);
      setMessageWithTimeout(response.message || 'Вы в очереди на матч');
    } catch (err: any) {
      setMessageWithTimeout(err.response?.data?.error || 'Ошибка матчмейкинга');
    } finally {
      setMatchmakingLoading(false);
    }
  };

  const handleStartCustomMatchmaking = async () => {
    const timeControl = `${customMinutes}+${customIncrement}`;
    setShowCustomForm(false);
    
    setMatchmakingLoading(true);
    setMatchmakingMessage('');
    try {
      const response = await apiService.joinMatchmaking({
        gameMode: 'custom',
        timeControl,
        preferredColor: customColor,
        isRated: customIsRated,
      });
      if (response.matched && response.gameId) {
        window.location.href = `/game/${response.gameId}`;
        return;
      }
      setIsQueued(true);
      setQueuedMode('custom');
      setQueuedTimeControl(timeControl);
      setMessageWithTimeout(response.message || 'Вы в очереди на матч');
    } catch (err: any) {
      setMessageWithTimeout(err.response?.data?.error || 'Ошибка матчмейкинга');
    } finally {
      setMatchmakingLoading(false);
    }
  };

  const handleLeaveMatchmaking = async () => {
    setMatchmakingLoading(true);
    try {
      await apiService.leaveMatchmaking();
      setIsQueued(false);
      setQueuedMode('');
      setQueuedTimeControl('');
      setMatchmakingMessage('');
    } catch (err: any) {
      setMessageWithTimeout(err.response?.data?.error || 'Ошибка выхода из очереди');
    } finally {
      setMatchmakingLoading(false);
    }
  };

  const handleGameCancelled = async () => {
    if (isQueued) {
      await handleLeaveMatchmaking();
    } else {
      setMatchmakingMessage('');
    }
  };

  if (loading) {
    return <div className="dashboard-container"><p>{t('loading')}</p></div>;
  }

  if (error) {
    return <div className="dashboard-container"><p className="error">{error}</p></div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>
          {user?.username}
          {user?.country && (
            <img
              className="country-flag-dashboard"
              src={`https://flagcdn.com/w20/${user.country.toLowerCase()}.png`}
              srcSet={`https://flagcdn.com/w40/${user.country.toLowerCase()}.png 2x`}
              alt={user.country.toUpperCase()}
              loading="lazy"
            />
          )}
        </h1>
        <div className="rating-box">
          <span className="rating-label">{t('rating')}:</span>
          <span className="rating-value">{rating}</span>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Daily Puzzle Widget */}
        <DailyPuzzle />
        
        <div className="section">
          <h2>{t('matchmaking')}</h2>
          <div className="matchmaking-presets">
            {MATCHMAKING_PRESETS.map((preset) => (
              <button
                key={`${preset.gameMode}-${preset.timeControl}`}
                type="button"
                className={`preset-btn ${preset.timeControl === 'custom' ? 'custom-matchmaking-btn' : ''} ${isQueued && queuedMode === preset.gameMode && queuedTimeControl === preset.timeControl ? 'active' : ''} ${showCustomForm && preset.timeControl === 'custom' ? 'active' : ''}`}
                onClick={() => handleJoinMatchmaking(preset.gameMode, preset.timeControl)}
                disabled={matchmakingLoading || (isQueued && !(preset.gameMode === 'custom' && preset.timeControl === 'custom'))}
              >
                {preset.timeControl === 'custom' ? (
                  <div className="preset-label">Custom</div>
                ) : (
                  <>
                    <div className="preset-time">{preset.timeControl}</div>
                    <div className="preset-mode">{preset.gameMode}</div>
                  </>
                )}
              </button>
            ))}
          </div>
          
          {showCustomForm && (
            <div className="custom-controls">
              <div className="color-buttons">
                <button
                  type="button"
                  className={`color-btn ${customColor === 'random' ? 'active' : ''}`}
                  onClick={() => setCustomColor('random')}
                >
                  {t('random')}
                </button>
                <button
                  type="button"
                  className={`color-btn ${customColor === 'white' ? 'active' : ''}`}
                  onClick={() => setCustomColor('white')}
                >
                  {t('white')}
                </button>
                <button
                  type="button"
                  className={`color-btn ${customColor === 'black' ? 'active' : ''}`}
                  onClick={() => setCustomColor('black')}
                >
                  {t('black')}
                </button>
              </div>
              
              <div className="control-group">
                <label>{t('minutes')}: {customMinutes}</label>
                <input
                  type="range"
                  min="0"
                  max="120"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(parseInt(e.target.value))}
                />
              </div>
              
              <div className="control-group">
                <label>{t('increment')}: {customIncrement}</label>
                <input
                  type="range"
                  min="0"
                  max="120"
                  value={customIncrement}
                  onChange={(e) => setCustomIncrement(parseInt(e.target.value))}
                />
              </div>
              
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={customIsRated}
                    onChange={(e) => setCustomIsRated(e.target.checked)}
                  />
                  {t('ratedGame')}
                </label>
              </div>
              
              <button
                type="button"
                className="matchmaking-btn"
                onClick={handleStartCustomMatchmaking}
                disabled={matchmakingLoading || isQueued}
              >
                {t('play')}
              </button>
            </div>
          )}
          
          <button
            type="button"
            className="preset-btn custom-btn invite-btn-standalone"
            onClick={() => setIsInviteModalOpen(true)}
            disabled={matchmakingLoading}
          >
            {t('inviteByLink')}
          </button>
          
          {isQueued && (
            <div className="queued-info">
              <p>{queuedMode.toUpperCase()} {queuedTimeControl} - {t('waitingForOpponent')}</p>
              <button
                type="button"
                className="leave-queue-btn"
                onClick={handleLeaveMatchmaking}
                disabled={matchmakingLoading}
              >
                {t('leaveQueue')}
              </button>
            </div>
          )}
          {matchmakingMessage && <p className="matchmaking-message">{matchmakingMessage}</p>}
        </div>
          {isInviteModalOpen && (
            <InviteByLinkModal 
              onClose={() => setIsInviteModalOpen(false)}
            />
          )}


        <div className="section">
          <Lobby onGameCancelled={handleGameCancelled} />
        </div>

        <div className="section">
          <h2>{t('myGames')} ({games.length + finishedGames.length})</h2>
          {games.length === 0 && finishedGames.length === 0 ? (
            <p>{t('noGames')}</p>
          ) : (
            <div className="all-games-list">
              {games.length > 0 && (
                <>
                  <div className="games-group-title">{t('activeGames')} ({games.length})</div>
                  <div className="finished-games-list">
                    {(showAllActiveGames ? games : games.slice(0, 2)).map((game) => {
                      const isWhite = game.whitePlayerId === user?.id;
                      const opponentName = isWhite ? game.blackUsername : game.whiteUsername;
                      
                      return (
                        <div key={game.id} className="finished-game-card active-game">
                          <div className="game-row">
                            <span className="game-status-label">{t('active')}</span>
                            <span className="opponent-name">{t('vs')} {opponentName || t('waiting')}</span>
                          </div>
                          <div className="game-divider"></div>
                          <div className="game-row">
                            <span className="time-control">{game.timeControl}</span>
                            {game.createdAt && (
                              <span className="game-date">{formatDateTime(game.createdAt)}</span>
                            )}
                            <a href={`/game/${game.id}`} className="game-action-link">{t('play')}</a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {games.length > 2 && (
                    <button
                      className="show-more-btn"
                      onClick={() => setShowAllActiveGames(!showAllActiveGames)}
                    >
                      {showAllActiveGames ? t('hide') : `${t('showMore')} ${games.length - 2}`}
                    </button>
                  )}
                </>
              )}
              
              {finishedGames.length > 0 && (
                <>
                  <div className="games-group-title">{t('history')} ({finishedGames.length})</div>
                  <div className="finished-games-list">
                    {finishedGames.slice(finishedGamesPage * 3, (finishedGamesPage + 1) * 3).map((game) => {
                      const isWhite = game.whitePlayerId === user?.id;
                      const opponentName = isWhite ? game.blackUsername : game.whiteUsername;
                      
                      // Определяем результат игры для пользователя
                      const getGameResult = (): 'won' | 'lost' | 'draw' => {
                        if (!game.result) return 'lost';
                        
                        // Ничья
                        if (game.result === '1/2-1/2') {
                          return 'draw';
                        }
                        
                        // Победа белых
                        if (game.result === '1-0') {
                          return isWhite ? 'won' : 'lost';
                        }
                        
                        // Победа черных
                        if (game.result === '0-1') {
                          return isWhite ? 'lost' : 'won';
                        }
                        
                        return 'lost';
                      };
                      
                      const gameResult = getGameResult();
                      const resultLabel = gameResult === 'won' ? '✓' : gameResult === 'draw' ? '=' : '✗';

                      return (
                        <div key={game.id} className={`finished-game-card ${gameResult}`}>
                          <div className="game-row">
                            <span className="game-result-label">{resultLabel}</span>
                            <span className="opponent-name">vs {opponentName || 'Unknown'}</span>
                            {game.ratingChange !== undefined && (
                              <span
                                className={`rating-change ${gameResult === 'draw' ? 'draw' : game.ratingChange >= 0 ? 'positive' : 'negative'}`}
                              >
                                {game.ratingChange >= 0 ? '+' : ''}{game.ratingChange}
                              </span>
                            )}
                          </div>
                          <div className="game-divider"></div>
                          <div className="game-row">
                            <span className="time-control">{game.timeControl}</span>
                            <span className="result-reason">{getResultReasonLabel(game.resultReason)}</span>
                            {(game.finishedAt || game.createdAt) && (
                              <span className="game-date">{formatDateTime(game.finishedAt || game.createdAt)}</span>
                            )}
                          </div>
                          <div className="game-actions">
                            <a href={`/game/${game.id}`} className="game-action-link">{t('view')}</a>
                            <a href={`/analysis/${game.id}`} className="game-action-link">{t('analysisButtonLabel')}</a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {finishedGames.length > 3 && (
                    <div className="pagination-controls">
                      <button
                        className="pagination-btn"
                        onClick={() => setFinishedGamesPage(Math.max(0, finishedGamesPage - 1))}
                        disabled={finishedGamesPage === 0}
                      >
                        ←
                      </button>
                      <span className="pagination-info">
                        {finishedGamesPage + 1} / {Math.ceil(finishedGames.length / 3)}
                      </span>
                      <button
                        className="pagination-btn"
                        onClick={() => setFinishedGamesPage(Math.min(Math.ceil(finishedGames.length / 3) - 1, finishedGamesPage + 1))}
                        disabled={finishedGamesPage >= Math.ceil(finishedGames.length / 3) - 1}
                      >
                        →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
