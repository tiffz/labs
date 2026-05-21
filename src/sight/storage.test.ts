import { describe, expect, it } from 'vitest';
import { CURRICULUM_SCHEMA_VERSION } from './levels';

/** Mirrors migrateLevel in storage.ts for unit tests without localStorage. */
function migrateLegacyLevel(level: number, schemaVersion: number | undefined): number {
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
  const clamped = Math.max(1, Math.min(10, Math.floor(level)));
  if (schemaVersion === undefined || schemaVersion < CURRICULUM_SCHEMA_VERSION) {
    return LEGACY_LEVEL_MAP[clamped] ?? clamped;
  }
  return level;
}

describe('profile level migration', () => {
  it('maps old level 3 to new mixed compare level 4', () => {
    expect(migrateLegacyLevel(3, 1)).toBe(4);
  });

  it('maps old contextual level 4 to new level 6', () => {
    expect(migrateLegacyLevel(4, undefined)).toBe(6);
  });

  it('leaves level unchanged when schema is current', () => {
    expect(migrateLegacyLevel(5, CURRICULUM_SCHEMA_VERSION)).toBe(5);
  });
});
