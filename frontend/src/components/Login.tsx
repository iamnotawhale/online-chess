import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/LanguageContext';
import './Auth.css';

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectParam = new URLSearchParams(location.search).get('redirect');
  const redirectTo = redirectParam || '/';
  const registerLink = redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : '/register';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(redirectTo);
    } catch (err: any) {
      if (err?.message === 'STORAGE_UNAVAILABLE') {
        setError(t('loginError') + ' (storage blocked — disable private mode)');
      } else if (err.response?.status === 401) {
        setError(t('invalidCredentials'));
      } else if (!err.response) {
        setError(t('loginError') + ' (network)');
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || t('loginError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-layout">
        <div className="auth-pitch">
          <h2>ONCHESS</h2>
          <p>{t('loginPitch')}</p>
          <Link to="/puzzles/daily" className="btn btn-secondary">{t('dailyPuzzle')}</Link>
        </div>
        <div className="auth-box">
        <h1>{t('loginTitle')}</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>{t('email')}:</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>{t('password')}:</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? t('loading') : t('loginButton')}
          </button>
        </form>
        <p className="auth-link">
          {t('noAccount')} <Link to={registerLink}>{t('registerLink')}</Link>
        </p>
        </div>
      </div>
    </div>
  );
};
