'use client';

import React, { ReactNode, useState, use, useMemo, useEffect } from 'react';
import {
  IconLayoutDashboard,
  IconUsers,
  IconShieldLock,
  IconLogout,
  IconBuildingWarehouse,
  IconPackages,
  IconArrowLeft,
} from '@tabler/icons-react';
import {
  DashboardLayout,
  type DashboardMenuItem,
} from '@/components/ui/dashboard-layout';
import { useRouter, usePathname } from 'next/navigation';
import { ModuleTitleContext } from '@/lib/context/ModuleTitleContext';
import { createClient } from '@/lib/supabase/client';

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

  // Dynamic user profile state
  const [userName, setUserName] = useState('John Smyth');
  const [userRole, setUserRole] = useState('GC Manager');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient();
        
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return;
        
        const { data: profile, error: profileErr } = await supabase
          .from('users')
          .select('*, roles(id, name, description)')
          .eq('id', user.id)
          .single();
          
        if (profileErr || !profile) {
          console.error('Error fetching profile details:', profileErr);
          return;
        }
        
        if (profile.fullname) {
          setUserName(profile.fullname);
        } else if (profile.email) {
          setUserName(profile.email);
        }
        
        if (profile.roles && profile.roles.name) {
          setUserRole(profile.roles.name);
        }
      } catch (err) {
        console.error('Failed to load user info in auth layout:', err);
      }
    };
    
    fetchUserData();
  }, []);

  // Productions Module menu items dengan active state berdasarkan current pathname
  const menuItems = useMemo<DashboardMenuItem[]>(() => {
    const baseMenuItems: DashboardMenuItem[] = [
      {
        id: 'back-to-modules',
        label: 'Back to Modules',
        icon: <IconArrowLeft size={20} />,
        href: '/dashboard',
      },
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
      active: item.id === 'dashboard' || item.id === 'dashboard-scm' || item.id === 'back-to-modules'
        ? pathname === item.href
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
          name: userName,
          role: userRole,
          avatar: 'https://avatars.githubusercontent.com/u/1234?v=4',
        }}
        hideAvatar={true}
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

