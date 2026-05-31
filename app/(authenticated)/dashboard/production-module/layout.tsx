'use client';

import React, { ReactNode, useState, use, useMemo, useEffect } from 'react';
import {
  IconLayoutDashboard,
  IconBottle,
  IconBuildingFactory2,
  IconClipboardList,
  IconLogout,
  IconArrowLeft,
} from '@tabler/icons-react';
import {
  DashboardLayout,
  type DashboardMenuItem,
} from '@/components/ui/dashboard-layout';
import { useRouter, usePathname } from 'next/navigation';
import { ModuleTitleContext } from '@/components/ModuleTitleContext';
import { createClient } from '@/lib/supabase/client';

export default function ProductionsLayout({
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
  const [moduleTitle, setModuleTitle] = useState('Productions Dashboard');

  // Dynamic user profile state
  const [userName, setUserName] = useState('Productions Staff');
  const [userRoleName, setUserRoleName] = useState('Production Team');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('fullname, roles(name)')
            .eq('id', user.id)
            .single();

          if (profile) {
            setUserName(profile.fullname || user.email || 'Productions Staff');
            if (profile.roles && !Array.isArray(profile.roles)) {
              setUserRoleName((profile.roles as any).name || 'Production Team');
            }
          }
        }
      } catch (err) {
        console.error('Failed to load user profile in layout:', err);
      }
    };
    loadProfile();
  }, []);

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
        label: 'Dashboard',
        icon: <IconLayoutDashboard size={20} />,
        href: '/dashboard/production-module',
      },
      {
        id: 'products',
        label: 'Products',
        icon: <IconBottle size={20} />,
        href: '/dashboard/production-module/product',
      },
      {
        id: 'production',
        label: 'Production',
        icon: <IconBuildingFactory2 size={20} />,
        href: '/dashboard/production-module/production',
      },
      {
        id: 'phase',
        label: 'Phase',
        icon: <IconClipboardList size={20} />,
        href: '/dashboard/production-module/phase',
      },
    ];
    return baseMenuItems.map((item) => {
      // Accurate matching to prevent multiple highlighted items
      const isActive = item.href === '/dashboard/production-module'
        ? pathname === '/dashboard/production-module'
        : item.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname === item.href || pathname.startsWith(item.href + '/');
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
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    router.push('/login');
    router.refresh();
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
          role: userRoleName,
          avatar: 'https://avatars.githubusercontent.com/u/1234?v=4',
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
