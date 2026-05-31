'use client';

import React, { ReactNode, useState, use, useMemo } from 'react';
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
import { ModuleTitleContext } from '@/lib/context/ModuleTitleContext';

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

  // Productions Module menu items dengan active state berdasarkan current pathname
  const menuItems = useMemo<DashboardMenuItem[]>(() => {
    const baseMenuItems: DashboardMenuItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard Overview',
        icon: <IconLayoutDashboard size={20} />,
        href: '/dashboard/auth-module',
      },
      {
        id: 'dashboard-scm',
        label: 'Dashboard',
        icon: <IconLayoutDashboard size={20} />,
        href: '/dashboard/warehouse-module',
      },
      {
        id: 'warehouse-management',
        label: 'Warehouse Management',
        icon: <IconBuildingWarehouse size={20} />,
        href: '/dashboard/warehouse-module/warehouse',
      },
      {
        id: 'stock-management',
        label: 'Stock Management',
        icon: <IconPackages size={20} />,
        href: '/dashboard/warehouse-module/product',
      },
      {
        id: 'role-management',
        label: 'Roles',
        icon: <IconShieldLock size={20} />,
        href: '/dashboard/auth-module/roles',
      },
      {
        id: 'user-management',
        label: 'Users',
        icon: <IconUsers size={20} />,
        href: '/dashboard/auth-module/users',
      },
    ];

    // Separate SCM module menus and Auth/User/Role module menus completely
    const isScmModule = pathname.startsWith('/dashboard/warehouse-module');
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
          role: 'GC Manager',
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

