import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import './InviteAccept.css';

interface InviteDetails {
  code: string;
  inviteUrl: string;
  gameMode: string;
  timeControl?: string;
  rated: boolean;
  preferredColor?: string;
  expiresAt: string;
  used: boolean;
  creatorUsername: string;
}

export const InviteAccept: React.FC = () => {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadInvite = async () => {
      if (!code) return;
      try {
        setLoading(true);
        const response = await apiService.getInvite(code);
        setInvite(response);
      } catch (err: any) {
        setError(err.response?.data?.error || t('inviteNotFoundMsg'));
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [code]);

  const handleAccept = async () => {
    if (!code) return;
    setAccepting(true);
    try {
      const game = await apiService.acceptInvite(code);
      navigate(`/game/${game.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || t('failedToAccept'));
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return <div className="invite-container"><p>{t('loading')}</p></div>;
  }

  if (error) {
    return <div className="invite-container"><p className="error">{error}</p></div>;
  }

  if (!invite) {
    return <div className="invite-container"><p>{t('inviteNotFoundMsg')}</p></div>;
  }

  const isAuthenticated = apiService.isAuthenticated();
  const loginLink = `/login?redirect=${encodeURIComponent(`/invite/${invite.code}`)}`;

  return (
    <div className="invite-container">
      <div className="invite-card">
        <h2>{t('inviteToGame')}</h2>
        <p><strong>{t('from')}:</strong> {invite.creatorUsername}</p>
        <p><strong>{t('control')}:</strong> {invite.timeControl || '—'}</p>
        <p><strong>{t('mode')}:</strong> {invite.gameMode}</p>
        <p><strong>{t('type')}:</strong> {invite.rated ? t('rated') : t('friendly')}</p>
        <p><strong>{t('creatorColor')}:</strong> {invite.preferredColor || 'random'}</p>
        <p><strong>{t('code')}:</strong> {invite.code}</p>
        {invite.used ? (
          <p className="error">{t('inviteAlreadyUsed')}</p>
        ) : (
          <div className="invite-actions">
            {isAuthenticated ? (
              <button type="button" onClick={handleAccept} disabled={accepting}>
                {t('acceptAndStart')}
              </button>
            ) : (
              <Link to={loginLink} className="login-link">{t('loginToAccept')}</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
