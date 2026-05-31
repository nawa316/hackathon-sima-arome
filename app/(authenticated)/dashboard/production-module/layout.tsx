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
import { useAuth } from '@/lib/buildpad/hooks';

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
  const { user: currentUser } = useAuth();
  const [moduleTitle, setModuleTitle] = useState('Productions Dashboard');

  // Dynamic User Profile calculations from useAuth hook
  const displayUserNameFallback = useMemo(() => {
    if (!currentUser) return 'Productions Staff';
    return (
      [currentUser.first_name, currentUser.last_name]
        .filter(Boolean)
        .join(' ') || currentUser.email
    );
  }, [currentUser]);

  const displayUserRoleFallback = useMemo(() => {
    if (!currentUser) return 'Production Team';
    
    // 1. If explicit role field exists, use it
    if (currentUser.role) return currentUser.role;
    
    // 2. If roles array exists and has items, use the names of the roles (e.g. "Manager")
    if (currentUser.roles && currentUser.roles.length > 0) {
      return currentUser.roles
        .map((r) => r.name.charAt(0).toUpperCase() + r.name.slice(1))
        .join(', ');
    }
    
    // 3. Fallback to Admin or Operator
    return currentUser.admin_access ? 'Super Admin' : 'Production Team';
  }, [currentUser]);

  const [userName, setUserName] = useState<string>('Productions Staff');
  const [userRole, setUserRole] = useState<string>('Production Team');

  // 1. Initialize and update when useAuth changes
  useEffect(() => {
    if (currentUser) {
      setUserName(displayUserNameFallback);
      setUserRole(displayUserRoleFallback);
    }
  }, [currentUser, displayUserNameFallback, displayUserRoleFallback]);

  // 2. Fetch live profile and role directly from public.users and roles table (identical to /dashboard page)
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
        console.error('Failed to load user info:', err);
      }
    };
    
    fetchUserData();
  }, []);

  const displayUserAvatar = useMemo(() => {
    return currentUser?.avatar || 'https://avatars.githubusercontent.com/u/1234?v=4';
  }, [currentUser]);

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
          role: userRole,
          avatar: displayUserAvatar,
        }}
        notificationCount={0}
        onMenuItemClick={handleMenuItemClick}
        onLogout={handleLogout}
        sidebarWidth={280}
        headerHeight={70}
        hideAvatar={true}
      >
        {children}
      </DashboardLayout>
    </ModuleTitleContext.Provider>
  );
}
