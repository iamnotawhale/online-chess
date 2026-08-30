import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import { Modal } from './common';
import './ChallengeInbox.css';

interface Challenge {
  id: string;
  challengerUsername?: string;
  timeControl?: string;
  rated?: boolean;
}

interface ChallengeInboxProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const ChallengeInbox: React.FC<ChallengeInboxProps> = ({ isOpen, onClose, onUpdated }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await apiService.getIncomingChallenges();
      setChallenges(list);
    } catch {
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  const accept = async (id: string) => {
    setBusyId(id);
    try {
      const game = await apiService.acceptChallenge(id);
      onUpdated?.();
      onClose();
      navigate(`/game/${game.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (id: string) => {
    setBusyId(id);
    try {
      await apiService.declineChallenge(id);
      await load();
      onUpdated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('challenge')}>
      <div className="challenge-inbox">
        {loading && <p>{t('loading')}</p>}
        {!loading && challenges.length === 0 && <p className="empty-message">{t('noChallenges')}</p>}
        {!loading && challenges.map((c) => (
          <div key={c.id} className="challenge-item">
            <div>
              <strong>{c.challengerUsername || '?'}</strong>
              <span className="challenge-meta">{c.timeControl} · {c.rated ? t('rated') : t('unrated')}</span>
            </div>
            <div className="challenge-actions">
              <button type="button" className="btn btn-primary btn-sm" disabled={busyId === c.id} onClick={() => accept(c.id)}>
                {t('acceptRequest')}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={busyId === c.id} onClick={() => decline(c.id)}>
                {t('declineRequest')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
