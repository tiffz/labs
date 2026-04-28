import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BRONZE_BUMP_THRESHOLD,
  MAX_HELP_LEVEL,
  clampHelpLevel,
  getHelpLevel,
  recordAttemptForHelp,
} from './helpLevel';
import { readBronzeStreak, readHelpLevel, readLastTier } from './storage';

const EXERCISE_ID = 'melodia-test-help';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('helpLevel.clampHelpLevel', () => {
  it('floors and clamps to [0, MAX_HELP_LEVEL]', () => {
    expect(clampHelpLevel(-3)).toBe(0);
    expect(clampHelpLevel(0)).toBe(0);
    expect(clampHelpLevel(2.7)).toBe(2);
    expect(clampHelpLevel(99)).toBe(MAX_HELP_LEVEL);
  });

  it('coerces NaN to 0', () => {
    expect(clampHelpLevel(Number.NaN)).toBe(0);
  });
});

describe('helpLevel.recordAttemptForHelp', () => {
  it('does not bump on a single bronze attempt', () => {
    const out = recordAttemptForHelp(EXERCISE_ID, 'bronze');
    expect(out.bumped).toBe(false);
    expect(out.helpLevel).toBe(0);
    expect(readBronzeStreak(EXERCISE_ID)).toBe(1);
    expect(readLastTier(EXERCISE_ID)).toBe('bronze');
  });

  it('bumps to level 1 after two consecutive bronze attempts', () => {
    recordAttemptForHelp(EXERCISE_ID, 'bronze');
    const out = recordAttemptForHelp(EXERCISE_ID, 'bronze');
    expect(out.bumped).toBe(true);
    expect(out.helpLevel).toBe(1);
    expect(readBronzeStreak(EXERCISE_ID)).toBe(0);
    expect(readHelpLevel(EXERCISE_ID)).toBe(1);
  });

  it('caps at MAX_HELP_LEVEL no matter how many bronzes follow', () => {
    for (let i = 0; i < 12; i += 1) {
      recordAttemptForHelp(EXERCISE_ID, 'bronze');
    }
    expect(getHelpLevel(EXERCISE_ID)).toBe(MAX_HELP_LEVEL);
  });

  it('resets the bronze streak on a non-bronze tier', () => {
    recordAttemptForHelp(EXERCISE_ID, 'bronze');
    expect(readBronzeStreak(EXERCISE_ID)).toBe(1);
    const out = recordAttemptForHelp(EXERCISE_ID, 'silver');
    expect(out.bumped).toBe(false);
    expect(out.bronzeStreak).toBe(0);
    expect(readBronzeStreak(EXERCISE_ID)).toBe(0);
    expect(readLastTier(EXERCISE_ID)).toBe('silver');
  });

  it('threshold matches BRONZE_BUMP_THRESHOLD', () => {
    expect(BRONZE_BUMP_THRESHOLD).toBe(2);
  });
});
