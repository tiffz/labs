import { describe, expect, it } from 'vitest';
import {
  clearPersistedGoogleSession,
  isPersistedSessionStillFresh,
  readPersistedGoogleSession,
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
