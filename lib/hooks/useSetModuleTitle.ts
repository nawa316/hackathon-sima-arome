'use client';

import { useContext, useEffect } from 'react';
import { ModuleTitleContext } from '@/lib/context/ModuleTitleContext';

/**
 * Hook untuk set moduleTitle dari halaman child
 * 
 * @example
 * export default function RolesPage() {
 *   useSetModuleTitle('Role Management');
 *   return <div>...</div>;
 * }
 */
export function useSetModuleTitle(title: string) {
  const { setModuleTitle } = useContext(ModuleTitleContext);

  useEffect(() => {
    setModuleTitle(title);
  }, [title, setModuleTitle]);
}
