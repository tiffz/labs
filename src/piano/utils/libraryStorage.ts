import type { PianoScore } from '../types';
import type { SoundType } from '../../chords/types/soundOptions';

export interface SongPracticeSettings {
  tempo: number;
  showVocalPart: boolean;
  showRightHand: boolean;
  showLeftHand: boolean;
  showChords: boolean;
  practiceRightHand: boolean;
  practiceLeftHand: boolean;
  practiceVoice: boolean;
  practiceChords: boolean;
  drumEnabled: boolean;
  drumVolume: number;
  zoomLevel: number;
  selectedMeasureRange: { start: number; end: number } | null;
  trackMuted: Record<string, boolean>;
  trackVolume: Record<string, number>;
  score: PianoScore;
}

export interface GlobalPracticePreferences {
  masterVolume: number;
  masterMuted: boolean;
  metronomeVolume: number;
  metronomeEnabled: boolean;
  loopingEnabled: boolean;
  countInEveryLoop: boolean;
  soundType: SoundType;
  microphoneEnabled?: boolean;
  midiSoundEnabled?: boolean;
}

const SETTINGS_KEY = 'piano-song-settings';
const GLOBAL_PREFS_KEY = 'piano-global-prefs';

function getAllSettings(): Record<string, SongPracticeSettings> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllSettings(settings: Record<string, SongPracticeSettings>): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    const keys = Object.keys(settings);
    while (keys.length > 5) {
      delete settings[keys.shift()!];
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); return; } catch { /* keep trimming */ }
    }
  }
}

export function getSongSettings(scoreId: string): SongPracticeSettings | undefined {
  return getAllSettings()[scoreId];
}

export function saveSongSettings(scoreId: string, settings: SongPracticeSettings): void {
  const all = getAllSettings();
  all[scoreId] = settings;
  saveAllSettings(all);
}


export function getGlobalPreferences(): GlobalPracticePreferences | undefined {
  try {
    const raw = localStorage.getItem(GLOBAL_PREFS_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function saveGlobalPreferences(prefs: GlobalPracticePreferences): void {
  try {
    localStorage.setItem(GLOBAL_PREFS_KEY, JSON.stringify(prefs));
  } catch { /* ignore quota errors for tiny payload */ }
}

export interface LibraryEntry {
  id: string;
  title: string;
  description?: string;
  key: string;
  timeSignature: { numerator: number; denominator: number };
  tempo: number;
  score: PianoScore;
  createdAt: number;
  lastPracticedAt?: number;
  source: 'import' | 'exercise' | 'manual';
  fileFormat?: string;
}

const LIBRARY_KEY = 'piano-library';

function getLibrary(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLibrary(entries: LibraryEntry[]): void {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('Library save failed (storage full?), trimming oldest entries', e);
    while (entries.length > 1) {
      entries.pop();
      try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries)); return; } catch { /* keep trimming */ }
    }
  }
}

export function getAllEntries(): LibraryEntry[] {
  return getLibrary();
}

export function addEntry(entry: LibraryEntry): void {
  const lib = getLibrary();
  const existing = lib.findIndex(e => e.id === entry.id);
  if (existing >= 0) {
    lib[existing] = entry;
  } else {
    lib.unshift(entry);
  }
  saveLibrary(lib);
}

/**
 * Sync a library entry's denormalized metadata fields from its score.
 * Call this whenever the score's title, key, tempo, or timeSignature change
 * so the library list stays consistent with the actual score data.
 */
export function syncLibraryEntryFromScore(score: PianoScore): void {
  const lib = getLibrary();
  const idx = lib.findIndex(e => e.id === score.id);
  if (idx < 0) return;
  const entry = lib[idx];
  const needsUpdate =
    entry.title !== (score.title || 'Untitled') ||
    entry.key !== score.key ||
    entry.tempo !== score.tempo ||
    entry.timeSignature.numerator !== score.timeSignature.numerator ||
    entry.timeSignature.denominator !== score.timeSignature.denominator;
  if (!needsUpdate) return;
  lib[idx] = {
    ...entry,
    title: score.title || 'Untitled',
    key: score.key,
    tempo: score.tempo,
    timeSignature: score.timeSignature,
    score,
  };
  saveLibrary(lib);
}

export function saveScoreToLibrary(score: PianoScore, source: LibraryEntry['source'] = 'import', fileFormat?: string): LibraryEntry {
  const entry: LibraryEntry = {
    id: score.id,
    title: score.title || 'Untitled',
    key: score.key,
    timeSignature: score.timeSignature,
    tempo: score.tempo,
    score,
    createdAt: Date.now(),
    source,
    fileFormat,
  };
  addEntry(entry);
  return entry;
}

// --- Last selection persistence ---

const LAST_SELECTION_KEY = 'piano-last-selection';

export interface LastSelection {
  score: PianoScore;
  isExercise: boolean;
}

export function getLastSelection(): LastSelection | undefined {
  try {
    const raw = localStorage.getItem(LAST_SELECTION_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function saveLastSelection(sel: LastSelection): void {
  try {
    localStorage.setItem(LAST_SELECTION_KEY, JSON.stringify(sel));
  } catch { /* ignore quota - exercise scores are small */ }
}

