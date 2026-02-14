import React, { useState, useEffect } from 'react';
import { Modal } from './common';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import './BotGameModal.css';

interface BotGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGameCreated: (gameId: string) => void;
}

interface BotDifficulty {
  name: string;
  depth: number;
}

export const BotGameModal: React.FC<BotGameModalProps> = ({ isOpen, onClose, onGameCreated }) => {
  const { t } = useTranslation();
  const [difficulties, setDifficulties] = useState<BotDifficulty[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('INTERMEDIATE');
  const [selectedColor, setSelectedColor] = useState<string>('random');
  const [timeControl, setTimeControl] = useState<string>('5+3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadDifficulties();
    }
  }, [isOpen]);

  const loadDifficulties = async () => {
    try {
      const diffs = await apiService.getBotDifficulties();
      setDifficulties(diffs);
      setError('');
    } catch (err) {
      setError('Failed to load difficulties');
    }
  };

  const handleCreateGame = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🤖 Creating bot game:', { selectedDifficulty, selectedColor, timeControl });
      const game = await apiService.createBotGame(selectedDifficulty, selectedColor, timeControl);
      console.log('✅ Bot game created:', game);
      onGameCreated(game.id);
      onClose();
    } catch (err: any) {
      console.error('❌ Bot game creation failed:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create game';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyTranslation = (name: string): string => {
    const key = name.toLowerCase() as 'beginner' | 'intermediate' | 'advanced' | 'expert';
    return t(key) || name;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('playVsComputer') || 'Play vs Computer'}>
      <div className="bot-game-modal-content">
        <div className="bot-game-form-group">
          <label>{t('difficulty')}</label>
          <div className="difficulty-grid">
            {difficulties.map(diff => (
              <button
                key={diff.name}
                className={`difficulty-button ${selectedDifficulty === diff.name ? 'active' : ''}`}
                onClick={() => setSelectedDifficulty(diff.name)}
                disabled={loading}
              >
                <div className="difficulty-name">{getDifficultyTranslation(diff.name)}</div>
                <div className="difficulty-depth">{t('depth')}: {diff.depth}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bot-game-form-group">
          <label>{t('color')}</label>
          <div className="color-buttons">
            <button
              className={`color-button ${selectedColor === 'random' ? 'active' : ''}`}
              onClick={() => setSelectedColor('random')}
              disabled={loading}
            >
              {t('random')}
            </button>
            <button
              className={`color-button ${selectedColor === 'white' ? 'active' : ''}`}
              onClick={() => setSelectedColor('white')}
              disabled={loading}
            >
              {t('white')}
            </button>
            <button
              className={`color-button ${selectedColor === 'black' ? 'active' : ''}`}
              onClick={() => setSelectedColor('black')}
              disabled={loading}
            >
              {t('black')}
            </button>
          </div>
        </div>

        <div className="bot-game-form-group">
          <label>{t('timeControl')}</label>
          <select
            value={timeControl}
            onChange={(e) => setTimeControl(e.target.value)}
            disabled={loading}
            className="bot-game-select"
          >
            <option value="1+0">1+0 (Bullet)</option>
            <option value="3+0">3+0 (Blitz)</option>
            <option value="3+2">3+2</option>
            <option value="5+3">5+3</option>
            <option value="10+5">10+5 (Rapid)</option>
            <option value="30+20">30+20</option>
          </select>
        </div>

        {error && <div className="bot-game-error">{error}</div>}

        <div className="bot-game-actions">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {t('cancel')}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreateGame}
            disabled={loading || difficulties.length === 0}
          >
            {loading ? t('creating') : t('play')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
