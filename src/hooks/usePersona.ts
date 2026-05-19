'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PersonaProfile } from '@/types/persona';
import type { PersonaOverrides } from '@/types/persona-overrides';

export interface PersonaStateResponse {
  profile: PersonaProfile;
  raw: PersonaProfile;
  overrides: PersonaOverrides;
  version: number;
  versionId: string;
  generatedAt: string;
}

export interface PersonaVersion {
  id: string;
  version: number;
  generatedAt: string;
  basedOnMessages: number;
  isActive: boolean;
  generationModel: string | null;
}

export interface UsePersonaResult {
  state: PersonaStateResponse | null;
  versions: PersonaVersion[];
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
  saveOverrides: (overrides: PersonaOverrides) => Promise<void>;
  activate: (versionId: string) => Promise<void>;
}

export function usePersona(): UsePersonaResult {
  const [state, setState] = useState<PersonaStateResponse | null>(null);
  const [versions, setVersions] = useState<PersonaVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stateRes, versionsRes] = await Promise.all([
        fetch('/api/persona'),
        fetch('/api/persona/versions'),
      ]);
      const stateJson = (await stateRes.json()) as PersonaStateResponse | null;
      const versionsJson = (await versionsRes.json()) as {
        versions: PersonaVersion[];
      };
      setState(stateJson);
      setVersions(versionsJson.versions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveOverrides = useCallback(
    async (overrides: PersonaOverrides) => {
      const res = await fetch('/api/persona/overrides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrides),
      });
      if (!res.ok) {
        throw new Error(`save overrides ${res.status}`);
      }
      const next = (await res.json()) as PersonaStateResponse;
      setState(next);
    },
    []
  );

  const activate = useCallback(
    async (versionId: string) => {
      const res = await fetch('/api/persona/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      if (!res.ok) {
        throw new Error(`activate ${res.status}`);
      }
      await reload();
    },
    [reload]
  );

  return { state, versions, loading, error, reload, saveOverrides, activate };
}
