import { useState, useCallback, useEffect, useRef } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(timerRef.current);
    setToast({ show: true, message, type });
    timerRef.current = setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { toast, showToast };
}
