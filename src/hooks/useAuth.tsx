import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiFetch } from '@/lib/api';

type LocalUser = { email: string; role?: string } | null;
type LocalSession = null;

interface AuthContextType {
  user: LocalUser;
  session: LocalSession;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser>(null);
  const [session, setSession] = useState<LocalSession>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const parsed = JSON.parse(raw) as { email: string; role?: string };
        const isAdminEmail = String(parsed.email || '').toLowerCase() === 'davelnetbr@gmail.com';
        const role = isAdminEmail ? 'admin' : parsed.role;
        if (isAdminEmail && parsed.role !== 'admin') {
          localStorage.setItem('auth_user', JSON.stringify({ email: parsed.email, role }));
        }
        setUser({ email: parsed.email, role });
      } else {
        // default: keep unauthenticated until sign-in happens
        setUser(null);
      }
    } finally {
      setSession(null);
      setLoading(false);
    }
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const cleanEmail = email.trim();
      const resp = await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password, fullName }),
      });
      const role = (resp as { role?: string })?.role || 'member';
      localStorage.setItem('auth_user', JSON.stringify({ email: cleanEmail, role }));
      setUser({ email: cleanEmail, role });
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error('Sign up failed') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim();
      const resp = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const role = (resp as { role?: string })?.role || undefined;
      localStorage.setItem('auth_user', JSON.stringify({ email: cleanEmail, role }));
      setUser({ email: cleanEmail, role });
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error('Sign in failed') };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
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
