import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi(apiFn) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const apiFnRef = useRef(apiFn);
  useEffect(() => { apiFnRef.current = apiFn; }, [apiFn]);

  const reload = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFnRef.current();
      if (mountedRef.current && requestId === requestIdRef.current) setData(result);
    } catch (err) {
      if (mountedRef.current && requestId === requestIdRef.current) setError(err);
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // The hook's purpose is to start its external request when mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    return () => { mountedRef.current = false; requestIdRef.current += 1; };
  }, [reload]);

  const updateData = useCallback((value) => {
    setError(null);
    setData(value);
  }, []);

  return { data, loading, error, reload, setData: updateData };
}
