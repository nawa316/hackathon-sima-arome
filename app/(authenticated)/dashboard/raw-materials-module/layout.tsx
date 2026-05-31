'use client';

import React, { ReactNode, useState, use, useMemo, useEffect } from 'react';
import {
  IconLayoutDashboard,
  IconPackageImport,
  IconBuildingFactory,
  IconAward,
  IconArrowLeft,
  IconList,
} from '@tabler/icons-react';
import {
  DashboardLayout,
  type DashboardMenuItem,
} from '@/components/ui/dashboard-layout';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/buildpad/hooks';
import { ModuleTitleContext } from '@/lib/context/ModuleTitleContext';
import { createClient } from '@/lib/supabase/client';

/**
 * Raw Materials Module Layout
 * Wraps all raw materials pages with the shared brand sidebar DashboardLayout
 */
export default function RawMaterialsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params?: Promise<Record<string, string>>;
}) {
  // Unwrap params if provided (Next.js requirement)
  if (params) {
    use(params);
  }

  const router = useRouter();
  const pathname = usePathname();
  const { user: currentUser } = useAuth();
  const [moduleTitle, setModuleTitle] = useState('Raw Materials & Procurement');

  // Dynamic user profile state
  const [userName, setUserName] = useState('Procurement Staff');
  const [userRole, setUserRole] = useState('Procurement Controller');

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
        console.error('Failed to load user info in raw materials layout:', err);
      }
    };
    
    fetchUserData();
  }, []);

  // Dynamic menu items with active state based on current pathname
  const menuItems = useMemo<DashboardMenuItem[]>(() => {
    const rawMaterialsMenuItems = [
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
        href: '/dashboard/raw-materials-module',
      },
      {
        id: 'intake',
        label: 'Raw Material Intake',
        icon: <IconPackageImport size={20} />,
        href: '/dashboard/raw-materials-module/intake',
      },
      {
        id: 'supplier',
        label: 'Suppliers',
        icon: <IconBuildingFactory size={20} />,
        href: '/dashboard/raw-materials-module/supplier',
      },
      {
        id: 'catalogs',
        label: 'Catalogs',
        icon: <IconList size={20} />,
        href: '/dashboard/raw-materials-module/catalogs',
      },
      {
        id: 'evaluation',
        label: 'Evaluations/AHP',
        icon: <IconAward size={20} />,
        href: '/dashboard/raw-materials-module/evaluation',
      },
    ];

    return rawMaterialsMenuItems.map((item) => {
      // Active if exact match or if current path starts with this href (for detail sub-pages)
      // Except for dashboard and back-to-modules, which should match exactly to prevent highlight on sub-pages
      const isActive =
        item.id === 'dashboard' || item.id === 'back-to-modules'
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

  const displayUserAvatar = useMemo(() => {
    return currentUser?.avatar || 'https://avatars.githubusercontent.com/u/1234?v=4';
  }, [currentUser]);

  return (
    <ModuleTitleContext.Provider value={{ moduleTitle, setModuleTitle }}>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Force Montserrat / subheader font on all headings and title classes */
        h1, h2, h3, h4, h5, h6,
        .mantine-Title-root,
        .mantine-Modal-title,
        .mantine-Modal-header {
          font-family: var(--ds-font-subheader, sans-serif) !important;
        }

        /* Force Inter / sans font on all body, input, select, dropdown, option, labels, and placeholders */
        input, 
        select, 
        textarea,
        button,
        .mantine-Text-root,
        .mantine-Table-thead,
        .mantine-Table-tbody,
        .mantine-Table-tr,
        .mantine-Table-th,
        .mantine-Table-td,
        .mantine-Modal-body,
        .mantine-TextInput-label,
        .mantine-TextInput-input,
        .mantine-NumberInput-label,
        .mantine-NumberInput-input,
        .mantine-Select-label,
        .mantine-Select-input,
        .mantine-Select-dropdown,
        .mantine-Select-option,
        .mantine-Button-label,
        .mantine-Menu-item {
          font-family: var(--ds-font-sans, sans-serif) !important;
        }
      ` }} />
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
