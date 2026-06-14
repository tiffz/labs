import { inferredWorkflowStage } from './originalsWorkflowCompletion';
import type { OriginalsWorkflowStage } from './originalsWorkflowStages';
import type { EncoreOriginalSong } from './types';

function stageStorageKey(songId: string): string {
  return `encore-originals-workflow-stage:${songId}`;
}

export function readPersistedWorkflowStage(songId: string, song: EncoreOriginalSong): OriginalsWorkflowStage {
  try {
    const raw = sessionStorage.getItem(stageStorageKey(songId));
    if (raw === 'brainstorm' || raw === 'write' || raw === 'chords' || raw === 'takes') return raw;
  } catch {
    /* ignore */
  }
  return inferredWorkflowStage(song);
}

export function persistWorkflowStage(songId: string, stage: OriginalsWorkflowStage): void {
  try {
    sessionStorage.setItem(stageStorageKey(songId), stage);
  } catch {
    /* ignore */
  }
}
