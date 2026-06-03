import { describe, expect, it } from 'vitest';
import { mergeStanzaStemTracks } from './stanzaStemMerge';

describe('mergeStanzaStemTracks', () => {
  it('carries remote driveFileId when local only has an empty blob placeholder', () => {
    const merged = mergeStanzaStemTracks(
      [{ id: 'a', label: 'Local', localBlob: new Blob([], { type: 'audio/wav' }) }],
      [{ id: 'a', label: 'Remote', driveFileId: 'drive-stem-1' }],
    );
    expect(merged?.[0].driveFileId).toBe('drive-stem-1');
    expect(merged?.[0].localBlob.size).toBe(0);
  });

  it('keeps local blob bytes when both sides have the same stem id', () => {
    const blob = new Blob(['wav-bytes'], { type: 'audio/wav' });
    const merged = mergeStanzaStemTracks(
      [{ id: 'a', label: 'Local', localBlob: blob }],
      [{ id: 'a', label: 'Remote', driveFileId: 'drive-stem-1' }],
    );
    expect(merged?.[0].localBlob).toBe(blob);
    expect(merged?.[0].driveFileId).toBe('drive-stem-1');
  });

  it('appends remote-only stems and local-only stems', () => {
    const localBlob = new Blob(['x'], { type: 'audio/wav' });
    const merged = mergeStanzaStemTracks(
      [{ id: 'local-only', label: 'Only here', localBlob }],
      [{ id: 'remote-only', label: 'From Drive', driveFileId: 'f1' }],
    );
    expect(merged?.map((s) => s.id).sort()).toEqual(['local-only', 'remote-only']);
  });
});
