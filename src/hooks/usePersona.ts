'use client';

import { useEffect, useState } from 'react';
import type { PersonaProfile } from '@/types/persona';

export interface UsePersonaState {
  persona: PersonaProfile | null;
  loading: boolean;
  error: Error | null;
}

export function usePersona(): UsePersonaState {
  const [persona, setPersona] = useState<PersonaProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/persona')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((data: PersonaProfile | null) => {
        if (!cancelled) setPersona(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { persona, loading, error };
}
