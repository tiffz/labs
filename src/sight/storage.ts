import { CURRICULUM_SCHEMA_VERSION, MAX_LEVEL } from './levels';
import { defaultSkillMatrix, PROFILE_PROGRESS_SCHEMA_VERSION } from './progress/types';
import { PASSES_TO_ADVANCE } from './session/practiceChallenge';
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

export function defaultProfile(): SightProfile {
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
  const rawLevel = Math.max(1, Math.floor(parsed.level ?? 1));
  const level = migrateLevel(rawLevel, schemaVersion);
  const levelChangedByMigration = level !== rawLevel;

  return {
    level,
    challengesCompleted: Math.max(
      0,
      Math.floor(parsed.challengesCompleted ?? parsed.sessionsCompleted ?? 0),
    ),
    passesAtLevel: levelChangedByMigration
      ? 0
      : Math.max(0, Math.floor(parsed.passesAtLevel ?? 0)),
    schemaVersion: CURRICULUM_SCHEMA_VERSION,
    skillMatrix: parsed.skillMatrix ?? defaultSkillMatrix(level),
    recentReps: Array.isArray(parsed.recentReps) ? parsed.recentReps.slice(-30) : [],
    activeFocus: parsed.activeFocus ?? null,
    dailyQueue: parsed.dailyQueue ?? null,
    lastDailySummary: parsed.lastDailySummary,
  };
}

type ParsedProfile = Partial<SightProfile> & { sessionsCompleted?: number };

function profileNeedsPersist(parsed: ParsedProfile, normalized: SightProfile): boolean {
  if (parsed.schemaVersion !== CURRICULUM_SCHEMA_VERSION) return true;
  const rawLevel = Math.max(1, Math.floor(parsed.level ?? 1));
  if (migrateLevel(rawLevel, parsed.schemaVersion) !== rawLevel) return true;
  if (normalized.passesAtLevel !== Math.max(0, Math.floor(parsed.passesAtLevel ?? 0))) return true;
  return false;
}

export function readProfile(): SightProfile {
  const raw = safeGet(KEY_PROFILE);
  if (!raw) return defaultProfile();
  try {
    return normalizeProfile(JSON.parse(raw) as ParsedProfile);
  } catch {
    return defaultProfile();
  }
}

/**
 * Read profile, apply curriculum migration, and persist immediately when anything changed.
 * Call once on app mount so migration does not run mid-answer.
 */
export function ensureProfileMigrated(): SightProfile {
  const raw = safeGet(KEY_PROFILE);
  if (!raw) return defaultProfile();
  try {
    const parsed = JSON.parse(raw) as ParsedProfile;
    const normalized = normalizeProfile(parsed);
    if (profileNeedsPersist(parsed, normalized)) {
      writeProfile(normalized);
    }
    return normalized;
  } catch {
    const profile = defaultProfile();
    writeProfile(profile);
    return profile;
  }
}

export function writeProfile(profile: SightProfile): void {
  safeSet(
    KEY_PROFILE,
    JSON.stringify({ ...profile, schemaVersion: CURRICULUM_SCHEMA_VERSION }),
  );
}

export function resetProfile(): SightProfile {
  clearProfileStorage();
  const profile = defaultProfile();
  writeProfile(profile);
  return profile;
}

export function setProfileLevel(level: number): SightProfile {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  const current = readProfile();
  const profile: SightProfile = {
    ...current,
    level: clamped,
    passesAtLevel: 0,
    schemaVersion: CURRICULUM_SCHEMA_VERSION,
    skillMatrix: defaultSkillMatrix(clamped),
  };
  writeProfile(profile);
  return profile;
}

export function bumpPassesAtLevel(delta = 1): SightProfile {
  const current = readProfile();
  let passesAtLevel = Math.max(0, current.passesAtLevel + delta);
  let level = current.level;
  if (passesAtLevel >= PASSES_TO_ADVANCE && level < MAX_LEVEL) {
    level += 1;
    passesAtLevel = 0;
  }
  const profile: SightProfile = { ...current, level, passesAtLevel };
  writeProfile(profile);
  return profile;
}

export function completeCurrentLevel(): SightProfile {
  const current = readProfile();
  if (current.level >= MAX_LEVEL) return current;
  const profile: SightProfile = {
    ...current,
    level: current.level + 1,
    passesAtLevel: 0,
  };
  writeProfile(profile);
  return profile;
}

export function clearProfileStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(KEY_PROFILE);
  } catch {
    /* ignore */
  }
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
