import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import { PlayHub } from './components/PlayHub';
import GameView from './components/Game';
import { GameAnalysis } from './components/GameAnalysis';
import { InviteAccept } from './components/InviteAccept';
import { Profile } from './components/Profile';
import { PublicProfile } from './components/PublicProfile';
import { Friends } from './components/Friends';
import { PuzzleTraining } from './components/PuzzleTraining';
import { PuzzleHub } from './components/PuzzleHub';
import { Education } from './components/Education';
import { UserSearch } from './components/UserSearch';
import { ArenaList } from './components/ArenaList';
import { ArenaPage } from './components/ArenaPage';
import { ChallengeInbox } from './components/ChallengeInbox';
import { useTranslation } from './i18n/LanguageContext';
import { apiService } from './api';
import './App.css';

type ThemeMode = 'light' | 'dark';

const DEFAULT_AVATARS = [
  { id: 'king-gold', icon: '♔', gradient: 'linear-gradient(135deg, #C9A46A, #B58B52)' },
  { id: 'queen-purple', icon: '♕', gradient: 'linear-gradient(135deg, #9B8CCB, #7E6FB1)' },
  { id: 'rook-blue', icon: '♖', gradient: 'linear-gradient(135deg, #7C93B8, #5F779C)' },
  { id: 'bishop-green', icon: '♗', gradient: 'linear-gradient(135deg, #7FAF9B, #5E8F7C)' },
  { id: 'knight-red', icon: '♘', gradient: 'linear-gradient(135deg, #C98686, #AA6A6A)' },
  { id: 'pawn-gray', icon: '♙', gradient: 'linear-gradient(135deg, #808895, #6B7380)' },
];

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="loading">{t('loading')}</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

type HeaderProps = { themeMode: ThemeMode; onToggleTheme: () => void };

const NAV_ITEMS = [
  { to: '/play', key: 'navPlay' },
  { to: '/puzzles', key: 'navPuzzles' },
  { to: '/education', key: 'navLearn' },
  { to: '/friends', key: 'navFriends' },
] as const;

