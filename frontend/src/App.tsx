import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { apiService } from './api';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import { GameView } from './components/Game';
import { InviteAccept } from './components/InviteAccept';
import { useTranslation } from './i18n/LanguageContext';
import './App.css';

type ThemeMode = 'light' | 'dark';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div className="loading">Загрузка...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

type HeaderProps = {
  themeMode: ThemeMode;
  onToggleTheme: () => void;
};

const Header: React.FC<HeaderProps> = ({ themeMode, onToggleTheme }) => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useTranslation();
  const isAuthenticated = !!localStorage.getItem('authToken');

  const handleLogout = () => {
    apiService.logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <div className="logo-icon">
            <span className="chess-piece">♔</span>
            <span className="chess-piece">♚</span>
          </div>
          <span className="logo-text">ON-CHESS</span>
        </div>
        <div className="header-actions">
          <div className="language-switcher">
            <button
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
            <button
              className={`lang-btn ${language === 'ru' ? 'active' : ''}`}
              onClick={() => setLanguage('ru')}
            >
              RU
            </button>
          </div>
          <button
            type="button"
            className="theme-toggle"
            aria-label={themeMode === 'dark' ? t('themeDark') : t('themeLight')}
            title={themeMode === 'dark' ? t('themeDark') : t('themeLight')}
            onClick={onToggleTheme}
          >
            <span className="theme-icon" aria-hidden="true">
              {themeMode === 'dark' ? '🌙' : '☀️'}
            </span>
          </button>
          {isAuthenticated && (
            <button onClick={handleLogout} className="logout-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6M10.6667 11.3333L14 8M14 8L10.6667 4.66667M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{t('logout')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('themeMode') as ThemeMode | null;
    return stored || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.body.setAttribute('data-theme', themeMode);
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  const handleToggleTheme = () => {
    setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Header themeMode={themeMode} onToggleTheme={handleToggleTheme} />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Login onLoginSuccess={() => {}} />} />
          <Route path="/register" element={<Register onRegisterSuccess={() => {}} />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game/:gameId"
            element={
              <ProtectedRoute>
                <GameView />
              </ProtectedRoute>
            }
          />
          <Route path="/invite/:code" element={<InviteAccept />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
