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
    return <div className="loading">{t('loading')}</div>;
  }

  return (
    <div className="friends-container">
      <h1>{t('friends')}</h1>

      <div className="friends-tabs">
        <button
          className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          {t('friends')} ({friends.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          {t('friendRequests')} ({pendingRequests.length})
        </button>
      </div>

      <div className="friends-content">
        {activeTab === 'pending' && (
          <div className="pending-requests">
            {pendingRequests.length === 0 ? (
              <p className="empty-message">{t('noFriendRequests')}</p>
            ) : (
              pendingRequests.map(req => (
                <div key={req.id} className="request-item">
                  <div className="request-header">
                    <div className="user-info">
                      <span className="username">{req.friend.username}</span>
                      <span className="rating">Rating: {req.friend.rating}</span>
                    </div>
                    <span className="date">{formatDate(req.createdAt)}</span>
                  </div>
                  <div className="request-actions">
                    <button
                      className="btn btn-accept"
                      onClick={() => handleAccept(req.id)}
                    >
                      {t('acceptRequest')}
                    </button>
                    <button
                      className="btn btn-decline"
                      onClick={() => handleDecline(req.id)}
                    >
                      {t('declineRequest')}
                    </button>
                    <button
                      className="btn btn-profile"
                      onClick={() => handleViewProfile(req.friend.username)}
                    >
                      {t('view')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="friends-list">
            {friends.length === 0 ? (
              <p className="empty-message">{t('noFriends')}</p>
            ) : (
              friends.map(friend => (
                <div key={friend.id} className="friend-item">
                  <div className="friend-header">
                    <div className="user-info">
                      <span className="username">{friend.friend.username}</span>
                      <span className="rating">Rating: {friend.friend.rating}</span>
                    </div>
                    <span className="date">{formatDate(friend.createdAt)}</span>
                  </div>
                  <div className="friend-actions">
                    <button
                      className="btn btn-profile"
                      onClick={() => handleViewProfile(friend.friend.username)}
                    >
                      {t('view')}
                    </button>
                    <button
                      className="btn btn-remove"
                      onClick={() => handleRemoveFriend(friend.friend.id)}
                    >
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
