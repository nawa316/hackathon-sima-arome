'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Production,
  CreateProductionRequest,
  UpdateProductionRequest,
  ProductionPhase,
  CreateProductionPhaseRequest,
  UpdateProductionPhaseRequest,
  ProductionMaterial,
  CreateProductionMaterialRequest,
  RawMaterial,
  Phase,
} from '@/types/collections';

const BASE = '/api/items';

// ────────────────────────────────────────────────────────────
// Production hooks
// ────────────────────────────────────────────────────────────

export function useProductions(statusFilter?: string) {
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProductions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200', sort: '-created_at' });
      if (statusFilter && statusFilter !== 'ALL') {
        params.set('filter[status][_eq]', statusFilter);
      }
      const res = await fetch(`${BASE}/productions?${params}`);
      const json = await res.json();
      setProductions(json.data ?? []);
    } catch {
      setProductions([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProductions();
  }, [fetchProductions]);

  return { productions, loading, refetch: fetchProductions };
}

export function useProduction(id: string) {
  const [production, setProduction] = useState<Production | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProduction = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/productions/${id}`);
      const json = await res.json();
      setProduction(json.data ?? null);
    } catch {
      setProduction(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduction();
  }, [fetchProduction]);

  return { production, loading, refetch: fetchProduction };
}

export function useCreateProduction() {
  const [loading, setLoading] = useState(false);
  const create = useCallback(async (data: CreateProductionRequest) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/productions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || (json.errors && json.errors[0]?.message) || `Failed to create production (${res.status})`);
      }
      return json;
    } finally {
      setLoading(false);
    }
  }, []);
  return { create, loading };
}

export function useUpdateProduction() {
  const [loading, setLoading] = useState(false);
  const update = useCallback(async (id: string, data: UpdateProductionRequest) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/productions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || (json.errors && json.errors[0]?.message) || `Failed to update production (${res.status})`);
      }
      return json;
    } finally {
      setLoading(false);
    }
  }, []);
  return { update, loading };
}

export function useDeleteProduction() {
  const [loading, setLoading] = useState(false);
  const remove = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/productions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || json.message || (json.errors && json.errors[0]?.message) || `Failed to delete production (${res.status})`);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  return { remove, loading };
}

// ────────────────────────────────────────────────────────────
// Production Phase hooks
// ────────────────────────────────────────────────────────────

export function useProductionPhases(productionId: string) {
  const [phases, setPhases] = useState<ProductionPhase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        'filter[production_id][_eq]': productionId,
        limit: '200',
      });
      const res = await fetch(`${BASE}/productions_phase?${params}`);
      const json = await res.json();
      setPhases(json.data ?? []);
    } catch {
      setPhases([]);
    } finally {
      setLoading(false);
    }
  }, [productionId]);

  useEffect(() => {
    fetchPhases();
  }, [fetchPhases]);

  return { phases, loading, refetch: fetchPhases };
}

export function useCreateProductionPhase() {
  const [loading, setLoading] = useState(false);
  const create = useCallback(async (data: CreateProductionPhaseRequest) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/productions_phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || (json.errors && json.errors[0]?.message) || `Failed to create production phase (${res.status})`);
      }
      return json;
    } finally {
      setLoading(false);
    }
  }, []);
  return { create, loading };
}

export function useUpdateProductionPhase() {
  const [loading, setLoading] = useState(false);
  const update = useCallback(async (id: string, data: UpdateProductionPhaseRequest) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/productions_phase/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || (json.errors && json.errors[0]?.message) || `Failed to update production phase (${res.status})`);
      }
      return json;
    } finally {
      setLoading(false);
    }
  }, []);
  return { update, loading };
}

export function useDeleteProductionPhase() {
  const [loading, setLoading] = useState(false);
  const remove = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/productions_phase/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || json.message || (json.errors && json.errors[0]?.message) || `Failed to delete production phase (${res.status})`);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  return { remove, loading };
}

// ────────────────────────────────────────────────────────────
// Production Materials hooks
// ────────────────────────────────────────────────────────────

export function useProductionMaterials(productionId: string) {
  const [materials, setMaterials] = useState<ProductionMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        'filter[production_id][_eq]': productionId,
        limit: '200',
      });
      const res = await fetch(`${BASE}/productions_materials?${params}`);
      const json = await res.json();
      setMaterials(json.data ?? []);
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, [productionId]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return { materials, loading, refetch: fetchMaterials };
}

export function useCreateProductionMaterial() {
  const [loading, setLoading] = useState(false);
  const create = useCallback(async (data: CreateProductionMaterialRequest) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/productions_materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || (json.errors && json.errors[0]?.message) || `Failed to create production material (${res.status})`);
      }
      return json;
    } finally {
      setLoading(false);
    }
  }, []);
  return { create, loading };
}

export function useDeleteProductionMaterial() {
  const [loading, setLoading] = useState(false);
  const remove = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/productions_materials/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || json.message || (json.errors && json.errors[0]?.message) || `Failed to delete production material (${res.status})`);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  return { remove, loading };
}

// ────────────────────────────────────────────────────────────
// Helper: Raw Materials list
// ────────────────────────────────────────────────────────────

export function useRawMaterials() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE}/raw_materials?limit=500`);
        const json = await res.json();
        setRawMaterials(json.data ?? []);
      } catch {
        setRawMaterials([]);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  return { rawMaterials, loading };
}

// ────────────────────────────────────────────────────────────
// Helper: Products list (for select)
// ────────────────────────────────────────────────────────────

export function useAllProducts() {
  const [products, setProducts] = useState<{ id: string; type: string; categories: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE}/products?limit=500&fields=id,type,categories`);
        const json = await res.json();
        setProducts(json.data ?? []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  return { products, loading };
}

// ────────────────────────────────────────────────────────────
// Helper: Recipe list per product (untuk auto-fill materials)
// ────────────────────────────────────────────────────────────

export function useProductRecipes(productId: string) {
  const [recipes, setRecipes] = useState<{ id: string; raw_material_id: string; quantity: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) {
      setRecipes([]);
      return;
    }
    const fetch_ = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          'filter[products_id][_eq]': productId,
          limit: '200',
        });
        const res = await fetch(`${BASE}/recipe?${params}`);
        const json = await res.json();
        setRecipes(json.data ?? []);
      } catch {
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [productId]);

  return { recipes, loading };
}

// ────────────────────────────────────────────────────────────
// Bulk create production materials (dari recipe)
// ────────────────────────────────────────────────────────────

export function useBulkCreateProductionMaterial() {
  const [loading, setLoading] = useState(false);

  const bulkCreate = useCallback(
    async (items: { production_id: string; raw_material_id: string; quantity_used: number }[]) => {
      setLoading(true);
      try {
        const results = await Promise.all(
          items.map((item) =>
            fetch(`${BASE}/productions_materials`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            }).then(async (res) => {
              const json = await res.json();
              if (!res.ok) {
                throw new Error(
                  json.error || json.message || (json.errors && json.errors[0]?.message) || `Failed to create material (${res.status})`
                );
              }
              return json;
            })
          )
        );
        return results;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { bulkCreate, loading };
}

// ────────────────────────────────────────────────────────────
// Helper: Phases list (for select in production phase)
// ────────────────────────────────────────────────────────────

export function useAllPhases() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE}/phase?limit=200`);
        const json = await res.json();
        setPhases(json.data ?? []);
      } catch {
        setPhases([]);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  return { phases, loading };
}
