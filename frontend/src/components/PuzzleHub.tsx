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
      <div className="puzzle-hub page-wrapper">
        <h1 className="page-title">{t('dailyPuzzle')}</h1>
        <DailyPuzzle />
        <p className="puzzle-hub-guest-note">
          <Link to="/login">{t('login')}</Link> {t('loginToSavePuzzleProgress')}
        </p>
      </div>
    );
  }

  return (
    <div className="puzzle-hub page-wrapper">
      <h1 className="page-title">{t('navPuzzles')}</h1>
      {puzzleRating !== null && (
        <p className="page-subtitle">{t('puzzleRating')}: <strong>{puzzleRating}</strong></p>
      )}
      <div className="page-flow layout-cards">
        <section className="page-section puzzle-hub-block">
          <h2 className="section-title">{t('dailyPuzzle')}</h2>
          <DailyPuzzle />
        </section>
        <section className="page-section puzzle-hub-block">
          <h2 className="section-title">{t('puzzleTraining')}</h2>
          <p className="section-desc">{t('puzzleTrainingDesc')}</p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/puzzles/train')}>{t('startTraining')}</button>
        </section>
        <section className="page-section puzzle-hub-block">
          <h2 className="section-title">{t('puzzleRush')}</h2>
          <p className="section-desc">{t('puzzleRushDesc')}</p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/puzzles/rush')}>{t('startRush')}</button>
        </section>
        <section className="page-section puzzle-hub-block">
          <h2 className="section-title">{t('navLearn')}</h2>
          <p className="section-desc">{t('educationFeatureStructured')}</p>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => navigate('/education')}>{t('openEducation')}</button>
        </section>
      </div>
    </div>
  );
};
