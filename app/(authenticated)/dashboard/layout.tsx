'use client';

import React, { ReactNode, createContext, useState, use, useMemo } from 'react';
import {
  IconLayoutDashboard,
  IconUsers,
  IconShieldLock,
  IconLogout,
  IconBuildingWarehouse,
  IconPackages,
} from '@tabler/icons-react';
import {
  DashboardLayout,
  type DashboardMenuItem,
} from '@/components/ui/dashboard-layout';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Context untuk moduleTitle
 * Memungkinkan setiap page untuk set moduleTitle sendiri
 */
export const ModuleTitleContext = createContext<{
  moduleTitle: string;
  setModuleTitle: (title: string) => void;
}>({
  moduleTitle: 'Dashboard',
  setModuleTitle: () => {},
});

/**
 * Dashboard Shared Layout
 * Wraps all dashboard pages with the DashboardLayout
 */
export default function DashboardLayoutWrapper({
  children,
  params,
}: {
  children: ReactNode;
  params?: Promise<Record<string, string>>;
}) {
  // Unwrap params if provided (Next.js 15+ requirement)
  if (params) {
    use(params);
  }

  const router = useRouter();
  const pathname = usePathname();
  const [moduleTitle, setModuleTitle] = useState('Dashboard');

  // Dynamic menu items dengan active state berdasarkan current pathname
  const menuItems = useMemo<DashboardMenuItem[]>(() => {
    const baseMenuItems = [
      {
        id: 'dashboard',
        label: 'Dashboard Overview',
        icon: <IconLayoutDashboard size={20} />,
        href: '/dashboard',
      },
      {
        id: 'dashboard-scm',
        label: 'Dashboard SCM',
        icon: <IconLayoutDashboard size={20} />,
        href: '/dashboard/scm',
      },
      {
        id: 'warehouse-management',
        label: 'Warehouse Management',
        icon: <IconBuildingWarehouse size={20} />,
        href: '/dashboard/scm/warehouse',
      },
      {
        id: 'stock-management',
        label: 'Stock Management',
        icon: <IconPackages size={20} />,
        href: '/dashboard/scm/stocks',
      },
      {
        id: 'role-management',
        label: 'Role Management',
        icon: <IconShieldLock size={20} />,
        href: '/dashboard/roles',
        badge: '3',
      },
      {
        id: 'user-management',
        label: 'User Management',
        icon: <IconUsers size={20} />,
        href: '/dashboard/users',
        badge: '12',
      },
    ];

    // Separate SCM module menus and Auth/User/Role module menus completely
    const isScmModule = pathname.startsWith('/dashboard/scm') || pathname.startsWith('/dashboard/warehouse');
    const filteredMenuItems = isScmModule
      ? baseMenuItems.filter((item) => item.id !== 'role-management' && item.id !== 'user-management' && item.id !== 'dashboard')
      : baseMenuItems.filter((item) => item.id !== 'dashboard-scm' && item.id !== 'warehouse-management' && item.id !== 'stock-management');

    // Set active state based on current pathname
    return filteredMenuItems.map((item) => ({
      ...item,
      active: item.href === '/dashboard' 
        ? pathname === '/dashboard' 
        : pathname === item.href || pathname.startsWith(item.href + '/'),
    }));
  }, [pathname]);

  const handleMenuItemClick = (item: DashboardMenuItem) => {
    router.push(item.href);
  };

  const handleLogout = async () => {
    // TODO: Implement logout logic with auth API
    router.push('/login');
  };

  return (
    <ModuleTitleContext.Provider value={{ moduleTitle, setModuleTitle }}>
      <DashboardLayout
        menuItems={menuItems}
        brandTitle="Sima Arôme"
        logoSrc="/image/logo-sima-arome.png"
        moduleTitle={moduleTitle}
        userInfo={{
          name: 'John Smyth',
          role: 'Essentials',
          avatar: 'https://avatars.githubusercontent.com/u/1234?v=4',
        }}
        notificationCount={3}
        onMenuItemClick={handleMenuItemClick}
        onLogout={handleLogout}
        sidebarWidth={280}
        headerHeight={70}
      >
        {children}
      </DashboardLayout>
    </ModuleTitleContext.Provider>
  );
}
