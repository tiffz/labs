import { useCallback, useId } from 'react';

export type LabsDisclosureMenuTriggerA11y = {
  'aria-haspopup': 'menu' | 'dialog' | 'true';
  'aria-expanded': boolean;
  'aria-controls': string;
};

/** Shared trigger/menu ids + ARIA for disclosure menus (popover or in-page panel). */
export function useLabsDisclosureMenu(options?: {
  menuId?: string;
  hasPopup?: 'menu' | 'dialog' | 'true';
}) {
  const autoId = useId().replace(/:/g, '');
  const menuId = options?.menuId ?? `labs-disclosure-menu-${autoId}`;
  const hasPopup = options?.hasPopup ?? 'menu';

  const getTriggerA11yProps = useCallback(
    (open: boolean): LabsDisclosureMenuTriggerA11y => ({
      'aria-haspopup': hasPopup,
      'aria-expanded': open,
      'aria-controls': menuId,
    }),
    [hasPopup, menuId],
  );

  const getMenuProps = useCallback(
    () => ({
      id: menuId,
    }),
    [menuId],
  );

  return {
    menuId,
    getTriggerA11yProps,
    getMenuProps,
  };
}
