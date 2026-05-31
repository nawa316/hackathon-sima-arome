'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Phase, CreatePhaseRequest, UpdatePhaseRequest } from '@/types/collections';

const BASE = '/api/items';

export function usePhases(search = '') {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (search) {
        params.set('filter[name][_icontains]', search);
      }
      const res = await fetch(`${BASE}/phase?${params}`);
      const json = await res.json();
      setPhases(json.data ?? []);
    } catch {
      setPhases([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchPhases();
  }, [fetchPhases]);

  return { phases, loading, refetch: fetchPhases };
}

export function useCreatePhase() {
  const [loading, setLoading] = useState(false);
  const create = useCallback(async (data: CreatePhaseRequest) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error('[useCreatePhase] Error response:', json);
        throw new Error(
          json.error || json.message || (json.errors && json.errors[0]?.message) || `Failed to create phase (${res.status})`
        );
      }
      return json;
    } finally {
      setLoading(false);
    }
  }, []);
  return { create, loading };
}

export function useUpdatePhase() {
  const [loading, setLoading] = useState(false);
  const update = useCallback(async (id: string, data: UpdatePhaseRequest) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/phase/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error('[useUpdatePhase] Error response:', json);
        throw new Error(
          json.error || json.message || (json.errors && json.errors[0]?.message) || `Failed to update phase (${res.status})`
        );
      }
      return json;
    } finally {
      setLoading(false);
    }
  }, []);
  return { update, loading };
}

export function useDeletePhase() {
  const [loading, setLoading] = useState(false);
  const remove = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/phase/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.error('[useDeletePhase] Error response:', json);
        throw new Error(
          json.error || json.message || (json.errors && json.errors[0]?.message) || `Failed to delete phase (${res.status})`
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);
  return { remove, loading };
}
