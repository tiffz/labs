import { describe, expect, it } from 'vitest';
import { isVideoLinkInputDirty, videoToLinkInput } from './performanceVideoLinkInput';

describe('videoToLinkInput', () => {
  it('prefers external url, then target id, then shortcut id', () => {
    expect(
      videoToLinkInput({
        externalVideoUrl: 'https://youtu.be/x',
        videoTargetDriveFileId: 'target',
        videoShortcutDriveFileId: 'shortcut',
      }),
    ).toBe('https://youtu.be/x');

    expect(videoToLinkInput({ videoTargetDriveFileId: 'target', videoShortcutDriveFileId: 'shortcut' })).toBe(
      'target',
    );

    expect(videoToLinkInput({ videoShortcutDriveFileId: 'shortcut-only' })).toBe('shortcut-only');
  });
});

describe('isVideoLinkInputDirty', () => {
  it('detects trimmed changes', () => {
    const video = { id: 'v1', videoTargetDriveFileId: 'abc123', createdAt: '2026-06-01T00:00:00.000Z' };
    expect(isVideoLinkInputDirty(video, 'abc123')).toBe(false);
    expect(isVideoLinkInputDirty(video, ' abc123 ')).toBe(false);
    expect(isVideoLinkInputDirty(video, 'xyz')).toBe(true);
  });
});