const Header: React.FC<HeaderProps> = ({ themeMode, onToggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useTranslation();
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingChallenges, setPendingChallenges] = useState(0);
  const [showChallenges, setShowChallenges] = useState(false);

  const refreshChallenges = () => {
    apiService.getIncomingChallenges().then((c) => setPendingChallenges(c.length)).catch(() => undefined);
  };

  useEffect(() => {
    const handler = () => refreshUser().catch(() => undefined);
    window.addEventListener('profileUpdated', handler);
    return () => window.removeEventListener('profileUpdated', handler);
  }, [refreshUser]);

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshChallenges();
    const id = setInterval(() => {
      apiService.ping().catch(() => undefined);
    }, 60000);
    const challengePoll = setInterval(refreshChallenges, 30000);
    apiService.ping().catch(() => undefined);
    return () => {
      clearInterval(id);
      clearInterval(challengePoll);
    };
  }, [isAuthenticated]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const renderAvatar = () => {
    const defaultAvatar = DEFAULT_AVATARS.find((a) => a.id === user?.avatarUrl);
    if (defaultAvatar) {
      return (
        <div className="avatar-circle" style={{ background: defaultAvatar.gradient }}>
          <span className="avatar-icon">{defaultAvatar.icon}</span>
        </div>
      );
    }
    if (user?.avatarUrl) {
      return (
        <div className="avatar-circle avatar-image">
          <img src={user.avatarUrl} alt="" />
        </div>
      );
    }
    const initials = (user?.username || '').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    return <div className="avatar-circle">{initials}</div>;
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button type="button" className="menu-toggle" aria-label="Menu" onClick={() => setMobileOpen(true)}>
              ☰
            </button>
            <div className="logo" onClick={() => navigate(isAuthenticated ? '/play' : '/login')} role="banner">
              <div className="brand-logo">
                <img src="/logo.svg" alt="" className="logo-icon" aria-hidden="true" />
              </div>
              <div className="brand-info">
                <span className="brand-title">{t('onlineChess')}</span>
                <span className="logo-text brand-subtitle">ONCHESS</span>
              </div>
            </div>
          </div>

          {isAuthenticated && (
            <nav className="nav-desktop" aria-label="Main">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  {t(item.key)}
                </NavLink>
              ))}
              <NavLink to="/arena" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                {t('navArena')}
              </NavLink>
            </nav>
          )}

          <div className="header-actions">
            {isAuthenticated && (
              <button type="button" className="search-btn" onClick={() => navigate('/search')} title={t('searchUsers')}>
                🔍
              </button>
            )}
            <div className="language-switcher">
              <button type="button" className={`lang-btn ${language === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')}>EN</button>
              <button type="button" className={`lang-btn ${language === 'ru' ? 'active' : ''}`} onClick={() => setLanguage('ru')}>RU</button>
            </div>
            <button type="button" className="theme-toggle" onClick={onToggleTheme} aria-label={themeMode === 'dark' ? t('themeDark') : t('themeLight')}>
              <span className="theme-icon">{themeMode === 'dark' ? '🌙' : '☀️'}</span>
            </button>
            {isAuthenticated && user && (
              <div className="profile-menu-container">
                <button type="button" className="profile-avatar-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                  {renderAvatar()}
                  <span className="username-text">{user.username}</span>
                  {pendingChallenges > 0 && <span className="nav-badge">{pendingChallenges}</span>}
                </button>
                {showProfileMenu && (
                  <div className="profile-dropdown">
                    <button type="button" className="dropdown-item" onClick={() => { setShowChallenges(true); setShowProfileMenu(false); }}>
                      {t('challenge')}{pendingChallenges > 0 ? ` (${pendingChallenges})` : ''}
                    </button>
                    <button type="button" className="dropdown-item" onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}>{t('profile')}</button>
                    <button type="button" className="dropdown-item" onClick={() => { navigate('/friends'); setShowProfileMenu(false); }}>{t('friends')}</button>
                    <button type="button" className="dropdown-item" onClick={() => { navigate('/search'); setShowProfileMenu(false); }}>{t('searchUsers')}</button>
                    <div className="dropdown-divider" />
                    <button type="button" className="dropdown-item logout-item" onClick={() => { logout(); navigate('/login'); }}>{t('logout')}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {mobileOpen && (
        <>
          <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
          <aside className="mobile-panel">
            <p className="mobile-title">{t('menu')}</p>
            {isAuthenticated ? (
              <nav className="mobile-links">
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => `mobile-item${isActive ? ' is-active' : ''}`}>
                    {t(item.key)}
                  </NavLink>
                ))}
                <NavLink to="/arena" className={({ isActive }) => `mobile-item${isActive ? ' is-active' : ''}`}>{t('navArena')}</NavLink>
                <NavLink to="/search" className={({ isActive }) => `mobile-item${isActive ? ' is-active' : ''}`}>{t('searchUsers')}</NavLink>
                <NavLink to="/" className={({ isActive }) => `mobile-item${isActive ? ' is-active' : ''}`}>{t('overview')}</NavLink>
              </nav>
            ) : (
              <nav className="mobile-links">
                <NavLink to="/login" className="mobile-item">{t('login')}</NavLink>
                <NavLink to="/register" className="mobile-item">{t('register')}</NavLink>
                <NavLink to="/puzzles/daily" className="mobile-item">{t('dailyPuzzle')}</NavLink>
              </nav>
            )}
          </aside>
        </>
      )}

      {isAuthenticated && (
        <ChallengeInbox isOpen={showChallenges} onClose={() => setShowChallenges(false)} onUpdated={refreshChallenges} />
      )}

      {isAuthenticated && (
        <nav className="bottom-nav" aria-label="Mobile">
          <NavLink to="/play" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>♟ {t('navPlay')}</NavLink>
          <NavLink to="/puzzles" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>🧩 {t('navPuzzles')}</NavLink>
          <NavLink to="/education" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>📚 {t('navLearn')}</NavLink>
          <NavLink to="/profile" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>👤 {t('profile')}</NavLink>
        </nav>
      )}
    </>
  );
};

function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => (localStorage.getItem('themeMode') as ThemeMode) || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.body.setAttribute('data-theme', themeMode);
    localStorage.setItem('themeMode', themeMode);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeMode === 'dark' ? '#262f40' : '#64748b');
  }, [themeMode]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Header themeMode={themeMode} onToggleTheme={() => setThemeMode((p) => (p === 'dark' ? 'light' : 'dark'))} />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/play" element={<ProtectedRoute><PlayHub /></ProtectedRoute>} />
          <Route path="/game/:gameId" element={<ProtectedRoute><GameView /></ProtectedRoute>} />
          <Route path="/analysis/:gameId" element={<ProtectedRoute><GameAnalysis /></ProtectedRoute>} />
          <Route path="/invite/:code" element={<InviteAccept />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/user/:username" element={<PublicProfile />} />
          <Route path="/puzzles" element={<ProtectedRoute><PuzzleHub /></ProtectedRoute>} />
          <Route path="/puzzles/daily" element={<PuzzleHub guestMode />} />
          <Route path="/puzzles/train" element={<ProtectedRoute><PuzzleTraining /></ProtectedRoute>} />
          <Route path="/puzzles/rush" element={<ProtectedRoute><PuzzleTraining rushMode /></ProtectedRoute>} />
          <Route path="/puzzle/:puzzleId" element={<ProtectedRoute><PuzzleTraining /></ProtectedRoute>} />
          <Route path="/education" element={<ProtectedRoute><Education /></ProtectedRoute>} />
          <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><UserSearch /></ProtectedRoute>} />
          <Route path="/arena" element={<ProtectedRoute><ArenaList /></ProtectedRoute>} />
          <Route path="/arena/:arenaId" element={<ProtectedRoute><ArenaPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
