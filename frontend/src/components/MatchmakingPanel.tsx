import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../api';
import { wsService } from '../websocket';
import { useTranslation } from '../i18n/LanguageContext';
import './Dashboard.css';

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

export const MatchmakingPanel: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [matchmakingMessage, setMatchmakingMessage] = useState('');
  const [matchmakingLoading, setMatchmakingLoading] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  const [queuedMode, setQueuedMode] = useState('');
  const [queuedTimeControl, setQueuedTimeControl] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(0);
  const [customColor, setCustomColor] = useState<'random' | 'white' | 'black'>('random');
  const [customIsRated, setCustomIsRated] = useState(true);

  useEffect(() => {
    apiService.getMatchmakingStatus().then((status) => {
      setIsQueued(status.queued);
      if (status.queued && status.gameMode && status.timeControl) {
        setQueuedMode(status.gameMode);
        setQueuedTimeControl(status.timeControl);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isQueued) return;
    const intervalId = setInterval(async () => {
      try {
        const status = await apiService.getMatchmakingStatus();
        if (status.matched && status.gameId) {
          navigate(`/game/${status.gameId}`);
          return;
        }
        setIsQueued(status.queued);
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [isQueued, navigate]);

  useEffect(() => {
    const token = apiService.getToken();
    if (!token) return;
    wsService.connect(token).then(() => {
      wsService.subscribeToGameStarted((message) => {
        if (message.gameId) navigate(`/game/${message.gameId}`);
      });
    }).catch(() => undefined);
  }, [navigate]);

  const setMessageWithTimeout = (message: string, timeout = 3000) => {
    setMatchmakingMessage(message);
    if (message) setTimeout(() => setMatchmakingMessage(''), timeout);
  };

  const handleJoinMatchmaking = async (
    gameMode: 'bullet' | 'blitz' | 'rapid' | 'classic' | 'custom',
    timeControl: string,
  ) => {
    if (matchmakingLoading || isQueued) return;
    if (gameMode === 'custom' && timeControl === 'custom') {
      setShowCustomForm(!showCustomForm);
      return;
    }
    setMatchmakingLoading(true);
    try {
      const response = await apiService.joinMatchmaking({ gameMode, timeControl });
      if (response.matched && response.gameId) {
        navigate(`/game/${response.gameId}`);
        return;
      }
      setIsQueued(true);
      setQueuedMode(gameMode);
      setQueuedTimeControl(timeControl);
      setMessageWithTimeout(response.message || t('inQueue'));
    } catch (err: any) {
      setMessageWithTimeout(err.response?.data?.error || t('matchmakingError'));
    } finally {
      setMatchmakingLoading(false);
    }
  };

  const handleStartCustomMatchmaking = async () => {
    const timeControl = `${customMinutes}+${customIncrement}`;
    setShowCustomForm(false);
    setMatchmakingLoading(true);
    try {
      const response = await apiService.joinMatchmaking({
        gameMode: 'custom',
        timeControl,
        preferredColor: customColor,
        isRated: customIsRated,
      });
      if (response.matched && response.gameId) {
        navigate(`/game/${response.gameId}`);
        return;
      }
      setIsQueued(true);
      setQueuedMode('custom');
      setQueuedTimeControl(timeControl);
      setMessageWithTimeout(response.message || t('inQueue'));
    } catch (err: any) {
      setMessageWithTimeout(err.response?.data?.error || t('matchmakingError'));
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
      setMessageWithTimeout(err.response?.data?.error || t('errorLeaveQueue'));
    } finally {
      setMatchmakingLoading(false);
    }
  };

  return (
    <div className="section matchmaking-section">
      <h2>{t('quickPlay')}</h2>
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
            {(['random', 'white', 'black'] as const).map((c) => (
              <button key={c} type="button" className={`color-btn ${customColor === c ? 'active' : ''}`} onClick={() => setCustomColor(c)}>
                {t(c)}
              </button>
            ))}
          </div>
          <div className="custom-inputs">
            <label>{t('minutes')}: <input type="number" min={1} max={180} value={customMinutes} onChange={(e) => setCustomMinutes(Number(e.target.value))} /></label>
            <label>{t('increment')}: <input type="number" min={0} max={60} value={customIncrement} onChange={(e) => setCustomIncrement(Number(e.target.value))} /></label>
          </div>
          <label className="checkbox-label">
            <input type="checkbox" checked={customIsRated} onChange={(e) => setCustomIsRated(e.target.checked)} />
            {t('rated')}
          </label>
          <button type="button" className="matchmaking-btn" onClick={handleStartCustomMatchmaking} disabled={matchmakingLoading}>
            {t('findOpponent')}
          </button>
        </div>
      )}

      {isQueued && (
        <div className="queue-status">
          <p>{t('inQueue')} ({queuedTimeControl || queuedMode})</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleLeaveMatchmaking} disabled={matchmakingLoading}>
            {t('leaveQueue')}
          </button>
        </div>
      )}

      {matchmakingMessage && <p className="matchmaking-message">{matchmakingMessage}</p>}
    </div>
  );
};
