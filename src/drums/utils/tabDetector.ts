/**
 * Unified Tab Detection
 *
 * Detects whether pasted text is a drum tab, guitar tab, or unknown format.
 * Used to route to the appropriate parser and show relevant UI options.
 */

import { isDrumTab } from './drumTabParser';
import { isGuitarTab } from './guitarTabParser';

export type TabType = 'drum' | 'guitar' | 'unknown';

/**
 * Detects the type of tab from the given text.
 * Checks for drum tabs first (more specific), then guitar tabs.
 */
export function detectTabType(text: string): TabType {
  if (!text || text.length < 10) {
    return 'unknown';
  }

  // Check for drum tab first - it has more specific markers (BD, SD, HH)
  if (isDrumTab(text)) {
    return 'drum';
  }

  // Check for guitar tab - 6 string lines with fret numbers
  if (isGuitarTab(text)) {
    return 'guitar';
  }

  return 'unknown';
}

/**
 * Checks if text looks like any supported tab format.
 */
export function isTab(text: string): boolean {
  return detectTabType(text) !== 'unknown';
}

// Re-export detection functions for direct use
export { isDrumTab } from './drumTabParser';
export { isGuitarTab } from './guitarTabParser';
