import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  const tokenRef = useRef(token);
  tokenRef.current = token;

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

  // After a password change the server issues a new token for this device
  const updateToken = useCallback((next) => {
    saveToken(next);
    setToken(next);
  }, []);

    // Loads the logged-in user again (used after a profile change)
  const refreshUser = useCallback(async () => {
    const data = await api('/auth/me', { token: tokenRef.current });
    setUser(data.user);
  }, []);

  // The server said a token is no longer valid. Sign out only if it was the one we are using now.
  useEffect(() => {
    const onUnauthorized = (e) => {
      if (e.detail === tokenRef.current) logout();
    };
    window.addEventListener('eschool:unauthorized', onUnauthorized);
    return () => window.removeEventListener('eschool:unauthorized', onUnauthorized);
  }, [logout]);

  const value = useMemo(
    () => ({ user, token, loading, login, logout, updateToken, refreshUser }),
    [user, token, loading, login, logout, updateToken, refreshUser]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);