import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildPublicDriveAltMediaUrl,
  buildPublicDriveFileMetadataUrl,
  isPublicDriveGuestFetchConfigured,
  resolvePublicDriveFetchRoute,
  shouldUsePublicDriveSameOriginProxy,
} from './buildPublicDriveAltMediaUrl';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isPublicDriveGuestFetchConfigured', () => {
  it('is false in test mode without an API key or BFF', () => {
    vi.stubEnv('VITE_GOOGLE_API_KEY', '');
    vi.stubEnv('VITE_LABS_SESSION_BFF_URL', '');
    expect(isPublicDriveGuestFetchConfigured()).toBe(false);
  });

  it('is true when an API key is set', () => {
    vi.stubEnv('VITE_GOOGLE_API_KEY', 'sample-key');
    expect(isPublicDriveGuestFetchConfigured()).toBe(true);
  });

  it('is true in production mode when session BFF URL is set', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_GOOGLE_API_KEY', '');
    vi.stubEnv('VITE_LABS_SESSION_BFF_URL', 'https://labs-session-bff.example.workers.dev');
    expect(isPublicDriveGuestFetchConfigured()).toBe(true);
  });
});

describe('resolvePublicDriveFetchRoute', () => {
  it('is direct in test mode', () => {
    expect(resolvePublicDriveFetchRoute()).toBe('direct');
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

  it('uses session BFF proxy in production when BFF URL is set', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_LABS_SESSION_BFF_URL', 'https://labs-session-bff.example.workers.dev/');
    const u = buildPublicDriveAltMediaUrl('fileId1', '');
    expect(u).toBe(
      'https://labs-session-bff.example.workers.dev/v1/public-drive/files/fileId1/media?supportsAllDrives=false',
    );
  });

  it('buildPublicDriveFileMetadataUrl uses BFF meta route in production', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_LABS_SESSION_BFF_URL', 'https://labs-session-bff.example.workers.dev');
    const u = buildPublicDriveFileMetadataUrl('metaFile', '');
    expect(u).toBe(
      'https://labs-session-bff.example.workers.dev/v1/public-drive/files/metaFile/meta?supportsAllDrives=false',
    );
  });

  it('buildPublicDriveFileMetadataUrl uses direct googleapis in test mode', () => {
    const u = buildPublicDriveFileMetadataUrl('metaFile', 'k2');
    expect(u).toContain('https://www.googleapis.com/drive/v3/files/metaFile');
    expect(u).toContain('fields=');
    expect(u).toContain(encodeURIComponent('k2'));
  });
});
