import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../App';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(userData: User): User {
  return {
    ...userData,
    must_change_password: Number(userData.must_change_password || 0),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setUser(null);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.success) {
        setUser(normalizeUser(data.data));
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      await refreshUser();
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(normalizeUser(userData));

    // Fetch latest user from backend, including must_change_password
    refreshUser();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}