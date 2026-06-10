import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ENCORE_MEDIA_PLAYBACK_ADJUSTMENTS,
  EncoreMediaPlaybackAdjustmentStore,
} from './encoreMediaPlaybackAdjustments';

describe('EncoreMediaPlaybackAdjustmentStore', () => {
  it('returns defaults for unknown playback ids', () => {
    const store = new EncoreMediaPlaybackAdjustmentStore();
    expect(store.get('track-a')).toEqual(DEFAULT_ENCORE_MEDIA_PLAYBACK_ADJUSTMENTS);
  });

  it('remembers adjustments per playback id', () => {
    const store = new EncoreMediaPlaybackAdjustmentStore();
    store.save('track-a', { playbackRate: 0.85, transposeSemitones: 2, loopEnabled: true });
    store.save('track-b', { playbackRate: 1.1, transposeSemitones: -3, loopEnabled: false });

    expect(store.get('track-a')).toEqual({
      playbackRate: 0.85,
      transposeSemitones: 2,
      loopEnabled: true,
    });
    expect(store.get('track-b')).toEqual({
      playbackRate: 1.1,
      transposeSemitones: -3,
      loopEnabled: false,
    });
  });

  it('patches one field without clobbering the rest', () => {
    const store = new EncoreMediaPlaybackAdjustmentStore();
    store.save('track-a', { playbackRate: 0.9, transposeSemitones: 1, loopEnabled: false });
    store.patch('track-a', { loopEnabled: true });

    expect(store.get('track-a')).toEqual({
      playbackRate: 0.9,
      transposeSemitones: 1,
      loopEnabled: true,
    });
  });
});
