import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveLabsGoogleOAuthRedirectUri } from './labsGoogleOAuthRedirectUri';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('resolveLabsGoogleOAuthRedirectUri', () => {
  it('uses VITE_GOOGLE_OAUTH_REDIRECT_URI when set', () => {
    vi.stubEnv('VITE_GOOGLE_OAUTH_REDIRECT_URI', 'https://example.com/custom');
    expect(resolveLabsGoogleOAuthRedirectUri()).toBe('https://example.com/custom');
  });

  it('returns origin + /encore when env unset (canonical redirect from any Labs path)', () => {
    vi.stubEnv('VITE_GOOGLE_OAUTH_REDIRECT_URI', '');
    vi.stubGlobal('location', {
      origin: 'http://127.0.0.1:5173',
      pathname: '/stanza/',
    } as Location);
    expect(resolveLabsGoogleOAuthRedirectUri()).toBe('http://127.0.0.1:5173/encore');
  });

  it('still returns /encore from encore pathname when env unset', () => {
    vi.stubEnv('VITE_GOOGLE_OAUTH_REDIRECT_URI', '');
    vi.stubGlobal('location', {
      origin: 'https://labs.tiffzhang.com',
      pathname: '/encore/library',
    } as Location);
    expect(resolveLabsGoogleOAuthRedirectUri()).toBe('https://labs.tiffzhang.com/encore');
  });
});
