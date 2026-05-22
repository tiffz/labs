import { CURRICULUM_SCHEMA_VERSION, MAX_LEVEL } from './levels';
import { defaultSkillMatrix, PROFILE_PROGRESS_SCHEMA_VERSION } from './progress/types';
import type { SightProfile } from './types';

const KEY_PROFILE = 'sight:profile';

/** Old 10-level curriculum → 12-level (schema v2). */
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

function safeGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota */
  }
}

function migrateLevel(level: number, schemaVersion: number | undefined): number {
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

function defaultProfile(): SightProfile {
  return {
    level: 1,
    challengesCompleted: 0,
    passesAtLevel: 0,
    schemaVersion: CURRICULUM_SCHEMA_VERSION,
    skillMatrix: defaultSkillMatrix(1),
    recentReps: [],
    activeFocus: null,
    dailyQueue: null,
  };
}

function normalizeProfile(parsed: Partial<SightProfile> & { sessionsCompleted?: number }): SightProfile {
  const schemaVersion = parsed.schemaVersion;
  const level = migrateLevel(parsed.level ?? 1, schemaVersion);

  return {
    level,
    challengesCompleted: Math.max(
      0,
      Math.floor(parsed.challengesCompleted ?? parsed.sessionsCompleted ?? 0),
    ),
    passesAtLevel: Math.max(0, Math.floor(parsed.passesAtLevel ?? 0)),
    schemaVersion: CURRICULUM_SCHEMA_VERSION,
    skillMatrix: parsed.skillMatrix ?? defaultSkillMatrix(level),
    recentReps: Array.isArray(parsed.recentReps) ? parsed.recentReps.slice(-30) : [],
    activeFocus: parsed.activeFocus ?? null,
    dailyQueue: parsed.dailyQueue ?? null,
    lastDailySummary: parsed.lastDailySummary,
  };
}

export function readProfile(): SightProfile {
  const raw = safeGet(KEY_PROFILE);
  if (!raw) return defaultProfile();
  try {
    return normalizeProfile(JSON.parse(raw) as Partial<SightProfile> & { sessionsCompleted?: number });
  } catch {
    return defaultProfile();
  }
}

export function writeProfile(profile: SightProfile): void {
  safeSet(
    KEY_PROFILE,
    JSON.stringify({ ...profile, schemaVersion: CURRICULUM_SCHEMA_VERSION }),
  );
}

/** Drop legacy queued-session data from older builds. */
/** Progress overlay schema (skill matrix, reps); separate from curriculum level table version. */
export { PROFILE_PROGRESS_SCHEMA_VERSION };

export function clearLegacySessionStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem('sight:session');
  } catch {
    /* ignore */
  }
}
