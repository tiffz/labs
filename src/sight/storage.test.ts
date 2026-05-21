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

  return Math.max(1, Math.min(MAX_LEVEL, migrated));
}

describe('profile level migration', () => {
  it('maps old level 3 to new mixed compare level 4', () => {
    expect(migrateLevel(3, 1)).toBe(4);
  });

  it('maps old contextual level 4 to new level 7 after v2 and v3 bumps', () => {
    expect(migrateLevel(4, undefined)).toBe(7);
  });

  it('bumps schema v2 level 5 to level 6 for adjacent insert', () => {
    expect(migrateLevel(5, 2)).toBe(6);
  });

  it('leaves level unchanged when schema is current', () => {
    expect(migrateLevel(5, CURRICULUM_SCHEMA_VERSION)).toBe(5);
  });
});
