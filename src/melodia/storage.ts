import type { MasteryTier } from './types';

const KEY_CALIBRATION_DONE = 'melodia:calibrationDone:v1';
const KEY_CALIBRATION_MIDI = 'melodia:calibrationMidi';
const KEY_COMFORT_LOW = 'melodia:comfortLow';
const KEY_COMFORT_HIGH = 'melodia:comfortHigh';
const KEY_PATH_INDEX = 'melodia:pathIndex';
const KEY_LAST_EXERCISE = 'melodia:lastExerciseId';
const KEY_MIC_DEVICE = 'melodia:micDeviceId';
const KEY_MASTERY = 'melodia:mastery:v1';
const PREFIX_HELP_LEVEL = 'melodia:helpLevel:';
const PREFIX_LAST_TIER = 'melodia:lastTier:';
const PREFIX_BRONZE_STREAK = 'melodia:bronzeStreak:';

export interface ComfortRange {
  low: number;
  high: number;
}

export const DEFAULT_COMFORT_LOW = 55;
export const DEFAULT_COMFORT_HIGH = 76;

const RANGE_PRESETS: Record<'low' | 'mid' | 'high', ComfortRange> = {
  low: { low: 55, high: 67 },
  mid: { low: 60, high: 72 },
  high: { low: 64, high: 76 },
};

export function rangePreset(name: 'low' | 'mid' | 'high'): ComfortRange {
  return { ...RANGE_PRESETS[name] };
}

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
    /* quota / privacy mode */
  }
}

export function readCalibrationDone(): boolean {
  return safeGet(KEY_CALIBRATION_DONE) === '1';
}

export function writeCalibrationDone(): void {
  safeSet(KEY_CALIBRATION_DONE, '1');
}

export function readCalibrationMidi(): number | null {
  const raw = safeGet(KEY_CALIBRATION_MIDI);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function writeCalibrationMidi(midi: number): void {
  safeSet(KEY_CALIBRATION_MIDI, String(midi));
}

export function readComfortRange(): ComfortRange {
  const lo = safeGet(KEY_COMFORT_LOW);
  const hi = safeGet(KEY_COMFORT_HIGH);
  if (lo === null || hi === null) {
    return { low: DEFAULT_COMFORT_LOW, high: DEFAULT_COMFORT_HIGH };
  }
  const low = Number(lo);
  const high = Number(hi);
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) {
    return { low: DEFAULT_COMFORT_LOW, high: DEFAULT_COMFORT_HIGH };
  }
  return { low, high };
}

export function writeComfortRange(range: ComfortRange): void {
  safeSet(KEY_COMFORT_LOW, String(range.low));
  safeSet(KEY_COMFORT_HIGH, String(range.high));
}

export function readPathIndex(): number {
  const raw = safeGet(KEY_PATH_INDEX);
  if (raw === null) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function writePathIndex(index: number): void {
  safeSet(KEY_PATH_INDEX, String(Math.max(0, Math.floor(index))));
}

export function writeLastExerciseId(id: string): void {
  safeSet(KEY_LAST_EXERCISE, id);
}

export function readPreferredMicDeviceId(): string | null {
  const raw = safeGet(KEY_MIC_DEVICE);
  if (!raw?.trim()) return null;
  return raw;
}

/** Preferred `MediaDevice.deviceId`; used across calibration + sing phases. */
export function writePreferredMicDeviceId(deviceId: string): void {
  safeSet(KEY_MIC_DEVICE, deviceId.trim());
}

export interface ExerciseMasteryRecord {
  tier: MasteryTier;
  lastAttemptAt: number;
}

export interface MasteryStore {
  byExerciseId: Record<string, ExerciseMasteryRecord>;
}

export function loadMastery(): MasteryStore {
  try {
    const raw = safeGet(KEY_MASTERY);
    if (!raw) return { byExerciseId: {} };
    const parsed = JSON.parse(raw) as MasteryStore;
    if (!parsed || typeof parsed !== 'object' || !parsed.byExerciseId) return { byExerciseId: {} };
    return parsed;
  } catch {
    return { byExerciseId: {} };
  }
}

export function saveMastery(store: MasteryStore): void {
  safeSet(KEY_MASTERY, JSON.stringify(store));
}

const TIER_RANK: Record<MasteryTier, number> = { none: 0, bronze: 1, silver: 2, gold: 3 };

export function recordAttempt(exerciseId: string, tier: MasteryTier): void {
  const store = loadMastery();
  const prev = store.byExerciseId[exerciseId];
  const nextTier = !prev || TIER_RANK[tier] >= TIER_RANK[prev.tier] ? tier : prev.tier;
  store.byExerciseId[exerciseId] = { tier: nextTier, lastAttemptAt: Date.now() };
  saveMastery(store);
}

function readNumber(key: string): number {
  const raw = safeGet(key);
  if (raw === null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function readHelpLevel(exerciseId: string): number {
  return readNumber(PREFIX_HELP_LEVEL + exerciseId);
}

export function writeHelpLevel(exerciseId: string, level: number): void {
  safeSet(PREFIX_HELP_LEVEL + exerciseId, String(Math.max(0, Math.floor(level))));
}

export function readLastTier(exerciseId: string): MasteryTier | null {
  const raw = safeGet(PREFIX_LAST_TIER + exerciseId);
  if (raw === 'gold' || raw === 'silver' || raw === 'bronze' || raw === 'none') return raw;
  return null;
}

export function writeLastTier(exerciseId: string, tier: MasteryTier): void {
  safeSet(PREFIX_LAST_TIER + exerciseId, tier);
}

export function readBronzeStreak(exerciseId: string): number {
  return readNumber(PREFIX_BRONZE_STREAK + exerciseId);
}

export function writeBronzeStreak(exerciseId: string, n: number): void {
  safeSet(PREFIX_BRONZE_STREAK + exerciseId, String(Math.max(0, Math.floor(n))));
}
