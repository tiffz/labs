import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildPublicDriveAltMediaUrl,
  buildPublicDriveFileMetadataUrl,
  shouldUsePublicDriveSameOriginProxy,
} from './buildPublicDriveAltMediaUrl';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('shouldUsePublicDriveSameOriginProxy', () => {
  it('is off in test mode without VITE_ENCORE_DRIVE_PUBLIC_PROXY', () => {
    vi.stubEnv('VITE_ENCORE_DRIVE_PUBLIC_PROXY', '');
    expect(shouldUsePublicDriveSameOriginProxy()).toBe(false);
  });

  it('is on when VITE_ENCORE_DRIVE_PUBLIC_PROXY is truthy', () => {
    vi.stubEnv('VITE_ENCORE_DRIVE_PUBLIC_PROXY', '1');
    expect(shouldUsePublicDriveSameOriginProxy()).toBe(true);
  });
});

describe('buildPublicDriveAltMediaUrl', () => {
  it('embeds API key for direct googleapis URL when proxy is off', () => {
    vi.stubEnv('VITE_ENCORE_DRIVE_PUBLIC_PROXY', '');
    const u = buildPublicDriveAltMediaUrl('fileId1', 'myKey');
    expect(u).toContain('https://www.googleapis.com/drive/v3/files/fileId1');
    expect(u).toContain('alt=media');
    expect(u).toContain('supportsAllDrives=false');
    expect(u).toContain(encodeURIComponent('myKey'));
    expect(buildPublicDriveAltMediaUrl('x', 'k', { supportsAllDrives: true })).toContain('supportsAllDrives=true');
  });

  it('uses VITE_ENCORE_DRIVE_PUBLIC_PROXY_BASE when proxy is enabled', () => {
    vi.stubEnv('VITE_ENCORE_DRIVE_PUBLIC_PROXY', '1');
    vi.stubEnv('VITE_ENCORE_DRIVE_PUBLIC_PROXY_BASE', 'https://edge.example');
    expect(buildPublicDriveAltMediaUrl('ab_cd-1', 'ignored')).toBe(
      'https://edge.example/__encore/drive-public/ab_cd-1',
    );
    expect(buildPublicDriveFileMetadataUrl('x', 'ignored')).toBe(
      'https://edge.example/__encore/drive-public-meta/x',
    );
  });

  it('uses window.location.origin when proxy is on and base is unset', () => {
    vi.stubEnv('VITE_ENCORE_DRIVE_PUBLIC_PROXY', 'true');
    vi.stubEnv('VITE_ENCORE_DRIVE_PUBLIC_PROXY_BASE', '');
    const u = buildPublicDriveAltMediaUrl('snap', 'k');
    expect(u).toMatch(/^https?:\/\/[^/]+\/__encore\/drive-public\/snap$/);
  });
});
