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

  if (loading) return <div className="page-wrapper page-loading">{t('loading')}</div>;
  if (error) return <div className="page-wrapper"><p className="error-message">{error}</p></div>;

  const finishedPageSize = 5;
  const finishedStart = finishedGamesPage * finishedPageSize;
  const pagedFinished = finishedGames.slice(finishedStart, finishedStart + finishedPageSize);

  return (
    <div className="page-wrapper">
      <div className="page-hero">
        <h1 className="page-title">
          {user?.username}
          {user?.country && (
            <img className="country-flag-dashboard" src={`https://flagcdn.com/w20/${user.country.toLowerCase()}.png`} alt={user.country} />
          )}
        </h1>
        <div className="page-hero__stat">
          <span className="page-hero__stat-label">{t('rating')}</span>
          <span className="page-hero__stat-value">{rating}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="page-section">
          <h2 className="section-title">{t('overview')}</h2>
          <p className="section-desc">{t('playHubSubtitle')}</p>
          <Link to="/play" className="btn btn-primary">{t('navPlay')}</Link>
        </div>

        <DailyPuzzle />

        <div className="page-section">
          <h2 className="section-title">{t('myGames')} ({games.length + finishedGames.length})</h2>
          {games.length === 0 && finishedGames.length === 0 ? (
            <p className="empty-state">{t('noGames')}</p>
          ) : (
            <div className="list-stack">
              {games.length > 0 && (
                <>
                  <div className="games-group-title">{t('activeGames')} ({games.length})</div>
                  {(showAllActiveGames ? games : games.slice(0, 2)).map((game) => {
                      const isWhite = game.whitePlayerId === user?.id;
                      const opponentName = isWhite ? game.blackUsername : game.whiteUsername;
                      return (
                        <div key={game.id} className="game-card game-card--active">
                          <div className="game-card__row">
                            <span className="game-card__label">{t('active')}</span>
                            <span className="game-card__opponent">{t('vs')} {opponentName || t('waiting')}</span>
                          </div>
                          <div className="game-card__row">
                            <span className="list-card__meta">{game.timeControl}</span>
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/game/${game.id}`)}>{t('play')}</button>
                          </div>
                        </div>
                      );
                    })}
                  {games.length > 2 && (
                    <button type="button" className="btn btn-secondary show-more-btn" onClick={() => setShowAllActiveGames(!showAllActiveGames)}>
                      {showAllActiveGames ? t('showLess') : t('showMore')}
                    </button>
                  )}
                </>
              )}
              {finishedGames.length > 0 && (
                <>
                  <div className="games-group-title">{t('history')}</div>
                    {pagedFinished.map((game) => {
                      const isWhite = game.whitePlayerId === user?.id;
                      const opponentName = isWhite ? game.blackUsername : game.whiteUsername;
                      const won = (isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1');
                      const lost = (isWhite && game.result === '0-1') || (!isWhite && game.result === '1-0');
                      const cardClass = won ? 'game-card--won' : lost ? 'game-card--lost' : 'game-card--draw';
                      return (
                        <div key={game.id} className={`game-card ${cardClass}`}>
                          <div className="game-card__row">
                            <span className="game-card__result">{game.result === '1/2-1/2' ? '½' : game.result?.charAt(0)}</span>
                            <span className="game-card__opponent">{opponentName}</span>
                            {game.ratingChange != null && (
                              <span className={`rating-delta ${game.ratingChange >= 0 ? 'positive' : 'negative'}`}>
                                {game.ratingChange >= 0 ? '+' : ''}{game.ratingChange}
                              </span>
                            )}
                          </div>
                          <div className="game-card__row">
                            <span className="list-card__meta">{game.timeControl}</span>
                            <span className="game-card__date">{formatDateTime(game.finishedAt)}</span>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(`/analysis/${game.id}`)}>{t('analysis')}</button>
                          </div>
                          {game.resultReason && <span className="list-card__meta">{getResultReasonLabel(game.resultReason)}</span>}
                        </div>
                      );
                    })}
                  {finishedGames.length > finishedPageSize && (
                    <div className="list-card__actions list-card__actions--center">
                      <button type="button" className="btn btn-ghost btn-sm" disabled={finishedGamesPage === 0} onClick={() => setFinishedGamesPage((p) => p - 1)}>←</button>
                      <button type="button" className="btn btn-ghost btn-sm" disabled={finishedStart + finishedPageSize >= finishedGames.length} onClick={() => setFinishedGamesPage((p) => p + 1)}>→</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="page-section education-widget">
          <h2 className="section-title">{t('navLearn')}</h2>
          <p className="section-desc">{t('educationFeatureStructured')}</p>
          <Link to="/education" className="btn btn-primary">{t('openEducation')}</Link>
        </div>
      </div>
    </div>
  );
};
