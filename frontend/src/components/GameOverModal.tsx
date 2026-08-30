import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './common';
import { useTranslation } from '../i18n/LanguageContext';
import { copyPgn, downloadPgn, fetchGamePgn } from '../utils/pgn';
import './GameOverModal.css';

interface GameOverModalProps {
  isOpen: boolean;
  gameId: string;
  result: string;
  resultReason?: string;
  opponentName?: string;
  onRematch?: () => void;
  rematchLoading?: boolean;
  onClose?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  gameId,
  result,
  resultReason,
  opponentName,
  onRematch,
  rematchLoading,
  onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pgnBusy, setPgnBusy] = useState(false);
  const [pgnMsg, setPgnMsg] = useState('');

  const resultLabel = result === '1-0' ? t('whiteWins') : result === '0-1' ? t('blackWins') : result === '1/2-1/2' ? t('draw') : result;

  const handleCopyPgn = async () => {
    setPgnBusy(true);
    try {
      const pgn = await fetchGamePgn(gameId);
      await copyPgn(pgn);
      setPgnMsg(t('pgnCopied'));
    } catch {
      setPgnMsg(t('error'));
    } finally {
      setPgnBusy(false);
      setTimeout(() => setPgnMsg(''), 2000);
    }
  };

  const handleDownloadPgn = async () => {
    setPgnBusy(true);
    try {
      const pgn = await fetchGamePgn(gameId);
      downloadPgn(pgn, `onchess-${gameId.slice(0, 8)}`);
    } catch {
      setPgnMsg(t('error'));
    } finally {
      setPgnBusy(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/game/${gameId}`;
    try {
      await navigator.clipboard.writeText(url);
      setPgnMsg(t('linkCopied'));
      setTimeout(() => setPgnMsg(''), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose || (() => undefined)} title={t('gameOver')}>
      <div className="game-over-modal">
        <p className="game-over-result">{resultLabel}</p>
        {resultReason && <p className="game-over-reason">{resultReason}</p>}
        {opponentName && <p className="game-over-opponent">{t('vs')} {opponentName}</p>}
        {pgnMsg && <p className="game-over-msg">{pgnMsg}</p>}
        <div className="game-over-actions">
          <button type="button" className="btn btn-primary" onClick={() => navigate(`/analysis/${gameId}`)}>
            {t('analysis')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/play')}>
            {t('newGame')}
          </button>
          {onRematch && (
            <button type="button" className="btn btn-secondary" onClick={onRematch} disabled={rematchLoading}>
              {rematchLoading ? t('loading') : t('rematch')}
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyPgn} disabled={pgnBusy}>
            {t('copyPgn')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownloadPgn} disabled={pgnBusy}>
            {t('downloadPgn')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleShare}>
            {t('shareGame')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
