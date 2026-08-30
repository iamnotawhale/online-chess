import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatchmakingPanel } from './MatchmakingPanel';
import { Lobby } from './Lobby';
import { BotGameModal } from './BotGameModal';
import { InviteByLinkModal } from './InviteByLinkModal';
import { CreateLobbyModal } from './CreateLobbyModal';
import { useTranslation } from '../i18n/LanguageContext';
import './PlayHub.css';

export const PlayHub: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [lobbyKey, setLobbyKey] = useState(0);

  return (
    <div className="play-hub">
      <div className="play-hub-header">
        <h1>{t('navPlay')}</h1>
        <p>{t('playHubSubtitle')}</p>
      </div>

      <div className="play-cta-grid">
        <button type="button" className="play-cta-card play-cta-primary" onClick={() => document.getElementById('quick-play')?.scrollIntoView({ behavior: 'smooth' })}>
          <span className="play-cta-icon">⚡</span>
          <span className="play-cta-title">{t('quickPlay')}</span>
          <span className="play-cta-desc">{t('quickPlayDesc')}</span>
        </button>
        <button type="button" className="play-cta-card" onClick={() => setIsLobbyOpen(true)}>
          <span className="play-cta-icon">♟</span>
          <span className="play-cta-title">{t('createLobby')}</span>
          <span className="play-cta-desc">{t('createLobbyDesc')}</span>
        </button>
        <button type="button" className="play-cta-card" onClick={() => setIsBotOpen(true)}>
          <span className="play-cta-icon">🤖</span>
          <span className="play-cta-title">{t('playVsComputer')}</span>
          <span className="play-cta-desc">{t('playVsComputerDesc')}</span>
        </button>
        <button type="button" className="play-cta-card" onClick={() => setIsInviteOpen(true)}>
          <span className="play-cta-icon">🔗</span>
          <span className="play-cta-title">{t('inviteByLink')}</span>
          <span className="play-cta-desc">{t('inviteByLinkDesc')}</span>
        </button>
      </div>

      <div className="play-hub-grid">
        <div id="quick-play" className="play-hub-main">
          <MatchmakingPanel />
        </div>
        <div className="play-hub-sidebar section">
          <Lobby
            key={lobbyKey}
            onGameStart={(id) => navigate(`/game/${id}`)}
            onGameCancelled={() => setLobbyKey((k) => k + 1)}
          />
        </div>
      </div>

      <BotGameModal
        isOpen={isBotOpen}
        onClose={() => setIsBotOpen(false)}
        onGameCreated={(id) => navigate(`/game/${id}`)}
      />
      {isInviteOpen && <InviteByLinkModal onClose={() => setIsInviteOpen(false)} />}
      <CreateLobbyModal
        isOpen={isLobbyOpen}
        onClose={() => setIsLobbyOpen(false)}
        onCreated={() => setLobbyKey((k) => k + 1)}
      />
    </div>
  );
};
