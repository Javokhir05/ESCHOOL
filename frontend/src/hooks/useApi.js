import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';

// Loads data from the API with the logged-in user's token.
// reload() refreshes quietly: the old list stays visible until the new one arrives.
export function useApi(path) {
  const { token } = useAuth();
  const [state, setState] = useState({ data: null, error: false });
  const latest = useRef(0);

  const load = useCallback((keepOld) => {
    const id = ++latest.current; // ignore answers that arrive late
    if (!keepOld) setState({ data: null, error: false });
    api(path, { token })
      .then((data) => id === latest.current && setState({ data, error: false }))
      .catch(() => id === latest.current && setState({ data: null, error: true }));
  }, [path, token]);

  useEffect(() => { load(false); }, [load]);

  return {
    data: state.data,
    error: state.error,
    loading: !state.data && !state.error,
    reload: () => load(true),
  };
}