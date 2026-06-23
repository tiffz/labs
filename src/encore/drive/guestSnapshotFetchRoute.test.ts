import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPublicDriveAltMediaUrl } from '../../shared/drive/buildPublicDriveAltMediaUrl';

describe('guest snapshot fetch URLs', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses session BFF in production builds (never direct googleapis)', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_LABS_SESSION_BFF_URL', 'https://labs-session-bff.example.workers.dev');
    vi.stubEnv('VITE_GOOGLE_API_KEY', '');
    const url = buildPublicDriveAltMediaUrl('snapFile123', '');
    expect(url).toContain('labs-session-bff.example.workers.dev/v1/public-drive/files/');
    expect(url).not.toContain('googleapis.com');
  });

  it('uses direct googleapis only in test mode fallback', () => {
    const url = buildPublicDriveAltMediaUrl('snapFile123', 'test-key');
    expect(url).toContain('https://www.googleapis.com/drive/v3/files/');
    expect(url).toContain(encodeURIComponent('test-key'));
  });
});
