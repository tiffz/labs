import { describe, expect, it } from 'vitest';
import { CURRICULUM_SCHEMA_VERSION, MAX_LEVEL } from './levels';

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

  return Math.max(1, Math.min(MAX_LEVEL, migrated));
}

describe('profile level migration', () => {
  it('maps legacy level 4 to calibration contextual level 14 after v2, v3, and v4 bumps', () => {
    expect(migrateLevel(4, 1)).toBe(14);
  });

  it('maps old contextual level 4 to level 14 after v2, v3, and v4 bumps', () => {
    expect(migrateLevel(4, undefined)).toBe(14);
  });

  it('bumps schema v3 level 12 to calibration lab 19', () => {
    expect(migrateLevel(12, 3)).toBe(19);
  });

  it('leaves level unchanged when schema is current', () => {
    expect(migrateLevel(12, CURRICULUM_SCHEMA_VERSION)).toBe(12);
  });
});
