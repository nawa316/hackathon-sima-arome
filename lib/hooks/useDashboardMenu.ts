'use client';

import { useState, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import type { DashboardMenuItem } from '@/components/ui/dashboard-layout';

/**
 * Hook untuk manage dashboard menu items
 * Provides utilities untuk update, toggle, set active, dll
 */
export function useDashboardMenu(initialItems: DashboardMenuItem[]) {
  const pathname = usePathname();
  const [items, setItems] = useState(initialItems);

  /**
   * Auto-set active state berdasarkan current pathname
   */
  const itemsWithActiveState = useMemo(() => {
    return updateActiveStateByPath(items, pathname);
  }, [items, pathname]);

  /**
   * Update menu items
   */
  const updateItems = useCallback((newItems: DashboardMenuItem[]) => {
    setItems(newItems);
  }, []);

  /**
   * Add item ke menu
   */
  const addItem = useCallback((item: DashboardMenuItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  /**
   * Remove item dari menu
   */
  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  /**
   * Update item by id
   */
  const updateItem = useCallback((itemId: string, updates: Partial<DashboardMenuItem>) => {
    setItems((prev) => updateItemById(prev, itemId, updates));
  }, []);

  /**
   * Filter items berdasarkan permission
   */
  const filterByPermission = useCallback((permission: (item: DashboardMenuItem) => boolean) => {
    const filtered = items.filter(permission);
    setItems(filtered);
  }, [items]);

  /**
   * Get items by role
   */
  const getItemsByRole = useCallback((role: 'admin' | 'editor' | 'viewer'): DashboardMenuItem[] => {
    return items.filter((item) => {
      if (role === 'admin') return true;
      if (role === 'editor') {
        return !['roles', 'system-settings'].includes(item.id);
      }
      if (role === 'viewer') {
        return ['dashboard'].includes(item.id);
      }
      return false;
    });
  }, [items]);

  return {
    items: itemsWithActiveState,
    updateItems,
    addItem,
    removeItem,
    updateItem,
    filterByPermission,
    getItemsByRole,
  };
}

/**
 * Helper function: Set active state berdasarkan pathname
 */
function updateActiveStateByPath(
  items: DashboardMenuItem[],
  pathname: string
): DashboardMenuItem[] {
  return items.map((item) => ({
    ...item,
    active: pathname === item.href || pathname.startsWith(item.href + '/'),
  }));
}

/**
 * Helper function: Update item by id
 */
function updateItemById(
  items: DashboardMenuItem[],
  itemId: string,
  updates: Partial<DashboardMenuItem>
): DashboardMenuItem[] {
  return items.map((item) => {
    if (item.id === itemId) {
      return { ...item, ...updates };
    }
    return item;
  });
}

/**
 * Hook untuk build menu items berdasarkan user permissions
 */
export function usePermissionBasedMenu(
  baseItems: DashboardMenuItem[],
  userPermissions: string[]
) {
  return useMemo(() => {
    return filterMenuByPermissions(baseItems, userPermissions);
  }, [baseItems, userPermissions]);
}

/**
 * Filter menu items berdasarkan permission
 */
function filterMenuByPermissions(
  items: DashboardMenuItem[],
  permissions: string[]
): DashboardMenuItem[] {
  return items.filter((item) =>
    permissions.includes(item.id) || !item.id.startsWith('perm_')
  );
}

/**
 * Hook untuk badge counts (notifications, pending items, etc)
 */
export function useDashboardBadges() {
  const [badges, setBadges] = useState<Record<string, string | number>>({});

  const setBadge = useCallback((itemId: string, badge: string | number | undefined) => {
    setBadges((prev) => {
      const newBadges = { ...prev };
      if (badge === undefined) {
        delete newBadges[itemId];
      } else {
        newBadges[itemId] = badge;
      }
      return newBadges;
    });
  }, []);

  const clearBadges = useCallback(() => {
    setBadges({});
  }, []);

  return { badges, setBadge, clearBadges };
}

/**
 * Hook untuk fetch dan update menu items dari API
 */
export function useDashboardMenuFromAPI(apiUrl: string) {
  const [items, setItems] = useState<DashboardMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMenuItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl);
      const data = await response.json();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch menu items'));
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  return {
    items,
    loading,
    error,
    refetch: fetchMenuItems,
  };
}
