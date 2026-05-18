/**
 * Pins the nuclear "no background Google refresh" policy for the **shared Labs** Google sign-in
 * layer used by Stanza and Scales (and called from Encore via the cohabitation pathway). The
 * Encore-side policy lives in ADR 0010; this test file is the watchdog for the extension to the
 * cohabiting apps documented in ADR 0011.
 *
 * Two regressions this file fails loudly on:
 *
 *   1. `useLabsEncoreGoogleIdentity` ever calling Google Identity Services on mount.
 *   2. `ensureLabsGoogleAccessTokenForDrive` ever issuing a `prompt: 'none'` silent token request
 *      (the documented source of ghost iframes / phantom popups across Stanza / Scales tabs).
 */
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./googleTokenClient', () => ({
  requestGoogleAccessToken: vi.fn(),
  revokeGoogleAccessTokenBestEffort: vi.fn(),
}));

vi.mock('./loadGisScript', () => ({
  fetchGoogleUserProfile: vi.fn(),
  friendlyGoogleDisplayName: (p: { name?: string; email?: string }) => p?.name ?? p?.email ?? '',
  loadGoogleIdentityScript: vi.fn().mockResolvedValue(undefined),
}));

import { requestGoogleAccessToken } from './googleTokenClient';
import { fetchGoogleUserProfile } from './loadGisScript';
import {
  clearPersistedGoogleIdentity,
  clearPersistedGoogleSession,
  ENCORE_GOOGLE_SESSION_STORAGE_KEY,
  writePersistedGoogleIdentity,
  writePersistedGoogleSession,
} from './encoreGoogleTokenStorage';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from './labsGoogleDriveAccess';
import { useLabsEncoreGoogleIdentity } from './useLabsEncoreGoogleSession';

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');
});

afterEach(() => {
  // Explicit testing-library cleanup: the repo's vitest setupFile does not auto-call
  // `cleanup()`, so without this the previous test's renderHook leaves window listeners wired
  // up — and a subsequent `writePersistedGoogleIdentity` (which fires the same-tab change event)
  // would call refresh() on the unmounted hook and trigger a stray `act()` warning.
  cleanup();
  clearPersistedGoogleSession();
  clearPersistedGoogleIdentity();
  vi.unstubAllEnvs();
});

describe('useLabsEncoreGoogleIdentity — ADR 0011 (no background Google refresh)', () => {
  it('mounts without any identity persisted and never calls GIS', () => {
    const { result } = renderHook(() => useLabsEncoreGoogleIdentity());
    expect(result.current).toBeNull();
    expect(requestGoogleAccessToken).not.toHaveBeenCalled();
  });

  it('picks up an identity persisted before mount without calling GIS', () => {
    writePersistedGoogleIdentity({ email: 'me@example.com', displayName: 'Me' });
    const { result } = renderHook(() => useLabsEncoreGoogleIdentity());
    expect(result.current?.email).toBe('me@example.com');
    expect(requestGoogleAccessToken).not.toHaveBeenCalled();
  });

  it('does not register a `visibilitychange` listener (mirrors ADR 0010 Encore guarantee)', () => {
    const docAddSpy = vi.spyOn(document, 'addEventListener');
    renderHook(() => useLabsEncoreGoogleIdentity());
    const visibilityRegistrations = docAddSpy.mock.calls.filter(
      ([type]) => type === 'visibilitychange',
    );
    expect(visibilityRegistrations).toHaveLength(0);
    expect(requestGoogleAccessToken).not.toHaveBeenCalled();
    docAddSpy.mockRestore();
  });
});

describe('ensureLabsGoogleAccessTokenForDrive — ADR 0011 (no silent prompt:"none" path)', () => {
  it('returns the persisted token when fresh, via userinfo only (no GIS)', async () => {
    writePersistedGoogleSession('fresh-stored-tok', 3600);
    vi.mocked(fetchGoogleUserProfile).mockResolvedValue({
      email: 'me@example.com',
      name: 'Me',
    } as unknown as Awaited<ReturnType<typeof fetchGoogleUserProfile>>);

    const tok = await ensureLabsGoogleAccessTokenForDrive({ interactive: false });
    expect(tok).toBe('fresh-stored-tok');
    expect(fetchGoogleUserProfile).toHaveBeenCalledTimes(1);
    expect(requestGoogleAccessToken).not.toHaveBeenCalled();
  });

  it('throws LabsGoogleInteractiveAuthRequiredError when stale + interactive: false (no silent attempt)', async () => {
    // Persist a session whose expiresAtMs is in the past — `isPersistedSessionStillFresh` will
    // reject it without any GIS call.
    window.localStorage.setItem(
      ENCORE_GOOGLE_SESSION_STORAGE_KEY,
      JSON.stringify({ accessToken: 'stale', expiresAtMs: Date.now() - 10_000 }),
    );

    await expect(
      ensureLabsGoogleAccessTokenForDrive({ interactive: false }),
    ).rejects.toBeInstanceOf(LabsGoogleInteractiveAuthRequiredError);
    expect(requestGoogleAccessToken).not.toHaveBeenCalled();
  });

  it('throws LabsGoogleInteractiveAuthRequiredError when nothing is persisted + interactive: false', async () => {
    await expect(
      ensureLabsGoogleAccessTokenForDrive({ interactive: false }),
    ).rejects.toBeInstanceOf(LabsGoogleInteractiveAuthRequiredError);
    expect(requestGoogleAccessToken).not.toHaveBeenCalled();
  });

  it('opens exactly one GIS popup on interactive: true (no silent prefetch first)', async () => {
    vi.mocked(requestGoogleAccessToken).mockResolvedValue({
      access_token: 'interactive-tok',
      expires_in: 3600,
    });
    vi.mocked(fetchGoogleUserProfile).mockResolvedValue({
      email: 'me@example.com',
      name: 'Me',
    } as unknown as Awaited<ReturnType<typeof fetchGoogleUserProfile>>);

    const tok = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
    expect(tok).toBe('interactive-tok');
    expect(requestGoogleAccessToken).toHaveBeenCalledTimes(1);
    // Crucially: the single call did NOT pass `prompt: 'none'`. If a silent path snuck back in,
    // we'd see two calls (silent then interactive) — or a single call with `prompt: 'none'`.
    const opts = vi.mocked(requestGoogleAccessToken).mock.calls[0]![2] as
      | { prompt?: string }
      | undefined;
    expect(opts?.prompt).toBeUndefined();
  });
});
