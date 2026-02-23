import React, { useState } from 'react';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import './InviteByLink.css';

interface InviteByLinkModalProps {
  onClose: () => void;
}

const PRESETS = [
  { gameMode: 'bullet' as const, timeControl: '1+0' },
  { gameMode: 'bullet' as const, timeControl: '2+1' },
  { gameMode: 'blitz' as const, timeControl: '3+0' },
  { gameMode: 'blitz' as const, timeControl: '3+2' },
  { gameMode: 'blitz' as const, timeControl: '5+0' },
  { gameMode: 'blitz' as const, timeControl: '5+3' },
  { gameMode: 'rapid' as const, timeControl: '10+0' },
  { gameMode: 'rapid' as const, timeControl: '10+5' },
  { gameMode: 'rapid' as const, timeControl: '15+10' },
  { gameMode: 'rapid' as const, timeControl: '25+0' },
  { gameMode: 'classic' as const, timeControl: '30+0' },
  { gameMode: 'classic' as const, timeControl: '30+30' },
  { gameMode: 'custom' as const, timeControl: 'custom' },
];

export const InviteByLinkModal: React.FC<InviteByLinkModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [customMinutes, setCustomMinutes] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(0);
  const [customColor, setCustomColor] = useState<'random' | 'white' | 'black'>('random');
  const [customIsRated, setCustomIsRated] = useState(true);

  const handleCreateInvite = async () => {
    if (!selectedPreset) return;
    
    const preset = PRESETS.find(p => `${p.gameMode}-${p.timeControl}` === selectedPreset);
    if (!preset) return;

    let gameMode = preset.gameMode;
    let timeControl = preset.timeControl;
    
    // Handle custom time control
    if (preset.timeControl === 'custom') {
      gameMode = 'custom';
      timeControl = `${customMinutes}+${customIncrement}`;
    }

    setLoading(true);
    try {
      const response = await apiService.createInvite({
        gameMode,
        timeControl,
        isRated: preset.timeControl === 'custom' ? customIsRated : true,
        preferredColor: preset.timeControl === 'custom' ? customColor : undefined,
      });
      setInviteLink(`${window.location.origin}/invite/${encodeURIComponent(response.id)}`);
    } catch (err: any) {
      alert(err.response?.data?.message || t('inviteError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      alert(t('linkCopied'));
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  const handleNewPreset = () => {
    setSelectedPreset(null);
    setInviteLink('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content invite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('inviteByLink')}</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {!inviteLink ? (
          <>
            <p className="modal-description">
              {t('selectGameTypeAndTimeControl')}
            </p>
            <div className="invite-presets">
              {PRESETS.map((preset) => (
                <button
                  key={`${preset.gameMode}-${preset.timeControl}`}
                  type="button"
                  className={`invite-preset-btn ${preset.timeControl === 'custom' ? 'custom-preset' : ''} ${
                    selectedPreset === `${preset.gameMode}-${preset.timeControl}` ? 'active' : ''
                  }`}
                  onClick={() => setSelectedPreset(`${preset.gameMode}-${preset.timeControl}`)}
                  disabled={loading}
                >
                  {preset.timeControl === 'custom' ? (
                    <div className="preset-label">Custom</div>
                  ) : (
                    <>
                      <div className="preset-time">{preset.timeControl}</div>
                      <div className="preset-mode">{preset.gameMode}</div>
                    </>
                  )}
                </button>
              ))}
            </div>
            
            {selectedPreset === 'custom-custom' && (
              <div className="custom-controls">
                <div className="color-buttons">
                  <button
                    type="button"
                    className={`color-btn ${customColor === 'random' ? 'active' : ''}`}
                    onClick={() => setCustomColor('random')}
                  >
                    {t('random')}
                  </button>
                  <button
                    type="button"
                    className={`color-btn ${customColor === 'white' ? 'active' : ''}`}
                    onClick={() => setCustomColor('white')}
                  >
                    {t('white')}
                  </button>
                  <button
                    type="button"
                    className={`color-btn ${customColor === 'black' ? 'active' : ''}`}
                    onClick={() => setCustomColor('black')}
                  >
                    {t('black')}
                  </button>
                </div>
                <div className="control-group">
                  <label>{t('minutes')}: {customMinutes}</label>
                  <input
                    type="range"
                    min="0"
                    max="120"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(parseInt(e.target.value))}
                  />
                </div>
                <div className="control-group">
                  <label>{t('increment')}: {customIncrement}</label>
                  <input
                    type="range"
                    min="0"
                    max="120"
                    value={customIncrement}
                    onChange={(e) => setCustomIncrement(parseInt(e.target.value))}
                  />
                </div>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={customIsRated}
                      onChange={(e) => setCustomIsRated(e.target.checked)}
                    />
                    {t('ratedGame')}
                  </label>
                </div>
              </div>
            )}
            
            <button
              type="button"
              className="generate-link-btn"
              onClick={handleCreateInvite}
              disabled={!selectedPreset || loading}
            >
              {loading ? t('loading') : t('generateLink')}
            </button>
          </>
        ) : (
          <>
            <div className="invite-link-display">
              <p className="invite-success">{t('inviteLinkCreated')}</p>
              <div className="link-section">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="invite-link-input"
                />
                <button
                  type="button"
                  className="copy-link-btn"
                  onClick={handleCopyLink}
                >
                  {t('copy')}
                </button>
              </div>
              <div className="qr-section">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}`}
                  alt="QR Code"
                  className="qr-code"
                />
              </div>
              <button
                type="button"
                className="new-preset-btn"
                onClick={handleNewPreset}
              >
                {t('createAnother')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
