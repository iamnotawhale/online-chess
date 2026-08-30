import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiService, User } from '../api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; username: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    apiService.logout();
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    apiService.setUnauthorizedHandler(() => {
      setUser(null);
      setToken(null);
    });
    return () => apiService.setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem('authToken');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const me = await apiService.getMe();
        setUser(me);
        setToken(savedToken);
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [clearSession]);

  const login = async (email: string, password: string) => {
    const response = await apiService.login(email, password);
    setToken(response.token);
    setUser(response.user);
  };

  const register = async (data: { email: string; password: string; username: string }) => {
    const response = await apiService.register(data);
    setToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    clearSession();
  };

  const refreshUser = async () => {
    if (!apiService.isAuthenticated()) {
      return;
    }
    const me = await apiService.getMe();
    setUser(me);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
