import { useContext } from 'react';

import {
  MaqamDesignThemeContext,
  type MaqamDesignThemeValue,
} from './maqamDesignThemeContext';

/**
 * In its own file so the context module can keep exporting a component without
 * tripping the Fast Refresh rule (`only-export-components`).
 *
 * Throws rather than returning a default: a component reading the theme outside
 * the provider is a wiring mistake, and handing it the default look would hide
 * that until someone noticed the picker did nothing.
 */
export function useMaqamDesignTheme(): MaqamDesignThemeValue {
  const value = useContext(MaqamDesignThemeContext);
  if (!value) {
    throw new Error('useMaqamDesignTheme must be used inside MaqamDesignThemeProvider');
  }
  return value;
}
