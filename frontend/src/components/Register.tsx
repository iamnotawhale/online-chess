import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/LanguageContext';
import './Auth.css';

export const Register: React.FC = () => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectParam = new URLSearchParams(location.search).get('redirect');
  const redirectTo = redirectParam || '/';
  const loginLink = redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) {
      setError(t('usernameMinLength'));
      return;
    }

    if (username.length > 32) {
      setError(t('usernameMaxLength'));
      return;
    }

    if (password.length < 6) {
      setError(t('passwordMinLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    try {
      await register({ username, email, password });
      navigate(redirectTo);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || t('registerError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>{t('registerTitle')}</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>{t('usernameLabel')}:</label>
            <input
              type="text"
              className="form-input"
              value={username}
              minLength={3}
              maxLength={32}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>{t('email')}:</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>{t('passwordLabel')}:</label>
            <input
              type="password"
              className="form-input"
              value={password}
              minLength={6}
              maxLength={64}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>{t('confirmPassword')}:</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              minLength={6}
              maxLength={64}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? t('loading') : t('registerButton')}
          </button>
        </form>
        <p className="auth-link">
          {t('alreadyHaveAccount')} <Link to={loginLink}>{t('loginLinkText')}</Link>
        </p>
      </div>
    </div>
  );
};
