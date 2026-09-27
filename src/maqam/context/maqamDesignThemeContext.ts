import { createContext } from 'react';

import type { MaqamDesignTheme } from '../design/maqamDesignThemes';

export interface MaqamDesignThemeValue {
  theme: MaqamDesignTheme;
  setThemeId: (id: string) => void;
}

/**
 * Split from the provider component so that file exports only components, which
 * is what Fast Refresh needs to hot-reload it.
 */
export const MaqamDesignThemeContext = createContext<MaqamDesignThemeValue | null>(null);
