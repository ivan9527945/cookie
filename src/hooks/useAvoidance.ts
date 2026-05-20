'use client';

import { useEffect, useState } from 'react';
import type { AvoidanceResult } from '@/server/persona/avoidance';

export function useAvoidance() {
  const [data, setData] = useState<AvoidanceResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/persona/avoidance')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: AvoidanceResult | null) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}
