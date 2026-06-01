import { useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  return { toast, showToast };
}
