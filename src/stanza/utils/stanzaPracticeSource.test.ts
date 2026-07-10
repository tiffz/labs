import { describe, expect, it } from 'vitest';

import {
  resolveStanzaPracticeSource,
  songHasDualPracticeSources,
  usesYoutubePracticeTransport,
} from './stanzaPracticeSource';

describe('stanzaPracticeSource', () => {
  it('defaults to youtube when ytId is set', () => {
    expect(resolveStanzaPracticeSource({ ytId: 'abc', localAudioBlob: undefined, practiceSource: undefined })).toBe(
      'youtube',
    );
  });

  it('defaults to local when only a file exists', () => {
    expect(
      resolveStanzaPracticeSource({
        ytId: null,
        localAudioBlob: new Blob([new Uint8Array(1)]),
        practiceSource: undefined,
      }),
    ).toBe('local');
  });

  it('honors practiceSource when both sources exist', () => {
    const blob = new Blob([new Uint8Array(1)]);
    expect(
      resolveStanzaPracticeSource({ ytId: 'abc', localAudioBlob: blob, practiceSource: 'local' }),
    ).toBe('local');
    expect(
      resolveStanzaPracticeSource({ ytId: 'abc', localAudioBlob: blob, practiceSource: 'youtube' }),
    ).toBe('youtube');
    expect(songHasDualPracticeSources({ ytId: 'abc', localAudioBlob: blob, practiceSource: 'local' })).toBe(true);
    expect(
      usesYoutubePracticeTransport({ ytId: 'abc', localAudioBlob: blob, practiceSource: 'local' }),
    ).toBe(false);
  });
});
