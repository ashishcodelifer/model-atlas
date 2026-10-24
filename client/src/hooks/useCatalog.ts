import { useCallback, useEffect, useRef, useState } from 'react';
import type { CatalogResponse } from '../types';

interface CatalogState {
  data: CatalogResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

export function useCatalog() {
  const [state, setState] = useState<CatalogState>({
    data: null,
    loading: true,
    refreshing: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (force: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({
      ...prev,
      loading: prev.data === null,
      refreshing: prev.data !== null,
      error: null,
    }));

    try {
      const response = await fetch(`/api/models${force ? '?refresh=1' : ''}`, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? `Catalog request failed (${response.status})`);
      }
      const data = (await response.json()) as CatalogResponse;
      if (!Array.isArray(data.models) || data.models.length === 0) {
        throw new Error('The catalog response did not contain any models.');
      }
      setState({ data, loading: false, refreshing: false, error: null });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  useEffect(() => {
    void load(false);
    return () => abortRef.current?.abort();
  }, [load]);

  return {
    ...state,
    refresh: useCallback(() => load(true), [load]),
    retry: useCallback(() => load(false), [load]),
  };
}
