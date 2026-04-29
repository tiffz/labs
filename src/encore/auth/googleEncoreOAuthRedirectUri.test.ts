import { describe, expect, it, vi } from 'vitest';
import { googleEncoreOAuthRedirectUri } from './googleEncoreOAuthRedirectUri';

describe('googleEncoreOAuthRedirectUri', () => {
  it('returns origin + /encore without trailing slash', () => {
    vi.stubGlobal('location', { origin: 'http://127.0.0.1:5173' } as Location);
    expect(googleEncoreOAuthRedirectUri()).toBe('http://127.0.0.1:5173/encore');
    vi.unstubAllGlobals();
  });
});
