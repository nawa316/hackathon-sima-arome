'use client';

import React, { ReactNode, createContext, useState, use, useMemo } from 'react';
import {
  IconLayoutDashboard,
  IconUsers,
  IconShieldLock,
  IconLogout,
  IconClipboardCheck,
  IconAward,
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
  setModuleTitle: () => { },
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

  const isQCModule = pathname.startsWith('/dashboard/qc');

  // Dynamic menu items dengan active state berdasarkan current pathname
  const menuItems = useMemo<DashboardMenuItem[]>(() => {
    if (isQCModule) {
      const qcMenuItems = [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <IconLayoutDashboard size={20} />,
          href: '/dashboard/qc',
        },
        {
          id: 'raw-qc',
          label: 'Raw QC',
          icon: <IconClipboardCheck size={20} />,
          href: '/dashboard/qc/raw',
        },
        {
          id: 'product-qc',
          label: 'Product QC',
          icon: <IconAward size={20} />,
          href: '/dashboard/qc/product',
        },
      ];

      return qcMenuItems.map((item) => {
        // Active if exact match or if current path starts with this href (for list items & details)
        // Except for dashboard, which should match exactly to prevent highlight on sub-pages
        const isActive = item.id === 'dashboard'
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return {
          ...item,
          active: isActive,
        };
      });
    }

    const baseMenuItems = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <IconLayoutDashboard size={20} />,
        href: '/dashboard/auth-module',
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

    // Set active state based on current pathname
    return baseMenuItems.map((item) => ({
      ...item,
      active: pathname === item.href,
    }));
  }, [pathname, isQCModule]);

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
