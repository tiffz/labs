import { navigateEncore } from '../routes/encoreAppHash';
import { inferredWorkflowStage, isOriginalDemoReady } from './originalsWorkflowCompletion';
import { persistWorkflowStage } from './originalsWorkflowStagePersistence';
import type { OriginalsWorkflowStage } from './originalsWorkflowStages';
import type { EncoreOriginalSong } from './types';

const PAGE_MODE_STORAGE_PREFIX = 'encore-originals-page-mode:';

function persistPageMode(songId: string, mode: 'view' | 'write'): void {
  try {
    sessionStorage.setItem(`${PAGE_MODE_STORAGE_PREFIX}${songId}`, mode);
  } catch {
    /* ignore */
  }
}

/** Open an original from the library — view when demo-ready, otherwise the active write stage. */
export function navigateToOriginalFromLibrary(song: EncoreOriginalSong): void {
  if (isOriginalDemoReady(song)) {
    persistPageMode(song.id, 'view');
    persistWorkflowStage(song.id, 'takes');
  } else {
    const stage = inferredWorkflowStage(song);
    persistPageMode(song.id, 'write');
    persistWorkflowStage(song.id, stage);
  }
  navigateEncore({ kind: 'original', id: song.id });
}

/** Jump straight into lyric editing from a library preview. */
export function navigateToOriginalLyricEdit(songId: string): void {
  navigateToOriginalStageEdit(songId, 'write');
}

/** Open write mode at a specific workflow stage. */
export function navigateToOriginalStageEdit(songId: string, stage: OriginalsWorkflowStage): void {
  persistPageMode(songId, 'write');
  persistWorkflowStage(songId, stage);
  navigateEncore({ kind: 'original', id: songId });
}
