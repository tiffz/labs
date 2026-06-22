import { encoreDb } from '../db/encoreDb';
import type { EncoreOriginalSong } from './types';

const E2E_SONG_A = 'e2e-originals-queue-a';
const E2E_SONG_B = 'e2e-originals-queue-b';

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
