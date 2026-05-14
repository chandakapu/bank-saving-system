import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  }, []);

  return { toast, showToast };
}
