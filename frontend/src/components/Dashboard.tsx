import React, { useState, useEffect } from 'react';
import { apiService } from '../api';
import { Lobby } from './Lobby';
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
  const [inviteSelectedType, setInviteSelectedType] = useState<'bullet' | 'blitz' | 'rapid' | 'custom' | null>(null);
  const [inviteGameMode, setInviteGameMode] = useState<'bullet' | 'blitz' | 'rapid'>('blitz');
  const [inviteTimeControl, setInviteTimeControl] = useState('5+3');
  const [inviteCustomMinutes, setInviteCustomMinutes] = useState(5);
  const [inviteCustomIncrement, setInviteCustomIncrement] = useState(0);
  const [inviteIsRated, setInviteIsRated] = useState(false);
  const [invitePreferredColor, setInvitePreferredColor] = useState<'white' | 'black' | 'random'>('random');
  const [gameMode, setGameMode] = useState<'bullet' | 'blitz' | 'rapid'>('blitz');
  const [selectedType, setSelectedType] = useState<'bullet' | 'blitz' | 'rapid' | 'custom' | null>(null);
  const [customMinutes, setCustomMinutes] = useState(5);
  const [customIncrement, setCustomIncrement] = useState(0);
  const [customColor, setCustomColor] = useState<'white' | 'black' | 'random'>('random');
  const [isRated, setIsRated] = useState(false);
  const [timeControl, setTimeControl] = useState('5+3');
  const [isQueued, setIsQueued] = useState(false);
  const [matchmakingMessage, setMatchmakingMessage] = useState('');
  const [matchmakingLoading, setMatchmakingLoading] = useState(false);
  const [showAllActiveGames, setShowAllActiveGames] = useState(false);
  const [finishedGamesPage, setFinishedGamesPage] = useState(0);

  const GAME_MODE_LABELS: Record<'bullet' | 'blitz' | 'rapid', string> = {
    bullet: 'Bullet',
    blitz: 'Blitz',
    rapid: 'Rapid',
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
        const mode = matchmakingStatus.gameMode as 'bullet' | 'blitz' | 'rapid' | 'custom';
        if (mode !== 'custom') {
          setGameMode(mode);
        }
        setTimeControl(matchmakingStatus.timeControl);
        setSelectedType(mode === 'custom' ? 'custom' : mode);
        if (matchmakingStatus.preferredColor) {
          setCustomColor(matchmakingStatus.preferredColor as 'white' | 'black' | 'random');
        }
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

  // Reset invite link when game mode or time control changes
  useEffect(() => {
    if (inviteLink) {
      setInviteLink('');
    }
  }, [inviteGameMode, inviteTimeControl, inviteCustomMinutes, inviteCustomIncrement, inviteIsRated, invitePreferredColor]);

  const handleCreateInvite = async () => {
    setInviteLoading(true);
    try {
      const timeControl = inviteSelectedType === 'custom' 
        ? `${inviteCustomMinutes}+${inviteCustomIncrement}`
        : inviteTimeControl;

      const gameMode = inviteSelectedType === 'custom' ? 'custom' : inviteGameMode;
      const isRated = inviteSelectedType === 'custom' ? inviteIsRated : true;
      const preferredColor = inviteSelectedType === 'custom' ? invitePreferredColor : undefined;
      
      const response = await apiService.createInvite({
        gameMode: gameMode,
        timeControl: timeControl,
        isRated: isRated,
        preferredColor: preferredColor,
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

  // Вспомогательная функция для установки сообщения с автоматическим таймаутом
  const setMessageWithTimeout = (message: string, timeout: number = 3000) => {
    setMatchmakingMessage(message);
    if (message) {
      setTimeout(() => {
        setMatchmakingMessage('');
      }, timeout);
    }
  };

  const handleJoinMatchmaking = async (
    selectedMode?: 'bullet' | 'blitz' | 'rapid' | 'custom',
    selectedTimeControl?: string,
    preferredColor?: 'white' | 'black' | 'random'
  ) => {
    if (matchmakingLoading || isQueued) return;
    const modeToUse = selectedMode ?? gameMode;
    const timeToUse = selectedTimeControl ?? timeControl;
    if (modeToUse !== 'custom') {
      setGameMode(modeToUse);
    }
    setTimeControl(timeToUse);
    setMatchmakingLoading(true);
    setMatchmakingMessage('');
    try {
      const response = await apiService.joinMatchmaking({
        gameMode: modeToUse,
        timeControl: timeToUse,
        preferredColor,
      });
      if (response.matched && response.gameId) {
        window.location.href = `/game/${response.gameId}`;
        return;
      }
      setIsQueued(true);
      setMessageWithTimeout(response.message || 'Вы в очереди на матч');
    } catch (err: any) {
      setMessageWithTimeout(err.response?.data?.error || 'Ошибка матчмейкинга');
    } finally {
      setMatchmakingLoading(false);
    }
  };

  const getRulesForType = () => {
    if (!selectedType) return [];
    if (selectedType === 'custom') {
      return Array.from(new Set([
        ...TIME_CONTROLS.bullet,
        ...TIME_CONTROLS.blitz,
        ...TIME_CONTROLS.rapid,
      ]));
    }
    return TIME_CONTROLS[selectedType];
  };

  const handleStartCustomMatch = async () => {
    const timeControlValue = `${customMinutes}+${customIncrement}`;
    setMatchmakingLoading(true);
    try {
      await apiService.createLobbyGame({
        gameMode: 'custom',
        timeControl: timeControlValue,
        preferredColor: customColor,
        isRated: isRated,
      });
      setMatchmakingMessage(`Игра создана в лобби. Ожидание противника...`);
      setSelectedType(null);
      setCustomMinutes(5);
      setCustomIncrement(0);
      setCustomColor('random');
      setIsRated(false);
    } catch (error) {
      setMessageWithTimeout('Ошибка создания игры');
      console.error(error);
    } finally {
      setMatchmakingLoading(false);
    }
  };

  const handleLeaveMatchmaking = async () => {
    setMatchmakingLoading(true);
    try {
      await apiService.leaveMatchmaking();
      setIsQueued(false);
      setMatchmakingMessage('');
    } catch (err: any) {
      setMessageWithTimeout(err.response?.data?.error || 'Ошибка выхода из очереди');
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
          <div className="time-control-selector">
            <div className="mode-buttons">
              {Object.entries(GAME_MODE_LABELS).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`mode-btn ${selectedType === mode ? 'active' : ''}`}
                  onClick={() => {
                    const nextMode = mode as 'bullet' | 'blitz' | 'rapid';
                    setSelectedType(nextMode);
                    setGameMode(nextMode);
                    setTimeControl(TIME_CONTROLS[nextMode][0]);
                  }}
                  disabled={matchmakingLoading || isQueued}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="custom-row">
              <button
                type="button"
                className={`mode-btn custom-btn ${selectedType === 'custom' ? 'active' : ''}`}
                onClick={() => setSelectedType('custom')}
                disabled={matchmakingLoading || isQueued}
              >
                Custom
              </button>
            </div>
            {selectedType === 'custom' && (
              <div className="custom-controls">
                <div className="color-buttons">
                  {[
                    { key: 'random', label: 'Random' },
                    { key: 'white', label: 'White' },
                    { key: 'black', label: 'Black' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`color-btn ${customColor === item.key ? 'active' : ''}`}
                      onClick={() => setCustomColor(item.key as 'white' | 'black' | 'random')}
                      disabled={matchmakingLoading}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="slider-group">
                  <div className="slider-row">
                    <div className="slider-label">Минуты: {customMinutes}</div>
                    <input
                      type="range"
                      min={1}
                      max={120}
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(Number(e.target.value))}
                      disabled={matchmakingLoading}
                    />
                  </div>
                  <div className="slider-row">
                    <div className="slider-label">Инкремент: {customIncrement} сек</div>
                    <input
                      type="range"
                      min={0}
                      max={120}
                      value={customIncrement}
                      onChange={(e) => setCustomIncrement(Number(e.target.value))}
                      disabled={matchmakingLoading}
                    />
                  </div>
                </div>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isRated}
                      onChange={(e) => setIsRated(e.target.checked)}
                      disabled={matchmakingLoading}
                    />
                    <span>Рейтинговая игра</span>
                  </label>
                </div>
                <button
                  type="button"
                  className="matchmaking-btn"
                  onClick={handleStartCustomMatch}
                  disabled={matchmakingLoading}
                >
                  Играть {customMinutes}+{customIncrement}
                </button>
              </div>
            )}
            {selectedType && selectedType !== 'custom' && (
              <div className="time-control-options">
                {getRulesForType().map((tc) => (
                  <button
                    key={tc}
                    type="button"
                    className={`time-control-btn ${timeControl === tc ? 'active' : ''}`}
                    onClick={() => {
                      handleJoinMatchmaking(selectedType, tc);
                    }}
                    disabled={matchmakingLoading || isQueued}
                  >
                    {tc}
                  </button>
                ))}
              </div>
            )}
            {isQueued && (
              <button
                type="button"
                className="matchmaking-btn"
                onClick={handleLeaveMatchmaking}
                disabled={matchmakingLoading}
              >
                Выйти из очереди
              </button>
            )}
          </div>
          {matchmakingMessage && <p>{matchmakingMessage}</p>}
        </div>

        <div className="section">
          <h2>Пригласить по ссылке</h2>
          <div className="time-control-selector">
            <div className="mode-buttons">
              {Object.entries(GAME_MODE_LABELS).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`mode-btn ${inviteSelectedType === mode ? 'active' : ''}`}
                  onClick={() => {
                    const nextMode = mode as 'bullet' | 'blitz' | 'rapid';
                    setInviteSelectedType(nextMode);
                    setInviteGameMode(nextMode);
                    setInviteTimeControl(TIME_CONTROLS[nextMode][0]);
                  }}
                  disabled={inviteLoading}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="custom-row">
              <button
                type="button"
                className={`mode-btn custom-btn ${inviteSelectedType === 'custom' ? 'active' : ''}`}
                onClick={() => setInviteSelectedType('custom')}
                disabled={inviteLoading}
              >
                Custom
              </button>
            </div>
            {inviteSelectedType && (
              <>
                {inviteSelectedType !== 'custom' && (
                  <div className="time-buttons">
                    {TIME_CONTROLS[inviteGameMode].map((tc) => (
                      <button
                        key={tc}
                        type="button"
                        className={`time-btn ${inviteTimeControl === tc ? 'active' : ''}`}
                        onClick={() => setInviteTimeControl(tc)}
                        disabled={inviteLoading}
                      >
                        {tc}
                      </button>
                    ))}
                  </div>
                )}
                {inviteSelectedType === 'custom' && (
                  <div className="custom-controls">
                    <div className="color-buttons">
                      {[
                        { key: 'random', label: 'Random' },
                        { key: 'white', label: 'White' },
                        { key: 'black', label: 'Black' },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          className={`color-btn ${invitePreferredColor === item.key ? 'active' : ''}`}
                          onClick={() => setInvitePreferredColor(item.key as 'white' | 'black' | 'random')}
                          disabled={inviteLoading}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="slider-group">
                      <div className="slider-row">
                        <div className="slider-label">Минуты: {inviteCustomMinutes}</div>
                        <input
                          type="range"
                          min="1"
                          max="120"
                          value={inviteCustomMinutes}
                          onChange={(e) => setInviteCustomMinutes(parseInt(e.target.value))}
                          disabled={inviteLoading}
                        />
                      </div>
                      <div className="slider-row">
                        <div className="slider-label">Инкремент: {inviteCustomIncrement}</div>
                        <input
                          type="range"
                          min="0"
                          max="120"
                          value={inviteCustomIncrement}
                          onChange={(e) => setInviteCustomIncrement(parseInt(e.target.value))}
                          disabled={inviteLoading}
                        />
                      </div>
                    </div>
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={inviteIsRated}
                          onChange={(e) => setInviteIsRated(e.target.checked)}
                          disabled={inviteLoading}
                        />
                        <span>Рейтинговая игра</span>
                      </label>
                    </div>
                    {inviteLink ? (
                      <button
                        type="button"
                        className="hide-btn"
                        onClick={handleHideInvite}
                        disabled={inviteLoading}
                      >
                        Скрыть
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="generate-btn"
                        onClick={handleCreateInvite}
                        disabled={inviteLoading}
                      >
                        Сгенерировать ссылку
                      </button>
                    )}
                  </div>
                )}
                {inviteSelectedType !== 'custom' && (
                  inviteLink ? (
                    <button
                      type="button"
                      className="hide-btn"
                      onClick={handleHideInvite}
                      disabled={inviteLoading}
                    >
                      Скрыть
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="generate-btn"
                      onClick={handleCreateInvite}
                      disabled={inviteLoading}
                    >
                      Сгенерировать ссылку
                    </button>
                  )
                )}
              </>
            )}
          </div>
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
          <Lobby onGameCancelled={() => setMatchmakingMessage('')} />
        </div>

        <div className="section">
          <h2>Мои игры ({games.length + finishedGames.length})</h2>
          {games.length === 0 && finishedGames.length === 0 ? (
            <p>У вас пока нет игр</p>
          ) : (
            <div className="all-games-list">
              {games.length > 0 && (
                <>
                  <div className="games-group-title">Активные игры ({games.length})</div>
                  <div className="finished-games-list">
                    {(showAllActiveGames ? games : games.slice(0, 2)).map((game) => {
                      const isWhite = game.whitePlayerId === user?.id;
                      const opponentName = isWhite ? game.blackUsername : game.whiteUsername;
                      
                      return (
                        <div key={game.id} className="finished-game-card active-game">
                          <div className="game-row">
                            <span className="game-status-label">Active</span>
                            <span className="opponent-name">vs {opponentName || 'Ожидание'}</span>
                          </div>
                          <div className="game-divider"></div>
                          <div className="game-row">
                            <span className="time-control">{game.timeControl}</span>
                            {game.createdAt && (
                              <span className="game-date">{formatDateTime(game.createdAt)}</span>
                            )}
                            <a href={`/game/${game.id}`} className="game-action-link">Играть</a>
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
                      {showAllActiveGames ? 'Скрыть' : `Показать ещё ${games.length - 2}`}
                    </button>
                  )}
                </>
              )}
              
              {finishedGames.length > 0 && (
                <>
                  <div className="games-group-title">История ({finishedGames.length})</div>
                  <div className="finished-games-list">
                    {finishedGames.slice(finishedGamesPage * 3, (finishedGamesPage + 1) * 3).map((game) => {
                      const isWhite = game.whitePlayerId === user?.id;
                      const opponentName = isWhite ? game.blackUsername : game.whiteUsername;
                      const userWon = 
                        (isWhite && game.result === '1-0') ||
                        (!isWhite && game.result === '0-1');
                      const isDraw = game.result === '1/2-1/2' || game.result === 'draw' || game.resultReason === 'agreement';
                      const resultLabel = userWon ? '✓' : isDraw ? '=' : '✗';

                      return (
                        <div key={game.id} className={`finished-game-card ${userWon ? 'won' : isDraw ? 'draw' : 'lost'}`}>
                          <div className="game-row">
                            <span className="game-result-label">{resultLabel}</span>
                            <span className="opponent-name">vs {opponentName || 'Unknown'}</span>
                            {game.ratingChange !== undefined && (
                              <span
                                className={`rating-change ${isDraw ? 'draw' : game.ratingChange >= 0 ? 'positive' : 'negative'}`}
                              >
                                {game.ratingChange >= 0 ? '+' : ''}{game.ratingChange}
                              </span>
                            )}
                          </div>
                          <div className="game-divider"></div>
                          <div className="game-row">
                            <span className="time-control">{game.timeControl}</span>
                            <span className="result-reason">{game.resultReason}</span>
                            {(game.finishedAt || game.createdAt) && (
                              <span className="game-date">{formatDateTime(game.finishedAt || game.createdAt)}</span>
                            )}
                            <a href={`/game/${game.id}`} className="game-action-link">Посмотреть</a>
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
