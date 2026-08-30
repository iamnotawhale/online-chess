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
    <div className="oc-page oc-page--play oc-page--nav play-hub">
      <div className="oc-head play-hub__intro">
        <h1 className="oc-head__title">{t('navPlay')}</h1>
        <p className="page-subtitle">{t('playHubSubtitle')}</p>
      </div>

      <div className="cta-grid">
        <button type="button" className="cta-card cta-card--primary" onClick={() => document.getElementById('quick-play')?.scrollIntoView({ behavior: 'smooth' })}>
          <span className="cta-card__icon">⚡</span>
          <span className="cta-card__title">{t('quickPlay')}</span>
          <span className="cta-card__desc">{t('quickPlayDesc')}</span>
        </button>
        <button type="button" className="cta-card" onClick={() => setIsLobbyOpen(true)}>
          <span className="cta-card__icon">♟</span>
          <span className="cta-card__title">{t('createLobby')}</span>
          <span className="cta-card__desc">{t('createLobbyDesc')}</span>
        </button>
        <button type="button" className="cta-card" onClick={() => setIsBotOpen(true)}>
          <span className="cta-card__icon">🤖</span>
          <span className="cta-card__title">{t('playVsComputer')}</span>
          <span className="cta-card__desc">{t('playVsComputerDesc')}</span>
        </button>
        <button type="button" className="cta-card" onClick={() => setIsInviteOpen(true)}>
          <span className="cta-card__icon">🔗</span>
          <span className="cta-card__title">{t('inviteByLink')}</span>
          <span className="cta-card__desc">{t('inviteByLinkDesc')}</span>
        </button>
      </div>

      <div className="oc-layout-aside play-hub-layout">
        <div id="quick-play" className="oc-layout-aside__main play-hub-main">
          <div className="cc-card">
            <MatchmakingPanel />
          </div>
        </div>
        <aside className="oc-layout-aside__side play-hub-aside">
          <div className="cc-card">
            <Lobby
              key={lobbyKey}
              onGameStart={(id) => navigate(`/game/${id}`)}
              onGameCancelled={() => setLobbyKey((k) => k + 1)}
            />
          </div>
        </aside>
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
