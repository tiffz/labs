import { createContext, useContext } from 'react';

import type { ZineboxDesignTheme, ZineboxDesignThemeId } from '../design/zineboxDesignThemes';

export type ZineboxDesignThemeContextValue = {
  theme: ZineboxDesignTheme;
  themeId: ZineboxDesignThemeId;
  setThemeId: (id: ZineboxDesignThemeId) => void;
  applyToElement: (el: HTMLElement | null) => void;
};

export const ZineboxDesignThemeContext = createContext<ZineboxDesignThemeContextValue | null>(null);

export function useZineboxDesignTheme(): ZineboxDesignThemeContextValue {
  const ctx = useContext(ZineboxDesignThemeContext);
  if (!ctx) {
    throw new Error('useZineboxDesignTheme must be used within ZineboxDesignThemeProvider');
  }
  return ctx;
}
