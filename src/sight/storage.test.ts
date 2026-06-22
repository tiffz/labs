import { beforeEach, describe, expect, it } from 'vitest';
import { CURRICULUM_SCHEMA_VERSION, MAX_LEVEL } from './levels';
import { defaultSkillMatrix } from './progress/types';
import {
  beginPracticeAtLevel,
  ensureProfileMigrated,
  readProfile,
  resetProfile,
  setProfileLevel,
  skipToLevel,
  writeProfile,
} from './storage';
import type { SightProfile } from './types';

/** Mirrors migrateLevel in storage.ts for unit tests without localStorage. */
function migrateLevel(level: number, schemaVersion: number | undefined): number {
  const LEGACY_LEVEL_MAP: Record<number, number> = {
    1: 1,
    2: 2,
    3: 4,
    4: 6,
    5: 7,
    6: 8,
    7: 9,
    8: 10,
    9: 11,
    10: 12,
  };
  const raw = Math.max(1, Math.floor(level));
  let migrated = raw;

  if (schemaVersion === undefined || schemaVersion < 2) {
    const legacyClamped = Math.max(1, Math.min(10, raw));
    migrated = LEGACY_LEVEL_MAP[legacyClamped] ?? legacyClamped;
  }

  if (schemaVersion === undefined || schemaVersion < 3) {
    if (migrated >= 5) migrated += 1;
  }

  if (schemaVersion === undefined || schemaVersion < 4) {
    if (migrated >= 5) migrated += 7;
  }

  if (schemaVersion === undefined || schemaVersion < 7) {
    const beforeV7 = migrated;
    if (beforeV7 >= 15) migrated += 1;
    if (beforeV7 >= 16) migrated += 1;
  }

  return Math.max(1, Math.min(MAX_LEVEL, migrated));
}

describe('profile level migration', () => {
  it('maps legacy level 4 to calibration contextual level 14 after v2, v3, and v4 bumps', () => {
    expect(migrateLevel(4, 1)).toBe(14);
  });

  it('maps old contextual level 4 to level 14 after v2, v3, and v4 bumps', () => {
    expect(migrateLevel(4, undefined)).toBe(14);
  });

  it('bumps schema v3 level 12 through v4 and v7 calibration insertions', () => {
    // v3 already applied at save time: 12 → +7 (v4) → 19 → +2 (v7) → 21
    expect(migrateLevel(12, 3)).toBe(21);
  });

  it('bumps schema v3 level 13 through v4 and v7 calibration insertions', () => {
    expect(migrateLevel(13, 3)).toBe(22);
  });

  it('maps schema v6 level 15 to value + saturation at 16', () => {
    expect(migrateLevel(15, 6)).toBe(16);
  });

  it('maps schema v6 level 16 to full match at 18', () => {
    expect(migrateLevel(16, 6)).toBe(18);
  });

  it('maps schema v6 level 17 to bridge at 19', () => {
    expect(migrateLevel(17, 6)).toBe(19);
  });

  it('leaves level unchanged when schema is current', () => {
    expect(migrateLevel(12, CURRICULUM_SCHEMA_VERSION)).toBe(12);
  });
});

describe('storage profile persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function seedProfile(partial: Partial<SightProfile>): void {
    writeProfile({
      level: 1,
      challengesCompleted: 0,
      passesAtLevel: 0,
      schemaVersion: CURRICULUM_SCHEMA_VERSION,
      skillMatrix: defaultSkillMatrix(partial.level ?? 1),
      recentReps: [],
      activeFocus: null,
      dailyQueue: null,
      ...partial,
    });
  }

  it('resets passesAtLevel when migration bumps level', () => {
    localStorage.setItem(
      'sight:profile',
      JSON.stringify({
        level: 12,
        passesAtLevel: 6,
        schemaVersion: 3,
        challengesCompleted: 40,
        skillMatrix: defaultSkillMatrix(12),
        recentReps: [],
      }),
    );

    const profile = ensureProfileMigrated();
    expect(profile.level).toBe(21);
    expect(profile.passesAtLevel).toBe(0);
    expect(profile.schemaVersion).toBe(CURRICULUM_SCHEMA_VERSION);

    const stored = JSON.parse(localStorage.getItem('sight:profile')!);
    expect(stored.level).toBe(21);
    expect(stored.passesAtLevel).toBe(0);
    expect(stored.schemaVersion).toBe(CURRICULUM_SCHEMA_VERSION);
  });

  it('resets passesAtLevel when schema v3 level 13 jumps to 22', () => {
    localStorage.setItem(
      'sight:profile',
      JSON.stringify({
        level: 13,
        passesAtLevel: 6,
        schemaVersion: 3,
        challengesCompleted: 50,
        skillMatrix: defaultSkillMatrix(13),
        recentReps: [],
      }),
    );

    const profile = ensureProfileMigrated();
    expect(profile.level).toBe(22);
    expect(profile.passesAtLevel).toBe(0);
  });

  it('does not re-migrate an already current profile', () => {
    seedProfile({ level: 12, passesAtLevel: 3, schemaVersion: CURRICULUM_SCHEMA_VERSION });
    const first = ensureProfileMigrated();
    const second = readProfile();
    expect(first.level).toBe(12);
    expect(second.level).toBe(12);
    expect(second.passesAtLevel).toBe(3);
  });

  it('resetProfile returns level 1 defaults', () => {
    seedProfile({ level: 20, passesAtLevel: 4 });
    const profile = resetProfile();
    expect(profile.level).toBe(1);
    expect(profile.passesAtLevel).toBe(0);
    expect(readProfile().level).toBe(1);
  });

  it('setProfileLevel clamps and clears passes', () => {
    seedProfile({ level: 5, peakLevel: 5, passesAtLevel: 4 });
    const profile = setProfileLevel(21);
    expect(profile.level).toBe(21);
    expect(profile.peakLevel).toBe(21);
    expect(profile.passesAtLevel).toBe(0);
  });

  it('beginPracticeAtLevel sets working level and preserves peak', () => {
    seedProfile({ level: 16, peakLevel: 16, passesAtLevel: 4 });
    const profile = beginPracticeAtLevel(15);
    expect(profile.level).toBe(15);
    expect(profile.peakLevel).toBe(16);
    expect(profile.passesAtLevel).toBe(0);
  });

  it('skipToLevel jumps ahead without pass gate', () => {
    seedProfile({ level: 15, peakLevel: 16, passesAtLevel: 2 });
    const profile = skipToLevel(16);
    expect(profile.level).toBe(16);
    expect(profile.peakLevel).toBe(16);
    expect(profile.passesAtLevel).toBe(0);
  });
});
