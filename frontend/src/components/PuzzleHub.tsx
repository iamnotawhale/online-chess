import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DailyPuzzle } from './DailyPuzzle';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import './PuzzleHub.css';

interface PuzzleHubProps {
  guestMode?: boolean;
}

export const PuzzleHub: React.FC<PuzzleHubProps> = ({ guestMode = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [puzzleRating, setPuzzleRating] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || guestMode) return;
    apiService.getPuzzleRating().then((r) => setPuzzleRating(r.rating)).catch(() => undefined);
  }, [isAuthenticated, guestMode]);

  if (guestMode) {
    return (
      <div className="puzzle-hub oc-page oc-page--nav">
        <h1 className="oc-head__title">{t('dailyPuzzle')}</h1>
        <div className="oc-block cc-card">
          <DailyPuzzle />
        </div>
        <p className="puzzle-hub-guest-note">
          <Link to="/login">{t('login')}</Link> {t('loginToSavePuzzleProgress')}
        </p>
      </div>
    );
  }

  return (
    <div className="puzzle-hub oc-page oc-page--nav">
      <h1 className="oc-head__title">{t('navPuzzles')}</h1>
      {puzzleRating !== null && (
        <p className="page-subtitle">{t('puzzleRating')}: <strong>{puzzleRating}</strong></p>
      )}

      <div className="oc-layout-aside puzzle-hub-layout">
        <div className="oc-block cc-card cc-card--featured">
          <DailyPuzzle />
        </div>

        <div className="puzzle-modes-grid">
          <div className="cc-card cc-mode-card">
            <h2 className="cc-card__title">{t('puzzleTraining')}</h2>
            <p className="section-desc">{t('puzzleTrainingDesc')}</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/puzzles/train')}>{t('startTraining')}</button>
          </div>
          <div className="cc-card cc-mode-card">
            <h2 className="cc-card__title">{t('puzzleRush')}</h2>
            <p className="section-desc">{t('puzzleRushDesc')}</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/puzzles/rush')}>{t('startRush')}</button>
          </div>
          <div className="cc-card cc-mode-card">
            <h2 className="cc-card__title">{t('navLearn')}</h2>
            <p className="section-desc">{t('educationFeatureStructured')}</p>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/education')}>{t('openEducation')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
