import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildPublicDriveAltMediaUrl,
  buildPublicDriveFileMetadataUrl,
  isPublicDriveGuestFetchConfigured,
  shouldUsePublicDriveSameOriginProxy,
} from './buildPublicDriveAltMediaUrl';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isPublicDriveGuestFetchConfigured', () => {
  it('is false in test mode without an API key', () => {
    vi.stubEnv('VITE_GOOGLE_API_KEY', '');
    expect(isPublicDriveGuestFetchConfigured()).toBe(false);
  });

  it('is true when an API key is set', () => {
    vi.stubEnv('VITE_GOOGLE_API_KEY', 'sample-key');
    expect(isPublicDriveGuestFetchConfigured()).toBe(true);
  });
});

describe('shouldUsePublicDriveSameOriginProxy', () => {
  it('is false in test mode (vitest)', () => {
    expect(shouldUsePublicDriveSameOriginProxy()).toBe(false);
  });
});

describe('buildPublicDriveAltMediaUrl', () => {
  it('embeds API key for direct googleapis URL when proxy is off (test mode)', () => {
    const u = buildPublicDriveAltMediaUrl('fileId1', 'myKey');
    expect(u).toContain('https://www.googleapis.com/drive/v3/files/fileId1');
    expect(u).toContain('alt=media');
    expect(u).toContain('supportsAllDrives=false');
    expect(u).toContain(encodeURIComponent('myKey'));
    expect(buildPublicDriveAltMediaUrl('x', 'k', { supportsAllDrives: true })).toContain('supportsAllDrives=true');
  });

  it('buildPublicDriveFileMetadataUrl uses direct googleapis in test mode', () => {
    const u = buildPublicDriveFileMetadataUrl('metaFile', 'k2');
    expect(u).toContain('https://www.googleapis.com/drive/v3/files/metaFile');
    expect(u).toContain('fields=');
    expect(u).toContain(encodeURIComponent('k2'));
  });
});
