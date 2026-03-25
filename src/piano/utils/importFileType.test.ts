import { describe, expect, it } from 'vitest';
import { getImportFileKind, isMediaFile, isMusicFile } from './importFileType';

function makeFile(name: string, type: string): File {
  return new File(['x'], name, { type });
}

describe('importFileType', () => {
  it('classifies midi MIME as music (not media)', () => {
    const midi = makeFile('gravity.mid', 'audio/midi');
    expect(isMusicFile(midi)).toBe(true);
    expect(isMediaFile(midi)).toBe(false);
    expect(getImportFileKind(midi)).toBe('music');
  });

  it('classifies midi extension as music', () => {
    const midi = makeFile('gravity.midi', '');
    expect(getImportFileKind(midi)).toBe('music');
  });

  it('classifies mp3 as media', () => {
    const media = makeFile('take.mp3', 'audio/mpeg');
    expect(getImportFileKind(media)).toBe('media');
  });
});

