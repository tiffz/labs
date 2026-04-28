import type { MasteryTier } from './types';
import {
  readBronzeStreak,
  readHelpLevel,
  writeBronzeStreak,
  writeHelpLevel,
  writeLastTier,
} from './storage';

/**
 * Adaptive scaffolding (the "supportive teacher").
 * - 0: clean staff, drone only
 * - 1: louder drone (stronger key reference)
 * - 2: ghost tones — quiet piano guide notes during the sing phase
 * - 3: solfège lyrics force-on (no progression-based fade)
 *
 * Auto-bumps after two consecutive bronze attempts on the same exercise.
 */
export const MIN_HELP_LEVEL = 0;
export const MAX_HELP_LEVEL = 3;
export const BRONZE_BUMP_THRESHOLD = 2;

export interface HelpLevelOutcome {
  helpLevel: number;
  bronzeStreak: number;
  bumped: boolean;
}

export function clampHelpLevel(level: number): number {
  if (!Number.isFinite(level)) return MIN_HELP_LEVEL;
  return Math.max(MIN_HELP_LEVEL, Math.min(MAX_HELP_LEVEL, Math.floor(level)));
}

export function getHelpLevel(exerciseId: string): number {
  return clampHelpLevel(readHelpLevel(exerciseId));
}

/**
 * Record an attempt's tier and decide whether to bump the help level.
 * Pure-ish: persists state into `localStorage` via `storage.ts` helpers, but
 * the returned shape is enough to drive UI directly.
 */
export function recordAttemptForHelp(
  exerciseId: string,
  tier: MasteryTier,
): HelpLevelOutcome {
  const prevStreak = readBronzeStreak(exerciseId);
  const nextStreak = tier === 'bronze' ? prevStreak + 1 : 0;
  writeBronzeStreak(exerciseId, nextStreak);
  writeLastTier(exerciseId, tier);
  let level = clampHelpLevel(readHelpLevel(exerciseId));
  let bumped = false;
  if (nextStreak >= BRONZE_BUMP_THRESHOLD && level < MAX_HELP_LEVEL) {
    level = clampHelpLevel(level + 1);
    writeHelpLevel(exerciseId, level);
    writeBronzeStreak(exerciseId, 0);
    bumped = true;
    return { helpLevel: level, bronzeStreak: 0, bumped };
  }
  return { helpLevel: level, bronzeStreak: nextStreak, bumped };
}
