import { encoreDb } from '../db/encoreDb';
import { saveOriginalTakeBlob } from './originalTakeLocalAudio';
import type { EncoreOriginalSong } from './types';

const E2E_SONG_A = 'e2e-originals-queue-a';
const E2E_SONG_B = 'e2e-originals-queue-b';

export const E2E_ORIGINALS_QUEUE_A_ID = E2E_SONG_A;

import { LABS_E2E_HOOKS_COMPILED_IN } from '../../shared/test/labsE2eHooks';

export function isE2eOriginalsQueueRoute(): boolean {
  if (!LABS_E2E_HOOKS_COMPILED_IN || typeof window === 'undefined') return false;
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
  if (!LABS_E2E_HOOKS_COMPILED_IN || typeof window === 'undefined') return;
  window.__labsSeedOriginalsQueueE2e = seedOriginalsQueueE2e;
}

/** Label of the take song B stars as preferred — listed second, so "first take" picks wrong. */
export const E2E_ORIGINALS_QUEUE_B_PREFERRED_TAKE_LABEL = 'E2E Queue B take';
export const E2E_ORIGINALS_QUEUE_B_OTHER_TAKE_LABEL = 'E2E Queue B early take';

function seedTake(id: string, label: string): EncoreOriginalSong['takes'][number] {
  return {
    id,
    label,
    timestamp: Date.now(),
    source: 'imported',
    hasLocalAudio: true,
    mimeType: 'audio/mpeg',
  };
}

function seedSong(
  id: string,
  title: string,
  takeId: string,
  now: string,
  /** Playable takes listed BEFORE the preferred one. */
  earlierTakes: EncoreOriginalSong['takes'] = [],
): EncoreOriginalSong {
  const preferred = seedTake(takeId, `${title} take`);
  // With earlier takes, the preferred take's audio is saved on this device but the row lacks the
  // `hasLocalAudio` flag (e.g. the row came back from a Drive merge). Only a blob probe finds it,
  // so a list that trusts the flag alone falls through to the earlier take.
  if (earlierTakes.length > 0) delete preferred.hasLocalAudio;
  return {
    id,
    title,
    key: 'C',
    tempo: 80,
    lyricsAndChords: '[Verse 1]\nSeed line',
    takes: [...earlierTakes, preferred],
    mainTakeId: takeId,
    history: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Ten seconds of 8 kHz mono silence, so the playback bar stays up while a smoke reads it. */
function silentWavBlob(): Blob {
  const sampleRate = 8000;
  const samples = sampleRate * 10;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, samples * 2, true);
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Dev-only Dexie seed for Playwright bulk-play queue smokes (`?e2eOriginalsQueue=1`). */
export async function seedOriginalsQueueE2e(): Promise<void> {
  const now = new Date().toISOString();
  const songs = [
    seedSong(E2E_SONG_A, 'E2E Queue A', 'take-a', now),
    seedSong(E2E_SONG_B, 'E2E Queue B', 'take-b', now, [
      seedTake('take-b-early', E2E_ORIGINALS_QUEUE_B_OTHER_TAKE_LABEL),
    ]),
  ];
  await encoreDb.originals.bulkPut(songs);
  // Back every take with a blob, flagged or not, so playback resolves instead of erroring.
  await Promise.all(
    songs.flatMap((song) => song.takes.map((take) => saveOriginalTakeBlob(song.id, take.id, silentWavBlob()))),
  );
}

export const E2E_ORIGINALS_QUEUE_SONG_TITLES = ['E2E Queue A', 'E2E Queue B'] as const;
