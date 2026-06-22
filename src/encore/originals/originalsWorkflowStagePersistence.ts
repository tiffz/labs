import { inferredWorkflowStage } from './originalsWorkflowCompletion';
import type { OriginalsWorkflowStage } from './originalsWorkflowStages';
import type { EncoreOriginalSong } from './types';

function stageStorageKey(songId: string): string {
  return `encore-originals-workflow-stage:${songId}`;
}

/** Session-only read — used before song draft is hydrated. */
export function readSessionWorkflowStage(songId: string): OriginalsWorkflowStage | null {
  try {
    const raw = sessionStorage.getItem(stageStorageKey(songId));
    if (raw === 'brainstorm' || raw === 'write' || raw === 'chords' || raw === 'takes') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function readPersistedWorkflowStage(songId: string, song: EncoreOriginalSong): OriginalsWorkflowStage {
  return readSessionWorkflowStage(songId) ?? inferredWorkflowStage(song);
}

export function persistWorkflowStage(songId: string, stage: OriginalsWorkflowStage): void {
  try {
    sessionStorage.setItem(stageStorageKey(songId), stage);
  } catch {
    /* ignore */
  }
}
