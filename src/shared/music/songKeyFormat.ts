import type { HarmonicMode } from './chordTheory';
import { DISPLAY_KEYS_12, transposeMusicKey, type MusicKey } from './musicInputConstants';

/** Song key with optional mode (`C`, `Cm`, `D major`, `D minor`, …). */
export type SongKey = string;

const ENHARMONIC_TO_DISPLAY: Record<string, MusicKey> = {
  'C#': 'Db',
  'D#': 'Eb',
  'Gb': 'F#',
  'G#': 'Ab',
  'A#': 'Bb',
};

const ROOT_LOOKUP = new Set<string>([
  ...DISPLAY_KEYS_12,
  'C#',
  'D#',
  'G#',
  'A#',
  'Gb',
]);

function normalizeRoot(raw: string): MusicKey {
  const trimmed = raw.trim();
  if (!trimmed) return 'C';
  const canonical = ENHARMONIC_TO_DISPLAY[trimmed] ?? trimmed;
  if ((DISPLAY_KEYS_12 as readonly string[]).includes(canonical)) {
    return canonical as MusicKey;
  }
  return 'C';
}

export function parseSongKey(raw: string): { root: MusicKey; mode: HarmonicMode } {
  const trimmed = raw.trim();
  if (!trimmed) return { root: 'C', mode: 'major' };

  const minorLong = trimmed.match(/^(.+?)\s+(minor|min)\.?$/i);
  if (minorLong?.[1]) {
    return { root: normalizeRoot(minorLong[1]), mode: 'minor' };
  }

  const majorLong = trimmed.match(/^(.+?)\s+(major|maj)\.?$/i);
  if (majorLong?.[1]) {
    return { root: normalizeRoot(majorLong[1]), mode: 'major' };
  }

  if (trimmed.length > 1 && trimmed.endsWith('m') && !/maj/i.test(trimmed)) {
    const rootPart = trimmed.slice(0, -1);
    if (ROOT_LOOKUP.has(rootPart) || ROOT_LOOKUP.has(normalizeRoot(rootPart))) {
      return { root: normalizeRoot(rootPart), mode: 'minor' };
    }
  }

  return { root: normalizeRoot(trimmed), mode: 'major' };
}

export function formatSongKey(
  root: MusicKey,
  mode: HarmonicMode,
  style: 'short' | 'long' = 'short',
): SongKey {
  if (mode === 'minor') {
    return style === 'long' ? `${root} minor` : `${root}m`;
  }
  return style === 'long' ? `${root} major` : root;
}

/** Compact label for toolbar buttons (`D maj`, `D min`). */
export function formatSongKeyButtonLabel(value: string): string {
  const { root, mode } = parseSongKey(value);
  return mode === 'minor' ? `${root} min` : `${root} maj`;
}

function songKeyOutputStyle(raw: string): 'short' | 'long' {
  return /\s+(major|minor|maj|min)\.?$/i.test(raw.trim()) ? 'long' : 'short';
}

/** Transpose a song key by semitones while preserving major/minor quality. */
export function transposeSongKey(raw: string, semitones: number): SongKey {
  const { root, mode } = parseSongKey(raw);
  const transposedRoot = transposeMusicKey(root, semitones);
  return formatSongKey(transposedRoot, mode, songKeyOutputStyle(raw));
}

/** Human-readable key label for chips and summaries. */
export function formatSongKeyDisplay(value: string): string {
  const style = songKeyOutputStyle(value);
  const { root, mode } = parseSongKey(value);
  return formatSongKey(root, mode, style);
}

export function isValidSongKey(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  let rootPart = trimmed;
  if (/\s+(minor|min)\.?$/i.test(trimmed)) {
    rootPart = trimmed.replace(/\s+(minor|min)\.?$/i, '');
  } else if (/\s+(major|maj)\.?$/i.test(trimmed)) {
    rootPart = trimmed.replace(/\s+(major|maj)\.?$/i, '');
  } else if (trimmed.length > 1 && trimmed.endsWith('m') && !/maj/i.test(trimmed)) {
    rootPart = trimmed.slice(0, -1);
  }

  const normalized = ENHARMONIC_TO_DISPLAY[rootPart.trim()] ?? rootPart.trim();
  return DISPLAY_KEYS_12.includes(normalized as (typeof DISPLAY_KEYS_12)[number]);
}

export function randomSongKey(style: 'short' | 'long' = 'short'): SongKey {
  const root = DISPLAY_KEYS_12[Math.floor(Math.random() * DISPLAY_KEYS_12.length)]!;
  const mode: HarmonicMode = Math.random() < 0.5 ? 'major' : 'minor';
  return formatSongKey(root, mode, style);
}
