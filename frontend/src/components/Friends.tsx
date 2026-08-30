import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, User } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import './Friends.css';

interface Friendship {
  id: string;
  friend: User;
  status: string;
  createdAt: string;
}

export const Friends: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'friends'>('friends');

  useEffect(() => {
    loadData();
    // Reload every 10 seconds to get new friend requests
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [pending, friendsList] = await Promise.all([
        apiService.getPendingFriendRequests(),
        apiService.getFriends(),
      ]);
      setPendingRequests(pending);
      setFriends(friendsList);
    } catch (err) {
      console.error('Failed to load friend data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    try {
      await apiService.acceptFriendRequest(friendshipId);
      await loadData();
    } catch (err) {
      console.error('Failed to accept friend request:', err);
    }
  };

  const handleDecline = async (friendshipId: string) => {
    try {
      await apiService.declineFriendRequest(friendshipId);
      await loadData();
    } catch (err) {
      console.error('Failed to decline friend request:', err);
    }
  };

  const handleChallenge = async (userId: string) => {
    try {
      await apiService.createChallenge(userId);
      alert(t('challengeSent'));
    } catch (err) {
      console.error('Challenge failed:', err);
    }
  };

  const handleRemoveFriend = async (userId: string) => {
    if (window.confirm(t('confirmRemoveFriend'))) {
      try {
        await apiService.removeFriend(userId);
        await loadData();
      } catch (err) {
        console.error('Failed to remove friend:', err);
      }
    }
  };

  const handleViewProfile = (username: string) => {
    navigate(`/user/${username}`);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return <div className="page-wrapper page-loading">{t('loading')}</div>;
  }

  return (
    <div className="page-wrapper friends-page">
      <h1 className="page-title">{t('friends')}</h1>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          {t('friends')} ({friends.length})
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          {t('friendRequests')} ({pendingRequests.length})
        </button>
      </div>

      <div className="friends-content">
        {activeTab === 'pending' && (
          <div className="list-stack">
            {pendingRequests.length === 0 ? (
              <p className="empty-state">{t('noFriendRequests')}</p>
            ) : (
              pendingRequests.map(req => (
                <div key={req.id} className="list-card">
                  <div className="list-card__row">
                    <div className="list-card__main">
                      <span className="list-card__title">{req.friend.username}</span>
                      <span className="list-card__meta">{t('rating')}: {req.friend.rating}</span>
                    </div>
                    <span className="list-card__meta">{formatDate(req.createdAt)}</span>
                  </div>
                  <div className="list-card__actions">
                    <button type="button" className="btn btn-success btn-sm" onClick={() => handleAccept(req.id)}>
                      {t('acceptRequest')}
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDecline(req.id)}>
                      {t('declineRequest')}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleViewProfile(req.friend.username)}>
                      {t('view')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="list-stack">
            {friends.length === 0 ? (
              <p className="empty-state">{t('noFriends')}</p>
            ) : (
              friends.map(friend => (
                <div key={friend.id} className="list-card">
                  <div className="list-card__row">
                    <div className="list-card__main">
                      <span className="list-card__title">
                        {friend.friend.online && <span className="online-dot" title={t('online')} />}
                        {friend.friend.username}
                      </span>
                      <span className="list-card__meta">{t('rating')}: {friend.friend.rating}</span>
                    </div>
                    <span className="list-card__meta">{formatDate(friend.createdAt)}</span>
                  </div>
                  <div className="list-card__actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleViewProfile(friend.friend.username)}>
                      {t('view')}
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => handleChallenge(friend.friend.id)}>
                      {t('challenge')}
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveFriend(friend.friend.id)}>
                      {t('removeFriend')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
