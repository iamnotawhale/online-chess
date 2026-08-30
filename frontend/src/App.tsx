import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import GameView from './components/Game';
import { GameAnalysis } from './components/GameAnalysis';
import { InviteAccept } from './components/InviteAccept';
import { Profile } from './components/Profile';
import { PublicProfile } from './components/PublicProfile';
import { Friends } from './components/Friends';
import { PuzzleTraining } from './components/PuzzleTraining';
import { Education } from './components/Education';
import { useTranslation } from './i18n/LanguageContext';
import './App.css';

type ThemeMode = 'light' | 'dark';

const DEFAULT_AVATARS = [
  { id: 'king-gold', icon: '♔', gradient: 'linear-gradient(135deg, #C9A46A, #B58B52)' },
  { id: 'queen-purple', icon: '♕', gradient: 'linear-gradient(135deg, #9B8CCB, #7E6FB1)' },
  { id: 'rook-blue', icon: '♖', gradient: 'linear-gradient(135deg, #7C93B8, #5F779C)' },
  { id: 'bishop-green', icon: '♗', gradient: 'linear-gradient(135deg, #7FAF9B, #5E8F7C)' },
  { id: 'knight-red', icon: '♘', gradient: 'linear-gradient(135deg, #C98686, #AA6A6A)' },
  { id: 'pawn-gray', icon: '♙', gradient: 'linear-gradient(135deg, #808895, #6B7380)' },
  { id: 'king-dark', icon: '♚', gradient: 'linear-gradient(135deg, #404552, #2F3440)' },
  { id: 'queen-pink', icon: '♛', gradient: 'linear-gradient(135deg, #C58FA6, #AA718C)' },
  { id: 'rook-cyan', icon: '♜', gradient: 'linear-gradient(135deg, #7DA9B3, #5C8D98)' },
  { id: 'bishop-orange', icon: '♝', gradient: 'linear-gradient(135deg, #C79B7A, #B07E5C)' },
  { id: 'knight-teal', icon: '♞', gradient: 'linear-gradient(135deg, #7BA9A4, #5E8F8A)' },
  { id: 'pawn-indigo', icon: '♟', gradient: 'linear-gradient(135deg, #7B84A6, #5F688D)' },
  { id: 'king-emerald', icon: '♔', gradient: 'linear-gradient(135deg, #8CB8A0, #6F9A84)' },
  { id: 'queen-amber', icon: '♕', gradient: 'linear-gradient(135deg, #C7A36E, #B08956)' },
  { id: 'rook-rose', icon: '♖', gradient: 'linear-gradient(135deg, #C18A8A, #A86F6F)' },
  { id: 'bishop-violet', icon: '♗', gradient: 'linear-gradient(135deg, #9E8CBF, #806FA6)' },
  { id: 'knight-lime', icon: '♘', gradient: 'linear-gradient(135deg, #9CB579, #7F985E)' },
  { id: 'pawn-slate', icon: '♙', gradient: 'linear-gradient(135deg, #7A8699, #5E6B80)' },
  { id: 'king-sky', icon: '♚', gradient: 'linear-gradient(135deg, #7FA6B9, #5F8CA3)' },
  { id: 'queen-fuchsia', icon: '♛', gradient: 'linear-gradient(135deg, #B98AA9, #A06E90)' },
];

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading">{t('loading')}</div>;
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
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  React.useEffect(() => {
    const handleProfileUpdated = () => {
      refreshUser().catch(() => undefined);
    };
    window.addEventListener('profileUpdated', handleProfileUpdated);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdated);
  }, [refreshUser]);

  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
    navigate('/login');
  };

  const username = user?.username ?? null;
  const avatarUrl = user?.avatarUrl ?? null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderAvatar = () => {
    const defaultAvatar = DEFAULT_AVATARS.find(avatar => avatar.id === avatarUrl);

    if (defaultAvatar) {
      return (
        <div className="avatar-circle" style={{ background: defaultAvatar.gradient }}>
          <span className="avatar-icon">{defaultAvatar.icon}</span>
        </div>
      );
    }

    if (avatarUrl) {
      return (
        <div className="avatar-circle avatar-image">
          <img src={avatarUrl} alt={username || 'avatar'} />
        </div>
      );
    }

    return (
      <div className="avatar-circle">
        {getInitials(username || '')}
      </div>
    );
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src="/logo.svg" alt="OnChess Logo" className="logo-icon" />
          <span className="logo-text">ONCHESS</span>
        </div>
        <div className="header-actions">
          <div className="language-switcher">
            <button
              className={`lang-btn lang ${language === 'en' ? 'active' : ''}`}
              data-lang="en"
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
            <button
              className={`lang-btn lang ${language === 'ru' ? 'active' : ''}`}
              data-lang="ru"
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
          {isAuthenticated && username && (
            <div className="profile-menu-container">
              <button 
                className="profile-avatar-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                title={username}
              >
                {renderAvatar()}
                <span className="username-text">{username}</span>
              </button>
              
              {showProfileMenu && (
                <div className="profile-dropdown">
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      navigate(`/profile`);
                      setShowProfileMenu(false);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M2 14C2 11.5817 4.68629 10 8 10C11.3137 10 14 11.5817 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span>{t('profile')}</span>
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      navigate(`/friends`);
                      setShowProfileMenu(false);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="10" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M1 14C1 12.1667 3.4 11 6 11C8.6 11 11 12.1667 11 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M11 14C11 12.8 12.5 11.8 14 11.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span>{t('friends')}</span>
                  </button>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6M10.6667 11.3333L14 8M14 8L10.6667 4.66667M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{t('logout')}</span>
                  </button>
                </div>
              )}
            </div>
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
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
          <Route
            path="/analysis/:gameId"
            element={
              <ProtectedRoute>
                <GameAnalysis />
              </ProtectedRoute>
            }
          />
          <Route path="/invite/:code" element={<InviteAccept />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/:username"
            element={
              <ProtectedRoute>
                <PublicProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/puzzles"
            element={
              <ProtectedRoute>
                <PuzzleTraining />
              </ProtectedRoute>
            }
          />
          <Route
            path="/puzzle/:puzzleId"
            element={
              <ProtectedRoute>
                <PuzzleTraining />
              </ProtectedRoute>
            }
          />
          <Route
            path="/education"
            element={
              <ProtectedRoute>
                <Education />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <Friends />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
