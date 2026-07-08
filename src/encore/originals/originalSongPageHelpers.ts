import type { EncoreOriginalSong } from './types';

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Commit-time dirty check for originals autosave (not on every keystroke). */
export function originalAutosaveDirty(
  prev: EncoreOriginalSong | null,
  next: EncoreOriginalSong,
): boolean {
  if (!prev) return true;
  if (prev === next) return false;
  if (prev.id !== next.id) return true;
  if (prev.title !== next.title) return true;
  if (prev.key !== next.key) return true;
  if (prev.tempo !== next.tempo) return true;
  if (prev.brainstormHtml !== next.brainstormHtml) return true;
  if (prev.lyricsAndChords !== next.lyricsAndChords) return true;
  if (prev.mainTakeId !== next.mainTakeId) return true;
  if (prev.driveChartGoogleDocId !== next.driveChartGoogleDocId) return true;
  if (prev.startedAt !== next.startedAt) return true;
  if (!jsonEqual(prev.timeSignature, next.timeSignature)) return true;
  if (!jsonEqual(prev.brainstormResources, next.brainstormResources)) return true;
  if (!jsonEqual(prev.songReferences, next.songReferences)) return true;
  if (!jsonEqual(prev.takes, next.takes)) return true;
  if (!jsonEqual(prev.stageCompletion, next.stageCompletion)) return true;
  if (!jsonEqual(prev.history, next.history)) return true;
  if (!jsonEqual(prev.sectionProgressionOverrides, next.sectionProgressionOverrides)) return true;
  if (!jsonEqual(prev.sectionPlaybackOverrides, next.sectionPlaybackOverrides)) return true;
  return false;
}
