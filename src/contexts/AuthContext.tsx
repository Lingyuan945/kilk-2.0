import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiGet, apiPost, getToken, setToken, clearToken } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, password2: string, name?: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化：如果有 token，获取用户信息
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    apiGet<{ user: User }>('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiPost<{ token: string; user: User }>('/auth/login', {
      username,
      password,
    });
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (username: string, password: string, password2: string, name?: string) => {
      const data = await apiPost<{ token: string; user: User }>('/auth/register', {
        username,
        password,
        password2,
        name,
      });
      setToken(data.token);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const isAdmin = user ? ['admin', 'super'].includes(user.role) : false;

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
