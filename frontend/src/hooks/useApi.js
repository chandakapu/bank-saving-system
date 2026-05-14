import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi(apiFn) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiFnRef = useRef(apiFn);
  useEffect(() => { apiFnRef.current = apiFn; }, [apiFn]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFnRef.current();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { reload(); }, [reload]);

  return { data, loading, error, reload, setData };
}
