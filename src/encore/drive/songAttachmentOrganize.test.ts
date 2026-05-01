import { describe, expect, it } from 'vitest';
import { buildSongAttachmentDriveName } from './songAttachmentOrganize';

describe('buildSongAttachmentDriveName', () => {
  it('uses title, artist, and extension for charts without a key', () => {
    expect(
      buildSongAttachmentDriveName(
        { title: 'Hello', artist: 'World', performanceKey: undefined },
        { kind: 'chart' },
        '.pdf',
      ),
    ).toBe('Hello - World.pdf');
  });

  it('appends performance key for charts when set', () => {
    expect(
      buildSongAttachmentDriveName(
        { title: 'Song', artist: 'Artist', performanceKey: 'A major' },
        { kind: 'chart' },
        '.pdf',
      ),
    ).toBe('Song - Artist - A major.pdf');
  });

  it('does not append key for recordings', () => {
    expect(
      buildSongAttachmentDriveName(
        { title: 'A', artist: 'B', performanceKey: 'C major' },
        { kind: 'recording' },
        '.m4a',
      ),
    ).toBe('A - B.m4a');
  });

  it('does not append key for backing tracks', () => {
    expect(
      buildSongAttachmentDriveName(
        { title: 'A', artist: 'B', performanceKey: 'C major' },
        { kind: 'backing' },
        '.mp3',
      ),
    ).toBe('A - B.mp3');
  });
});
