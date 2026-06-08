import { describe, expect, it } from 'vitest';
import {
  encoreDrivePlaybackKind,
  encoreMediaPlaybackSupportsLoop,
  encoreMediaPlaybackSupportsSpeed,
  encoreMediaPlaybackSupportsTranspose,
  isEncorePlayableDriveMime,
  resolveEncoreDriveMediaMime,
} from './encorePlayableMedia';
import {
  encoreMediaTargetFromDriveFile,
  encoreMediaTargetFromMediaLink,
  encoreMediaTargetFromMiscResource,
} from './encoreMediaPlaybackTargets';

describe('encorePlayableMedia', () => {
  it('detects playable drive mime types', () => {
    expect(isEncorePlayableDriveMime('audio/mpeg')).toBe(true);
    expect(isEncorePlayableDriveMime('audio/mp4')).toBe(true);
    expect(isEncorePlayableDriveMime('video/mp4')).toBe(true);
    expect(isEncorePlayableDriveMime('application/octet-stream')).toBe(false);
    expect(isEncorePlayableDriveMime('application/pdf')).toBe(false);
  });

  it('infers Logic-style m4a from filename when Drive uses octet-stream', () => {
    expect(
      resolveEncoreDriveMediaMime({
        fileName: 'Bounce 1.m4a',
        mimeType: 'application/octet-stream',
      }),
    ).toBe('audio/mp4');
  });

  it('prefers .m4a extension over misleading video/mp4 from Drive', () => {
    expect(
      resolveEncoreDriveMediaMime({
        fileName: 'Meet me on the moon.m4a',
        mimeType: 'video/mp4',
      }),
    ).toBe('audio/mp4');
  });

  it('maps drive mime to playback kind', () => {
    expect(encoreDrivePlaybackKind('audio/wav')).toBe('drive-audio');
    expect(encoreDrivePlaybackKind('audio/mp4')).toBe('drive-audio');
    expect(encoreDrivePlaybackKind('video/quicktime')).toBe('drive-video');
    expect(encoreDrivePlaybackKind('application/pdf')).toBeNull();
  });

  it('declares control support by kind', () => {
    expect(encoreMediaPlaybackSupportsSpeed('youtube')).toBe(true);
    expect(encoreMediaPlaybackSupportsSpeed('spotify')).toBe(false);
    expect(encoreMediaPlaybackSupportsTranspose('drive-audio')).toBe(true);
    expect(encoreMediaPlaybackSupportsTranspose('drive-video')).toBe(false);
    expect(encoreMediaPlaybackSupportsLoop('spotify')).toBe(false);
  });
});

describe('encoreMediaPlaybackTargets', () => {
  it('builds spotify target from media link', () => {
    const target = encoreMediaTargetFromMediaLink(
      { id: '1', source: 'spotify', spotifyTrackId: 'abc' },
      'Track title',
    );
    expect(target?.kind).toBe('spotify');
    expect(target?.spotifyTrackId).toBe('abc');
  });

  it('builds misc audio resource target', () => {
    const target = encoreMediaTargetFromMiscResource({
      id: 'm1',
      kind: 'audio',
      label: 'Warmup',
      driveFileId: 'drive123',
      createdAt: '2020-01-01T00:00:00.000Z',
    });
    expect(target?.kind).toBe('drive-audio');
    expect(target?.driveFileId).toBe('drive123');
  });

  it('builds drive target for m4a stored with octet-stream mime', () => {
    const target = encoreMediaTargetFromDriveFile({
      playbackId: 'drive:abc',
      title: 'Logic bounce.m4a',
      driveFileId: 'abc',
      mimeType: 'application/octet-stream',
    });
    expect(target?.kind).toBe('drive-audio');
    expect(target?.mimeType).toBe('audio/mp4');
  });

  it('builds drive target for m4a when Drive metadata says video/mp4', () => {
    const target = encoreMediaTargetFromDriveFile({
      playbackId: 'drive:abc',
      title: 'Meet me on the moon.m4a',
      driveFileId: 'abc',
      mimeType: 'video/mp4',
    });
    expect(target?.kind).toBe('drive-audio');
    expect(target?.mimeType).toBe('audio/mp4');
  });

  it('builds misc audio target when label has m4a extension and mime is octet-stream', () => {
    const target = encoreMediaTargetFromMiscResource({
      id: 'm2',
      kind: 'audio',
      label: 'Demo take.m4a',
      driveFileId: 'drive456',
      mimeType: 'application/octet-stream',
      createdAt: '2020-01-01T00:00:00.000Z',
    });
    expect(target?.kind).toBe('drive-audio');
    expect(target?.mimeType).toBe('audio/mp4');
  });
});
