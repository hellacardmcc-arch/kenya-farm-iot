import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api/client';

interface Farmer {
  id: string;
  phone: string;
  name?: string;
  county?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  farmer: Farmer | null;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, name?: string, county?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setFarmer(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/farmers/me');
      setFarmer(data);
    } catch {
      localStorage.removeItem('token');
      setFarmer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (phone: string, password: string) => {
      const { data } = await api.post('/auth/login', { phone, password });
      localStorage.setItem('token', data.token);
      await loadUser();
    },
    [loadUser]
  );

  const register = useCallback(
    async (phone: string, password: string, name?: string, county?: string) => {
      await api.post('/auth/register', { phone, password, name, county });
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('farmer');
    setFarmer(null);
  }, []);

  const value: AuthContextValue = {
    isAuthenticated: !!farmer,
    farmer,
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
