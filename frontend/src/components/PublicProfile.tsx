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

const DEFAULT_AVATARS = [
  { id: 'king-gold', icon: '♔', gradient: 'linear-gradient(135deg, #C9A46A, #B58B52)' },
  { id: 'queen-purple', icon: '♕', gradient: 'linear-gradient(135deg, #9B8CCB, #7E6FB1)' },
  { id: 'rook-blue', icon: '♖', gradient: 'linear-gradient(135deg, #7C93B8, #5F779C)' },
  { id: 'bishop-green', icon: '♗', gradient: 'linear-gradient(135deg, #7FAF9B, #5E8F7C)' },
  { id: 'knight-red', icon: '♘', gradient: 'linear-gradient(135deg, #C98686, #AA6A6A)' },
];

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
    if (profile?.avatarUrl?.startsWith('http')) {
      return <img src={profile.avatarUrl} alt={profile.username} className="avatar-image" />;
    }
    
    const avatarId = profile?.avatarUrl;
    const defaultAvatar = DEFAULT_AVATARS.find(a => a.id === avatarId);
    
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
    return <div className="profile-container">{t('loading')}</div>;
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate(-1)} className="back-btn">{t('back')}</button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container">
        <div className="error-message">{t('inviteNotFound')}</div>
        <button onClick={() => navigate(-1)} className="back-btn">{t('back')}</button>
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
    <div className="profile-container">
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
                    onClick={handleAcceptFriendRequest}
                    disabled={friendshipLoading}
                    className="friend-btn add"
                  >
                    {t('acceptRequest')}
                  </button>
                  <button
                    onClick={handleDeclineFriendRequest}
                    disabled={friendshipLoading}
                    className="friend-btn remove"
                  >
                    {t('declineRequest')}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleFriendshipAction}
                  disabled={friendshipLoading}
                  className={`friend-btn ${friendshipStatus?.status === 'accepted' ? 'remove' : friendshipStatus?.status === 'pending' ? 'pending' : 'add'}`}
                >
                  {getFriendshipButtonLabel()}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <h2>{t('statistics')}</h2>
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

        <div className="games-section">
          <h2>{t('gameHistory')}</h2>
          
          {currentUser && profile && currentUser.id !== profile.id && (
            <div className="games-section-header">
              <button
                className={`filter-btn ${showOnlyAgainstMe ? 'active' : ''}`}
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
            <div className="loading">{t('loading')}</div>
          ) : games.length === 0 ? (
            <div className="no-games">{t('noGames')}</div>
          ) : (
            <>
              <div className="games-list">
                {paginatedGames.map(game => {
                  const isWin = (profile.id === game.whitePlayerId && game.result === '1-0') ||
                                (profile.id === game.blackPlayerId && game.result === '0-1');
                  const isDraw = game.result === '1/2-1/2';
                  const isLoss = (profile.id === game.whitePlayerId && game.result === '0-1') ||
                                 (profile.id === game.blackPlayerId && game.result === '1-0');
                  
                  let borderColor = 'var(--muted)';
                  if (isWin) borderColor = 'var(--success-text)';
                  else if (isLoss) borderColor = 'var(--danger-text)';
                  else if (isDraw) borderColor = 'var(--muted)';

                  return (
                    <div
                      key={game.id}
                      className="game-item"
                      onClick={() => navigate(`/game/${game.id}`)}
                      style={{ borderLeftColor: borderColor }}
                    >
                      <div className="game-players">
                        <span className="player">{game.whiteUsername}</span>
                        <span className="vs">vs</span>
                        <span className="player">{game.blackUsername}</span>
                      </div>
                      <div className="game-details">
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
                    className="pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    ←
                  </button>

                  <span className="pagination-info">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    className="pagination-btn"
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

        <button onClick={() => navigate(-1)} className="back-btn">{t('back')}</button>
      </div>
    </div>
  );
};
