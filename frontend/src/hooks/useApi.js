import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth/AuthContext';

// Loads data from the API with the logged-in user's token.
// reload() refreshes quietly: the old data stays visible until the new data arrives.
export function useApi(path) {
  const { token } = useAuth();
  const [state, setState] = useState({ data: null, error: false, status: 0 });
  const latest = useRef(0);

  const load = useCallback((keepOld) => {
    const id = ++latest.current; // ignore answers that arrive late
    if (!keepOld) setState({ data: null, error: false, status: 0 });
    api(path, { token })
      .then((data) => id === latest.current && setState({ data, error: false, status: 200 }))
      .catch((e) => {
        if (id !== latest.current) return;
        setState({ data: null, error: true, status: e instanceof ApiError ? e.status : 0 });
      });
  }, [path, token]);

  useEffect(() => { load(false); }, [load]);

  return {
    data: state.data,
    error: state.error,
    status: state.status,
    loading: !state.data && !state.error,
    reload: () => load(true),
  };
}