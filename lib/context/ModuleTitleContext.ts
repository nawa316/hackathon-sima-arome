'use client';

import { createContext } from 'react';

/**
 * Shared Context for managing and setting the active dashboard module title.
 */
export const ModuleTitleContext = createContext<{
  moduleTitle: string;
  setModuleTitle: (title: string) => void;
}>({
  moduleTitle: 'Dashboard',
  setModuleTitle: () => {},
});
