import { encoreDb } from '../db/encoreDb';
import type { EncoreOriginalSong } from './types';

const E2E_SONG_A = 'e2e-originals-queue-a';
const E2E_SONG_B = 'e2e-originals-queue-b';

export const E2E_ORIGINALS_QUEUE_A_ID = E2E_SONG_A;

export function isE2eOriginalsQueueRoute(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const hashQuery = window.location.hash.includes('?')
    ? new URLSearchParams(window.location.hash.split('?')[1] ?? '')
    : new URLSearchParams();
  return params.has('e2eOriginalsQueue') || hashQuery.has('e2eOriginalsQueue');
}

declare global {
  interface Window {
    __labsSeedOriginalsQueueE2e?: () => Promise<void>;
  }
}

/** Playwright smokes call this after navigation for a deterministic Dexie seed. */
export function exposeOriginalsQueueE2eSeed(): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  window.__labsSeedOriginalsQueueE2e = seedOriginalsQueueE2e;
}

function seedSong(id: string, title: string, takeId: string, now: string): EncoreOriginalSong {
  return {
    id,
    title,
    key: 'C',
    tempo: 80,
    lyricsAndChords: '[Verse 1]\nSeed line',
    takes: [
      {
        id: takeId,
        label: `${title} take`,
        timestamp: Date.now(),
        source: 'imported',
        hasLocalAudio: true,
        mimeType: 'audio/mpeg',
      },
    ],
    mainTakeId: takeId,
    history: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Dev-only Dexie seed for Playwright bulk-play queue smokes (`?e2eOriginalsQueue=1`). */
export async function seedOriginalsQueueE2e(): Promise<void> {
  const now = new Date().toISOString();
  await encoreDb.originals.bulkPut([
    seedSong(E2E_SONG_A, 'E2E Queue A', 'take-a', now),
    seedSong(E2E_SONG_B, 'E2E Queue B', 'take-b', now),
  ]);
}

export const E2E_ORIGINALS_QUEUE_SONG_TITLES = ['E2E Queue A', 'E2E Queue B'] as const;
