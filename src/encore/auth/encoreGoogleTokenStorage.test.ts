import { describe, expect, it } from 'vitest';
import {
  clearPersistedGoogleIdentity,
  clearPersistedGoogleSession,
  isLikelyGoogleAuthRejection,
  isPersistedSessionStillFresh,
  readPersistedGoogleIdentity,
  readPersistedGoogleSession,
  writePersistedGoogleIdentity,
  writePersistedGoogleSession,
} from './encoreGoogleTokenStorage';

describe('encoreGoogleTokenStorage', () => {
  it('round-trips and clears', () => {
    clearPersistedGoogleSession();
    expect(readPersistedGoogleSession()).toBeNull();
    writePersistedGoogleSession('tok', 3600);
    const s = readPersistedGoogleSession();
    expect(s?.accessToken).toBe('tok');
    expect(s?.expiresAtMs).toBeGreaterThan(Date.now());
    clearPersistedGoogleSession();
    expect(readPersistedGoogleSession()).toBeNull();
  });

  it('isPersistedSessionStillFresh respects 60s floor', () => {
    expect(
      isPersistedSessionStillFresh(
        { accessToken: 'x', expiresAtMs: Date.now() + 90_000 },
        Date.now(),
      ),
    ).toBe(true);
    expect(
      isPersistedSessionStillFresh(
        { accessToken: 'x', expiresAtMs: Date.now() + 30_000 },
        Date.now(),
      ),
    ).toBe(false);
  });
});

describe('persisted Google identity', () => {
  it('round-trips email + display name and clears independently of the token', () => {
    clearPersistedGoogleIdentity();
    clearPersistedGoogleSession();
    expect(readPersistedGoogleIdentity()).toBeNull();

    writePersistedGoogleSession('tok', 3600);
    writePersistedGoogleIdentity({ email: 'tiff@example.com', displayName: 'Tiff' });
    const id = readPersistedGoogleIdentity();
    expect(id?.email).toBe('tiff@example.com');
    expect(id?.displayName).toBe('Tiff');
    expect(id?.rememberedAtMs).toBeGreaterThan(0);

    // Critical for "stay signed in across token expiry": clearing the token must NOT
    // touch the identity, so the account menu can keep showing who's signed in.
    clearPersistedGoogleSession();
    expect(readPersistedGoogleSession()).toBeNull();
    expect(readPersistedGoogleIdentity()?.email).toBe('tiff@example.com');

    clearPersistedGoogleIdentity();
    expect(readPersistedGoogleIdentity()).toBeNull();
  });

  it('rejects identities without an email', () => {
    clearPersistedGoogleIdentity();
    window.localStorage.setItem(
      'encore_google_identity_v1',
      JSON.stringify({ email: '', displayName: 'X' }),
    );
    expect(readPersistedGoogleIdentity()).toBeNull();
    clearPersistedGoogleIdentity();
  });
});

describe('isLikelyGoogleAuthRejection', () => {
  it('treats userinfo 401/403 and invalid_token as auth rejections', () => {
    expect(isLikelyGoogleAuthRejection(new Error('userinfo failed: 401'))).toBe(true);
    expect(isLikelyGoogleAuthRejection(new Error('userinfo failed: 403'))).toBe(true);
    expect(isLikelyGoogleAuthRejection(new Error('invalid_token'))).toBe(true);
    expect(isLikelyGoogleAuthRejection('Invalid Credentials')).toBe(true);
  });

  it('treats network / timeout / 5xx as transient (do not nuke session)', () => {
    expect(isLikelyGoogleAuthRejection(new Error('userinfo failed: 500'))).toBe(false);
    expect(isLikelyGoogleAuthRejection(new Error('userinfo failed: 503'))).toBe(false);
    expect(isLikelyGoogleAuthRejection(new Error('Failed to fetch'))).toBe(false);
    expect(isLikelyGoogleAuthRejection(new Error('Restoring Google session timed out'))).toBe(false);
    expect(isLikelyGoogleAuthRejection(null)).toBe(false);
    expect(isLikelyGoogleAuthRejection(undefined)).toBe(false);
  });
});
