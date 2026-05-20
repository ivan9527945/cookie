'use client';

import { useEffect, useState } from 'react';
import type { Footprint } from '@/server/persona/footprint';

export function useFootprint() {
  const [data, setData] = useState<Footprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/persona/footprint')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: Footprint | null) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
