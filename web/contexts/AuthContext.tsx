import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: string;
  username: string;
  full_name?: string;
  agency_id: string;
  agency_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (username: string, password: string, fullName: string, agencyName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：从 localStorage 加载 token
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      setToken(savedToken);
      loadCurrentUser(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadCurrentUser = async (authToken: string) => {
    try {
      // 超时兜底，避免接口挂起导致一直“加载中”
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const userData = await authAPI.getCurrentUser(controller.signal);
      clearTimeout(timeoutId);
      setUser(userData as User);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login(username, password);
      const newToken = response.access_token;
      
      localStorage.setItem('auth_token', newToken);
      setToken(newToken);
      
      await loadCurrentUser(newToken);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (username: string, password: string, fullName: string, agencyName: string) => {
    try {
      await authAPI.register(username, password, fullName, agencyName);
      // 注册后自动登录
      await login(username, password);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
