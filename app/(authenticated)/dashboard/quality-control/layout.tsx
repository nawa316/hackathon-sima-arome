'use client';

import React, { ReactNode, useState, use, useMemo } from 'react';
import {
  IconLayoutDashboard,
  IconClipboardCheck,
  IconAward,
} from '@tabler/icons-react';
import {
  DashboardLayout,
  type DashboardMenuItem,
} from '@/components/ui/dashboard-layout';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/buildpad/hooks';
import { ModuleTitleContext } from '@/lib/context/ModuleTitleContext';

/**
 * Quality Control Module Sidebar Layout
 * Wraps all quality-control pages with the DashboardLayout
 */
export default function QualityControlLayout({
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
  const { user: currentUser } = useAuth();
  const [moduleTitle, setModuleTitle] = useState('Quality Control');

  // Dynamic menu items with active state based on current pathname
  const menuItems = useMemo<DashboardMenuItem[]>(() => {
    const qcMenuItems = [
      {
        id: 'dashboard',
        label: 'QC Dashboard',
        icon: <IconLayoutDashboard size={20} />,
        href: '/dashboard/quality-control',
      },
      {
        id: 'raw-qc',
        label: 'Raw QC',
        icon: <IconClipboardCheck size={20} />,
        href: '/dashboard/quality-control/raw',
      },
      {
        id: 'stock-qc',
        label: 'Stock QC',
        icon: <IconAward size={20} />,
        href: '/dashboard/quality-control/product',
      },
    ];

    return qcMenuItems.map((item) => {
      // Active if exact match or if current path starts with this href (for list items & details)
      // Except for dashboard, which should match exactly to prevent highlight on sub-pages
      const isActive =
        item.id === 'dashboard'
          ? pathname === item.href
          : pathname.startsWith(item.href);

      return {
        ...item,
        active: isActive,
      };
    });
  }, [pathname]);

  const handleMenuItemClick = (item: DashboardMenuItem) => {
    router.push(item.href);
  };

  const handleLogout = async () => {
    router.push('/login');
  };

  // Dynamic User Profile calculations from useAuth hook
  const displayUserName = useMemo(() => {
    if (!currentUser) return 'QC Staff';
    return (
      [currentUser.first_name, currentUser.last_name]
        .filter(Boolean)
        .join(' ') || currentUser.email
    );
  }, [currentUser]);

  const displayUserRole = useMemo(() => {
    if (!currentUser) return 'QC Staff';
    return currentUser.role || (currentUser.admin_access ? 'Super Admin' : 'Quality Controller');
  }, [currentUser]);

  const displayUserAvatar = useMemo(() => {
    return currentUser?.avatar || 'https://avatars.githubusercontent.com/u/1234?v=4';
  }, [currentUser]);

  return (
    <ModuleTitleContext.Provider value={{ moduleTitle, setModuleTitle }}>
      <DashboardLayout
        menuItems={menuItems}
        brandTitle="Sima Arôme"
        logoSrc="/image/logo-sima-arome.png"
        moduleTitle={moduleTitle}
        userInfo={{
          name: displayUserName,
          role: displayUserRole,
          avatar: displayUserAvatar,
        }}
        notificationCount={0}
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
