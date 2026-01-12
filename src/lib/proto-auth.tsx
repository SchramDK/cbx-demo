'use client';

import React from 'react';

type User = { name: string; email?: string; imageUrl?: string } | null;

type AuthContextValue = {
  isLoggedIn: boolean;
  user: User;
  login: (user?: User) => void;
  logout: () => void;
  isReady: boolean;
};

const KEY = 'CBX_PROTO_AUTH_V1';

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function ProtoAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User>(null);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    } finally {
      setIsReady(true);
    }
  }, []);

  const login = React.useCallback((u?: User) => {
    const next = u ?? { name: 'Nicki Larsen', email: 'nicki@cbx.demo' };
    setUser(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const logout = React.useCallback(() => {
    setUser(null);
    localStorage.removeItem(KEY);
  }, []);

  const value: AuthContextValue = {
    isLoggedIn: !!user,
    user,
    login,
    logout,
    isReady,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useProtoAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useProtoAuth must be used within ProtoAuthProvider');
  return ctx;
}