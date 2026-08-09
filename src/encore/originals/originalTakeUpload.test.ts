import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { encoreDb } from '../db/encoreDb';
import { hasOriginalTakeBlob } from './originalTakeLocalAudio';
import { buildLocalOriginalTake } from './originalTakeUpload';

beforeEach(async () => {
  await encoreDb.originalTakeBlobs.clear();
});

describe('buildLocalOriginalTake (local-first take persistence)', () => {
  // Regression: takes used to be added to the song only AFTER the resumable Drive
  // upload resolved, so a refresh mid-upload lost the take. The local build must
  // persist the blob + return a playable take with NO Drive dependency, so the caller
  // can save the song row before touching the network.
  it('persists the blob and returns a locally-playable take with no Drive access', async () => {
    const file = new File(['take-audio'], 'Bridge idea.m4a', { type: 'application/octet-stream' });

    const take = await buildLocalOriginalTake(file, 'song-1');

    expect(take.id).toBeTruthy();
    expect(take.label).toBe('Bridge idea.m4a');
    expect(take.source).toBe('imported');
    expect(take.hasLocalAudio).toBe(true);
    expect(take.driveFileId).toBeUndefined();
    expect(take.mimeType).toBe('audio/mp4');

    // The audio is durable in Dexie the moment the take is built — before any upload.
    expect(await hasOriginalTakeBlob('song-1', take.id)).toBe(true);
  });

  it('gives each take a distinct id and blob key', async () => {
    const a = await buildLocalOriginalTake(new File(['a'], 'a.m4a'), 'song-1');
    const b = await buildLocalOriginalTake(new File(['b'], 'b.m4a'), 'song-1');
    expect(a.id).not.toBe(b.id);
    expect(await hasOriginalTakeBlob('song-1', a.id)).toBe(true);
    expect(await hasOriginalTakeBlob('song-1', b.id)).toBe(true);
  });
});
