import React, { useState } from 'react';
import { Modal } from './common';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import './CreateLobbyModal.css';

interface CreateLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const CreateLobbyModal: React.FC<CreateLobbyModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { t } = useTranslation();
  const [gameMode, setGameMode] = useState('blitz');
  const [minutes, setMinutes] = useState(5);
  const [increment, setIncrement] = useState(0);
  const [preferredColor, setPreferredColor] = useState<'random' | 'white' | 'black'>('random');
  const [isRated, setIsRated] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiService.createLobbyGame({
        gameMode,
        timeControl: `${minutes}+${increment}`,
        preferredColor,
        isRated,
      });
      onCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('createLobby')}>
      <form className="create-lobby-form" onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
          <label>{t('modeLabel')}</label>
          <select value={gameMode} onChange={(e) => setGameMode(e.target.value)} className="form-input">
            <option value="bullet">Bullet</option>
            <option value="blitz">Blitz</option>
            <option value="rapid">Rapid</option>
            <option value="classic">Classic</option>
            <option value="custom">{t('custom')}</option>
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>{t('minutes')}</label>
            <input type="number" min={1} max={180} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="form-input" />
          </div>
          <div className="form-group">
            <label>{t('increment')}</label>
            <input type="number" min={0} max={60} value={increment} onChange={(e) => setIncrement(Number(e.target.value))} className="form-input" />
          </div>
        </div>
        <div className="form-group">
          <label>{t('colorLabel')}</label>
          <div className="color-buttons">
            {(['random', 'white', 'black'] as const).map((c) => (
              <button key={c} type="button" className={`color-btn ${preferredColor === c ? 'active' : ''}`} onClick={() => setPreferredColor(c)}>
                {t(c)}
              </button>
            ))}
          </div>
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={isRated} onChange={(e) => setIsRated(e.target.checked)} />
          {t('rated')}
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? t('loading') : t('createLobby')}
        </button>
      </form>
    </Modal>
  );
};
