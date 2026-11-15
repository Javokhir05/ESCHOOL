import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const TOKEN_KEY = 'eschool.token';
const AuthContext = createContext(null);

export const homePath = (role) =>
  ({ STUDENT: '/student', TEACHER: '/teacher', ADMIN: '/admin' }[role] || '/');

function readToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!readToken()); // true while we check a saved token

  // On page load: if a token is saved, ask the API who it belongs to
  useEffect(() => {
    if (!token) return;
    api('/auth/me', { token })
      .then((data) => setUser(data.user))
      .catch(() => { saveToken(null); setToken(null); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    saveToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    saveToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, token, loading, login, logout }), [user, token, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);