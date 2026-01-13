'use client';

import React from 'react';

type User = {
  id?: string;
  name: string;
  email?: string;
  org?: string;
  role?: string;
  imageUrl?: string;
} | null;

type AuthContextValue = {
  isLoggedIn: boolean;
  user: User;
  login: (user?: User) => Promise<void>;
  logout: () => Promise<void>;
  isReady: boolean;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function ProtoAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User>(null);
  const [isReady, setIsReady] = React.useState(false);

  const inFlightRef = React.useRef<Promise<void> | null>(null);
  const lastFetchAtRef = React.useRef<number>(0);

  const refreshMe = React.useCallback(async (reason?: 'init' | 'auth-changed' | 'focus') => {
    const now = Date.now();
    if (now - lastFetchAtRef.current < 250 && reason !== 'init') return;
    lastFetchAtRef.current = now;

    if (inFlightRef.current) {
      await inFlightRef.current;
      return;
    }

    const p = (async () => {
      try {
        const res = await fetch('/api/demo-auth/me', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        setUser((json?.user as any) ?? null);
      } catch {
        setUser(null);
      } finally {
        setIsReady(true);
      }
    })();

    inFlightRef.current = p.then(() => undefined);
    try {
      await inFlightRef.current;
    } finally {
      inFlightRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const onAuthChanged = () => {
      if (cancelled) return;
      void refreshMe('auth-changed');
    };

    const onFocus = () => {
      if (cancelled) return;
      void refreshMe('focus');
    };

    void refreshMe('init');

    window.addEventListener('cbx:auth-changed', onAuthChanged as EventListener);
    if (typeof document !== 'undefined') {
      document.addEventListener('cbx:auth-changed', onAuthChanged as EventListener);
    }
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('cbx:auth-changed', onAuthChanged as EventListener);
      if (typeof document !== 'undefined') {
        document.removeEventListener('cbx:auth-changed', onAuthChanged as EventListener);
      }
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshMe]);

  const login = React.useCallback(async (u?: User) => {
    // In demo we switch cookie-based user; if u has an id, prefer it.
    const userId = (u as any)?.id ?? null;

    try {
      await fetch('/api/demo-auth/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch {
      // ignore
    }

    // Refresh from server cookies
    await refreshMe('auth-changed');

    // Notify any listeners
    try {
      const ev = new CustomEvent('cbx:auth-changed');
      window.dispatchEvent(ev);
      if (typeof document !== 'undefined') document.dispatchEvent(ev);
    } catch {
      // ignore
    }
  }, [refreshMe]);

  const logout = React.useCallback(async () => {
    try {
      await fetch('/api/demo-auth/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: null }),
      });
    } catch {
      // ignore
    }

    await refreshMe('auth-changed');

    try {
      const ev = new CustomEvent('cbx:auth-changed');
      window.dispatchEvent(ev);
      if (typeof document !== 'undefined') document.dispatchEvent(ev);
    } catch {
      // ignore
    }
  }, [refreshMe]);

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