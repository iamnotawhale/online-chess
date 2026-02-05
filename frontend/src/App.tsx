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

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
        {isAuthenticated && (
          <button onClick={handleLogout} className="logout-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6M10.6667 11.3333L14 8M14 8L10.6667 4.66667M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{t('logout')}</span>
          </button>
        )}
      </div>
    </header>
  );
};

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Header />
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
