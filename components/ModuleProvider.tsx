'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { ModuleTitleContext } from '@/lib/context/ModuleTitleContext';

export interface ModuleProviderProps {
  children: ReactNode;
  /**
   * Initial module title yang akan diset saat provider mount
   * Bisa diisi berdasarkan:
   * - Module yang dipilih dari halaman sebelumnya
   * - URL query parameter
   * - Global state/localStorage
   */
  initialModuleTitle?: string;
}

/**
 * ModuleProvider
 * Wrap dashboard layout untuk manage moduleTitle state
 * 
 * Gunakan ModuleProvider di level atas (misalnya di route yang wrap dashboard)
 * untuk pass initial moduleTitle berdasarkan module yang dipilih user.
 * 
 * @example
 * // Contoh 1: Di page yang wrap dashboard
 * import { ModuleProvider } from '@/components/ModuleProvider';
 * 
 * export default function App() {
 *   const selectedModule = 'Production'; // dari user selection
 *   return (
 *     <ModuleProvider initialModuleTitle={selectedModule}>
 *       <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
 *     </ModuleProvider>
 *   );
 * }
 * 
 * @example
 * // Contoh 2: Di (authenticated) layout, dengan dynamic module
 * export default function AuthenticatedLayout({ children }) {
 *   // Baca module dari localStorage atau context
 *   const module = typeof window !== 'undefined' 
 *     ? localStorage.getItem('selectedModule') 
 *     : 'Dashboard';
 *   
 *   return (
 *     <DaaSProviderWrapper>
 *       <ModuleProvider initialModuleTitle={module}>
 *         {children}
 *       </ModuleProvider>
 *     </DaaSProviderWrapper>
 *   );
 * }
 */
export function ModuleProvider({
  children,
  initialModuleTitle = 'Dashboard',
}: ModuleProviderProps) {
  const [moduleTitle, setModuleTitle] = useState(initialModuleTitle);

  // Update moduleTitle jika initialModuleTitle berubah
  useEffect(() => {
    setModuleTitle(initialModuleTitle);
  }, [initialModuleTitle]);

  return (
    <ModuleTitleContext.Provider value={{ moduleTitle, setModuleTitle }}>
      {children}
    </ModuleTitleContext.Provider>
  );
}

