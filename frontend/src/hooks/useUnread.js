import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';

const EVENT = 'eschool:unread';

// Call this after reading or sending a message, so the sidebar badge updates at once
export const refreshUnread = () => window.dispatchEvent(new Event(EVENT));

export function useUnread(enabled) {
  const { token } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    const load = () => {
      if (document.hidden) return;
      api('/messages/unread', { token })
        .then((d) => !cancelled && setCount(d.count))
        .catch(() => {});
    };

    load();
    const timer = setInterval(load, 30000);
    window.addEventListener(EVENT, load);
    document.addEventListener('visibilitychange', load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener(EVENT, load);
      document.removeEventListener('visibilitychange', load);
    };
  }, [enabled, token]);

  return count;
}