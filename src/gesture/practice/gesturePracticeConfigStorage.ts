const STORAGE_KEY = 'gesture-practice-session-config';

export type GesturePracticeTimerPreset = number | 'custom';

export type GesturePracticeSessionConfig = {
  version: 1;
  selectedPackIds: string[];
  durationSec: number;
  timerPreset: GesturePracticeTimerPreset;
  customDurationSec: string;
  prioritizeLeastDrawn: boolean;
  shuffle: boolean;
  sessionLengthMode: 'endless' | 'limited';
  photoLimit: string;
  activeTagFilters: string[];
};

function isTimerPreset(value: unknown): value is GesturePracticeTimerPreset {
  return value === 'custom' || (typeof value === 'number' && Number.isFinite(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseStoredConfig(raw: unknown): GesturePracticeSessionConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (row.version !== 1) return null;
  if (!isStringArray(row.selectedPackIds)) return null;
  if (!isStringArray(row.activeTagFilters)) return null;
  if (typeof row.durationSec !== 'number' || !Number.isFinite(row.durationSec)) return null;
  if (!isTimerPreset(row.timerPreset)) return null;
  if (typeof row.customDurationSec !== 'string') return null;
  if (typeof row.prioritizeLeastDrawn !== 'boolean') return null;
  if (typeof row.shuffle !== 'boolean') return null;
  if (row.sessionLengthMode !== 'endless' && row.sessionLengthMode !== 'limited') return null;
  if (typeof row.photoLimit !== 'string') return null;

  return {
    version: 1,
    selectedPackIds: row.selectedPackIds,
    durationSec: row.durationSec,
    timerPreset: row.timerPreset,
    customDurationSec: row.customDurationSec,
    prioritizeLeastDrawn: row.prioritizeLeastDrawn,
    shuffle: row.shuffle,
    sessionLengthMode: row.sessionLengthMode,
    photoLimit: row.photoLimit,
    activeTagFilters: row.activeTagFilters,
  };
}

export function readGesturePracticeSessionConfig(): GesturePracticeSessionConfig | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseStoredConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeGesturePracticeSessionConfig(config: GesturePracticeSessionConfig): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore quota / private mode failures.
  }
}
