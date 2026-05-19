'use client';

import { useEffect, useState } from 'react';

/** 監聽 document.visibilityState；Tab 切到背景時回 false，可用來暫停動畫 */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setVisible(document.visibilityState === 'visible');
    const onChange = () =>
      setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return visible;
}
