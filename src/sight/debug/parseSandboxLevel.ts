import { MAX_LEVEL } from '../levels';

/** 0 = legacy compare module (not in curriculum). */
export const LEGACY_COMPARE_LEVEL = 0;

export function parseSandboxLevelFromHash(): number {
  if (typeof window === 'undefined') return 1;
  const match = window.location.hash.match(/level=(\d+)/);
  if (!match) return 1;
  const parsed = Number(match[1]);
  if (parsed === LEGACY_COMPARE_LEVEL) return LEGACY_COMPARE_LEVEL;
  return Math.max(1, Math.min(MAX_LEVEL, parsed));
}
