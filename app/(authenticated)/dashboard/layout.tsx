'use client';

import React, { ReactNode, createContext, useState, use, useMemo } from 'react';
import {
  IconLayoutDashboard,
  IconUsers,
  IconShieldLock,
  IconLogout,
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
        label: 'Dashboard',
        icon: <IconLayoutDashboard size={20} />,
        href: '/dashboard',
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

    // Set active state based on current pathname
    return baseMenuItems.map((item) => ({
      ...item,
      active: pathname === item.href,
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
