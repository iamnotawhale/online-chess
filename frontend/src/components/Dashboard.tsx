import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService, User } from '../api';
import { DailyPuzzle } from './DailyPuzzle';
import { useTranslation } from '../i18n/LanguageContext';
import './Dashboard.css';

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
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [games, setGames] = useState<Game[]>([]);
  const [finishedGames, setFinishedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllActiveGames, setShowAllActiveGames] = useState(false);
  const [finishedGamesPage, setFinishedGamesPage] = useState(0);

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
      const sorted = [...finishedGamesData].sort((a, b) =>
        new Date(b.finishedAt || b.createdAt || 0).getTime() - new Date(a.finishedAt || a.createdAt || 0).getTime()
      );
      setFinishedGames(sorted);
    } catch {
      setError(t('errorLoadingData'));
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getResultReasonLabel = (reason?: string): string => {
    const reasons: Record<string, string> = {
      checkmate: t('checkmate'), resignation: t('resignation'), timeout: t('timeout'),
      stalemate: t('stalemate'), agreement: t('agreement'),
    };
    return reason ? (reasons[reason] || reason) : '';
  };

  if (loading) return <div className="dashboard-container"><p>{t('loading')}</p></div>;
  if (error) return <div className="dashboard-container"><p className="error">{error}</p></div>;

  const finishedPageSize = 5;
  const finishedStart = finishedGamesPage * finishedPageSize;
  const pagedFinished = finishedGames.slice(finishedStart, finishedStart + finishedPageSize);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>
          {user?.username}
          {user?.country && (
            <img className="country-flag-dashboard" src={`https://flagcdn.com/w20/${user.country.toLowerCase()}.png`} alt={user.country} />
          )}
        </h1>
        <div className="rating-box">
          <span className="rating-label">{t('rating')}:</span>
          <span className="rating-value">{rating}</span>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="section">
          <h2>{t('overview')}</h2>
          <p>{t('playHubSubtitle')}</p>
          <Link to="/play" className="btn btn-primary custom-btn">{t('navPlay')}</Link>
        </div>

        <DailyPuzzle />

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
                          <div className="game-row">
                            <span className="time-control">{game.timeControl}</span>
                            <button type="button" className="game-action-link" onClick={() => navigate(`/game/${game.id}`)}>{t('play')}</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {games.length > 2 && (
                    <button type="button" className="show-more-btn" onClick={() => setShowAllActiveGames(!showAllActiveGames)}>
                      {showAllActiveGames ? t('showLess') : t('showMore')}
                    </button>
                  )}
                </>
              )}
              {finishedGames.length > 0 && (
                <>
                  <div className="games-group-title">{t('history')}</div>
                  <div className="finished-games-list">
                    {pagedFinished.map((game) => {
                      const isWhite = game.whitePlayerId === user?.id;
                      const opponentName = isWhite ? game.blackUsername : game.whiteUsername;
                      const won = (isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1');
                      const lost = (isWhite && game.result === '0-1') || (!isWhite && game.result === '1-0');
                      const cardClass = won ? 'won' : lost ? 'lost' : 'draw';
                      return (
                        <div key={game.id} className={`finished-game-card ${cardClass}`}>
                          <div className="game-row">
                            <span className="game-result-label">{game.result === '1/2-1/2' ? '½' : game.result?.charAt(0)}</span>
                            <span className="opponent-name">{opponentName}</span>
                            {game.ratingChange != null && (
                              <span className={`rating-change ${game.ratingChange >= 0 ? 'positive' : 'negative'}`}>
                                {game.ratingChange >= 0 ? '+' : ''}{game.ratingChange}
                              </span>
                            )}
                          </div>
                          <div className="game-row">
                            <span>{game.timeControl}</span>
                            <span className="game-date">{formatDateTime(game.finishedAt)}</span>
                            <button type="button" className="game-action-link" onClick={() => navigate(`/analysis/${game.id}`)}>{t('analysis')}</button>
                          </div>
                          {game.resultReason && <span className="game-reason">{getResultReasonLabel(game.resultReason)}</span>}
                        </div>
                      );
                    })}
                  </div>
                  {finishedGames.length > finishedPageSize && (
                    <div className="pagination">
                      <button type="button" disabled={finishedGamesPage === 0} onClick={() => setFinishedGamesPage((p) => p - 1)}>←</button>
                      <button type="button" disabled={finishedStart + finishedPageSize >= finishedGames.length} onClick={() => setFinishedGamesPage((p) => p + 1)}>→</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="section education-widget">
          <h2>{t('navLearn')}</h2>
          <p>{t('educationFeatureStructured')}</p>
          <Link to="/education" className="btn btn-education">{t('openEducation')}</Link>
        </div>
      </div>
    </div>
  );
};
