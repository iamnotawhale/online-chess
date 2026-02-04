import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../api';
import './Auth.css';

interface RegisterProps {
  onRegisterSuccess: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess }) => {
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
      setError('Имя пользователя должно быть минимум 3 символа');
      return;
    }

    if (username.length > 32) {
      setError('Имя пользователя не должно превышать 32 символа');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть минимум 6 символов');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      await apiService.register({ username, email, password });
      onRegisterSuccess();
      navigate(redirectTo);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Регистрация</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Имя пользователя (3-32 символа):</label>
            <input
              type="text"
              value={username}
              minLength={3}
              maxLength={32}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Пароль (минимум 6 символов):</label>
            <input
              type="password"
              value={password}
              minLength={6}
              maxLength={64}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Подтвердите пароль:</label>
            <input
              type="password"
              value={confirmPassword}
              minLength={6}
              maxLength={64}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Загрузка...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p className="auth-link">
          Уже есть аккаунт? <a href={loginLink}>Войти</a>
        </p>
      </div>
    </div>
  );
};
