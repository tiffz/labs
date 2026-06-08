import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { encoreDb } from '../db/encoreDb';
import {
  hasOriginalTakeBlob,
  loadOriginalTakeBlob,
  originalTakeBlobKey,
  saveOriginalTakeBlob,
} from './originalTakeLocalAudio';

beforeEach(async () => {
  await encoreDb.originalTakeBlobs.clear();
});

describe('originalTakeLocalAudio', () => {
  it('stores local take blobs with inferred m4a mime', async () => {
    const file = new File(['abc'], 'Meet me on the moon.m4a', { type: 'application/octet-stream' });
    await saveOriginalTakeBlob('song1', 'take1', file);
    expect(await hasOriginalTakeBlob('song1', 'take1')).toBe(true);
    const loaded = await loadOriginalTakeBlob(originalTakeBlobKey('song1', 'take1'));
    expect(loaded?.mimeType).toBe('audio/mp4');
  });
});
