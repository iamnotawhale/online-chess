import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService, User } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import './PublicProfile.css';

interface Game {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  whiteUsername?: string;
  blackUsername?: string;
  status: string;
  result?: string;
  resultReason?: string;
  fenCurrent: string;
  timeControl?: string;
  rated?: boolean;
  whiteTimeLeftMs?: number;
  blackTimeLeftMs?: number;
  lastMoveAt?: string;
  createdAt?: string;
  finishedAt?: string;
  ratingChange?: number;
}

interface FriendshipStatus {
  id: string;
  friend: User;
  status: string;
}

import { DEFAULT_AVATARS, isExternalAvatarUrl } from '../utils/avatars';

export const PublicProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus | null>(null);
  const [friendshipLoading, setFriendshipLoading] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<FriendshipStatus[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showOnlyAgainstMe, setShowOnlyAgainstMe] = useState(false);
  const itemsPerPage = 10;

  // Redirect to own profile if viewing own username
  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        const currentUser = await apiService.getMe();
        setCurrentUser(currentUser);
        if (currentUser && currentUser.username === username) {
          navigate('/profile', { replace: true });
        }
      } catch (err) {
        // If not logged in, continue loading public profile
        setCurrentUser(null);
      }
    };

    checkAndRedirect();
  }, [username, navigate]);

  useEffect(() => {
    loadProfile();
    loadIncomingRequests();
  }, [username]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserByUsername(username!);
      setProfile(response);
      setError('');
      
      // Load games
      loadGames(response.id);
      
      // Load friendship status
      loadFriendshipStatus(response.id);
    } catch (err) {
      setError(t('loginError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadGames = async (userId: string) => {
    try {
      setGamesLoading(true);
      const gamesData = await apiService.getUserGames(userId, 'all');
      setGames(gamesData);
    } catch (err) {
      console.error('Failed to load games:', err);
    } finally {
      setGamesLoading(false);
    }
  };

  const loadFriendshipStatus = async (userId: string) => {
    try {
      const status = await apiService.getFriendshipStatus(userId);
      setFriendshipStatus(status);
    } catch (err) {
      console.error('Failed to load friendship status:', err);
    }
  };

  const loadIncomingRequests = async () => {
    try {
      const requests = await apiService.getPendingFriendRequests();
      setIncomingRequests(requests);
    } catch (err) {
      console.error('Failed to load incoming requests:', err);
    }
  };

  const handleChallenge = async () => {
    if (!profile?.id || !currentUser) {
      navigate('/login');
      return;
    }
    setChallengeLoading(true);
    try {
      await apiService.createChallenge(profile.id);
      alert(t('challengeSent'));
    } catch (err: any) {
      alert(err.response?.data?.error || t('error'));
    } finally {
      setChallengeLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!profile) return;
    try {
      setFriendshipLoading(true);
      const result = await apiService.sendFriendRequest(profile.id);
      setFriendshipStatus(result);
    } catch (err) {
      console.error('Failed to send friend request:', err);
      // Reload the current friendship status to sync state in case of error
      try {
        const currentStatus = await apiService.getFriendshipStatus(profile.id);
        setFriendshipStatus(currentStatus);
      } catch (reloadErr) {
        console.error('Failed to reload friendship status:', reloadErr);
      }
    } finally {
      setFriendshipLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!profile) return;
    try {
      setFriendshipLoading(true);
      await apiService.removeFriend(profile.id);
      setFriendshipStatus(null);
    } catch (err) {
      console.error('Failed to remove friend:', err);
    } finally {
      setFriendshipLoading(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!profile || !friendshipStatus) return;
    try {
      setFriendshipLoading(true);
      await apiService.cancelFriendRequest(friendshipStatus.id);
      setFriendshipStatus(null);
    } catch (err) {
      console.error('Failed to cancel friend request:', err);
    } finally {
      setFriendshipLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!profile) return;
    const incomingReq = incomingRequests.find(req => req.friend.id === profile.id);
    if (!incomingReq) return;
    try {
      setFriendshipLoading(true);
      const result = await apiService.acceptFriendRequest(incomingReq.id);
      setFriendshipStatus(result);
      setIncomingRequests(incomingRequests.filter(req => req.id !== incomingReq.id));
    } catch (err) {
      console.error('Failed to accept friend request:', err);
    } finally {
      setFriendshipLoading(false);
    }
  };

  const handleDeclineFriendRequest = async () => {
    if (!profile) return;
    const incomingReq = incomingRequests.find(req => req.friend.id === profile.id);
    if (!incomingReq) return;
    try {
      setFriendshipLoading(true);
      await apiService.declineFriendRequest(incomingReq.id);
      setFriendshipStatus(null);
      setIncomingRequests(incomingRequests.filter(req => req.id !== incomingReq.id));
    } catch (err) {
      console.error('Failed to decline friend request:', err);
    } finally {
      setFriendshipLoading(false);
    }
  };

  const getAvatarDisplay = () => {
    if (profile?.avatarUrl && isExternalAvatarUrl(profile.avatarUrl)) {
      return <img src={profile.avatarUrl} alt={profile.username} className="avatar-image" />;
    }

    const defaultAvatar = DEFAULT_AVATARS.find((a) => a.id === profile?.avatarUrl);

    if (defaultAvatar) {
      return (
        <div className="avatar-placeholder" style={{ background: defaultAvatar.gradient }}>
          <span>{defaultAvatar.icon}</span>
        </div>
      );
    }

    return (
      <div className="avatar-placeholder" style={{ background: 'linear-gradient(135deg, #808895, #6B7380)' }}>
        <span>♙</span>
      </div>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <div className="page-wrapper page-loading">{t('loading')}</div>;
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="error-message">{error}</div>
        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">{t('back')}</button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-wrapper">
        <div className="error-message">{t('inviteNotFound')}</div>
        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">{t('back')}</button>
      </div>
    );
  }

  const stats = profile.stats || { wins: 0, losses: 0, draws: 0, totalGames: 0 };
  const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;

  const getIncomingRequest = () => {
    return incomingRequests.find(req => req.friend.id === profile?.id);
  };

  const getFriendshipButtonLabel = () => {
    if (!friendshipStatus) return t('addFriend');
    if (friendshipStatus.status === 'pending') return t('cancelFriendRequest');
    if (friendshipStatus.status === 'accepted') return t('removeFriend');
    return t('addFriend');
  };

  const handleFriendshipAction = () => {
    if (!friendshipStatus) {
      handleAddFriend();
    } else if (friendshipStatus.status === 'pending') {
      handleCancelFriendRequest();
    } else if (friendshipStatus.status === 'accepted') {
      handleRemoveFriend();
    }
  };

  // Filter games - optionally by current user
  const filteredGames = showOnlyAgainstMe && currentUser
    ? games.filter(g => 
        (g.whitePlayerId === currentUser.id && g.blackPlayerId === profile.id) ||
        (g.blackPlayerId === currentUser.id && g.whitePlayerId === profile.id)
      )
    : games;

  // Pagination
  const totalPages = Math.ceil(filteredGames.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGames = filteredGames.slice(startIndex, endIndex);

  return (
    <div className="page-wrapper profile-page">
      <div className="profile-content">
        <div className="profile-header">
          <div className="profile-avatar">
            {getAvatarDisplay()}
          </div>

          <div className="profile-info">
            <div className="profile-title">
              <h1>{profile.username}</h1>
            </div>

            <div className="rating-section">
              <div className="rating-display">
                <span className="rating-label">{t('rating')}</span>
                <span className="rating-value">{profile.rating}</span>
              </div>
            </div>

            {profile.bio && (
              <div className="bio-section">
                <p>{profile.bio}</p>
              </div>
            )}

            {profile.createdAt && (
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                {t('joinedDate')}: {formatDate(profile.createdAt)}
              </p>
            )}

            <div className="profile-actions">
              {getIncomingRequest() ? (
                <>
                  <button
                    type="button"
                    onClick={handleAcceptFriendRequest}
                    disabled={friendshipLoading}
                    className="btn btn-primary"
                  >
                    {t('acceptRequest')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeclineFriendRequest}
                    disabled={friendshipLoading}
                    className="btn btn-danger"
                  >
                    {t('declineRequest')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleFriendshipAction}
                    disabled={friendshipLoading}
                    className={`btn ${friendshipStatus?.status === 'accepted' ? 'btn-danger' : friendshipStatus?.status === 'pending' ? 'btn-secondary' : 'btn-primary'}`}
                  >
                    {getFriendshipButtonLabel()}
                  </button>
                  {currentUser && (
                    <button type="button" onClick={handleChallenge} disabled={challengeLoading} className="btn btn-primary">
                      {t('challenge')}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="profile-stats page-section">
          <h2 className="section-title">{t('statistics')}</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">{t('games')}</span>
              <span className="stat-value">{stats.totalGames}</span>
            </div>
            <div className="stat-card win">
              <span className="stat-label">{t('wins')}</span>
              <span className="stat-value">{stats.wins}</span>
            </div>
            <div className="stat-card draw">
              <span className="stat-label">{t('draws')}</span>
              <span className="stat-value">{stats.draws}</span>
            </div>
            <div className="stat-card loss">
              <span className="stat-label">{t('losses')}</span>
              <span className="stat-value">{stats.losses}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t('winRate')}</span>
              <span className="stat-value">{winRate}%</span>
            </div>
          </div>
        </div>

        <div className="games-section page-section">
          <h2 className="section-title">{t('gameHistory')}</h2>
          
          {currentUser && profile && currentUser.id !== profile.id && (
            <div className="games-section-header">
              <button
                type="button"
                className={`chip ${showOnlyAgainstMe ? 'active' : ''}`}
                onClick={() => {
                  setShowOnlyAgainstMe(!showOnlyAgainstMe);
                  setCurrentPage(1);
                }}
              >
                {t('against_me') || 'Against me'}
              </button>
            </div>
          )}

          {gamesLoading ? (
            <div className="page-loading">{t('loading')}</div>
          ) : games.length === 0 ? (
            <div className="empty-state">{t('noGames')}</div>
          ) : (
            <>
              <div className="games-list">
                {paginatedGames.map(game => {
                  const isWin = (profile.id === game.whitePlayerId && game.result === '1-0') ||
                                (profile.id === game.blackPlayerId && game.result === '0-1');
                  const isLoss = (profile.id === game.whitePlayerId && game.result === '0-1') ||
                                 (profile.id === game.blackPlayerId && game.result === '1-0');
                  const resultClass = isWin ? 'game-card--won' : isLoss ? 'game-card--lost' : 'game-card--draw';

                  return (
                    <div
                      key={game.id}
                      className={`game-card ${resultClass}`}
                      onClick={() => navigate(`/game/${game.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/game/${game.id}`); }}
                    >
                      <div className="game-card__row game-players">
                        <span className="player">{game.whiteUsername}</span>
                        <span className="vs">vs</span>
                        <span className="player">{game.blackUsername}</span>
                      </div>
                      <div className="game-card__row game-details">
                        <span className="time-control">{game.timeControl}</span>
                        <span className="status">{game.status}</span>
                        {game.result && <span className="result">{game.result}</span>}
                        {game.finishedAt && <span className="date">{formatDate(game.finishedAt)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    className="btn btn-secondary pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    ←
                  </button>

                  <span className="pagination-info">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    className="btn btn-secondary pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary profile-back">{t('back')}</button>
      </div>
    </div>
  );
};
