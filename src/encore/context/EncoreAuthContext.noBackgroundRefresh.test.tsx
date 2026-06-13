/**
 * Pins the nuclear "no background Google refresh" policy from ADR 0010. The point of these
 * tests is to fail loudly if any future change reintroduces a silent `requestGoogleAccessToken`
 * call from bootstrap, a refresh timer, a visibility listener, or `signInWithGoogle`'s
 * prefetch path. The popup-spam complaint these were causing is documented in the ADR.
 */
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Module mocks (declared before importing the unit under test) ---
vi.mock('../auth/googleTokenClient', () => ({
  requestGoogleAccessToken: vi.fn(),
  revokeGoogleAccessTokenBestEffort: vi.fn(),
}));

vi.mock('../auth/loadGisScript', () => ({
  fetchGoogleUserProfile: vi.fn(),
  friendlyGoogleDisplayName: (p: { name?: string; email?: string }) =>
    p?.name ?? p?.email ?? '',
}));

vi.mock('../auth/hashEmail', () => ({
  parseAllowedEmailHashesFromEnv: () => new Set(['always-allow']),
  sha256HexOfEmail: vi.fn(async () => 'always-allow'),
  isEmailHashAllowed: () => true,
}));

vi.mock('../../shared/session/labsGoogleSessionPort', () => ({
  isLabsGoogleSessionBffEnabled: vi.fn(() => false),
  tryRefreshGoogleAccessTokenViaBff: vi.fn(async () => null),
  signInWithGoogleViaBff: vi.fn(),
  persistLabsGoogleBffSession: vi.fn(),
  signOutGoogleViaBff: vi.fn(async () => undefined),
}));

vi.mock('../../shared/session/useLabsGoogleSessionRefresh', () => ({
  useLabsGoogleSessionRefresh: vi.fn(),
}));

import { requestGoogleAccessToken } from '../auth/googleTokenClient';
import { fetchGoogleUserProfile } from '../auth/loadGisScript';
import {
  clearPersistedGoogleIdentity,
  clearPersistedGoogleSession,
  ENCORE_GOOGLE_SESSION_STORAGE_KEY,
  writePersistedGoogleIdentity,
  writePersistedGoogleSession,
} from '../auth/encoreGoogleTokenStorage';
import { LabsUndoProvider } from '../../shared/undo/LabsUndoContext';
import {
  EncoreAuthProvider,
  useEncoreAuth,
  type EncoreAuthContextValue,
} from './EncoreAuthContext';

function CaptureCtx({ onApi }: { onApi: (v: EncoreAuthContextValue) => void }) {
  const v = useEncoreAuth();
  onApi(v);
  return null;
}

function renderProvider(): () => EncoreAuthContextValue {
  let captured: EncoreAuthContextValue | null = null;
  render(
    <LabsUndoProvider>
      <EncoreAuthProvider>
        <CaptureCtx onApi={(v) => (captured = v)} />
      </EncoreAuthProvider>
    </LabsUndoProvider>,
  );
  return () => {
    if (!captured) throw new Error('Auth context not captured');
    return captured;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  // Provide a non-empty client id so getGoogleClientId() doesn't bail early before running the
  // bootstrap logic. The mocked `requestGoogleAccessToken` ignores it.
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');
  vi.stubEnv('VITE_ALLOWED_EMAIL_HASHES', 'always-allow');
});

afterEach(() => {
  clearPersistedGoogleSession();
  clearPersistedGoogleIdentity();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('EncoreAuthContext — ADR 0010 (no background Google refresh)', () => {
  it('bootstrap with no persisted session never calls requestGoogleAccessToken', async () => {
    const get = renderProvider();
    await waitFor(() => expect(get().googleAuthReady).toBe(true));
    expect(get().googleAccessToken).toBeNull();
    expect(get().googleSessionExpired).toBe(false);
    expect(requestGoogleAccessToken).not.toHaveBeenCalled();
  });

  it('bootstrap with fresh persisted session seeds the token from storage (no GIS calls)', async () => {
    writePersistedGoogleSession('persisted-tok', 3600);
    writePersistedGoogleIdentity({ email: 'me@example.com', displayName: 'Me' });
    const get = renderProvider();
    await waitFor(() => expect(get().googleAuthReady).toBe(true));
    expect(get().googleAccessToken).toBe('persisted-tok');
    expect(get().googleEmail).toBe('me@example.com');
    expect(get().displayName).toBe('Me');
    expect(get().googleSessionExpired).toBe(false);
    expect(requestGoogleAccessToken).not.toHaveBeenCalled();
  });

  it('bootstrap with stale persisted session + remembered identity enters expired mode (no GIS calls)', async () => {
    // Hand-write a stale session that's already past `expiresAtMs - 60s`.
    window.localStorage.setItem(
      ENCORE_GOOGLE_SESSION_STORAGE_KEY,
      JSON.stringify({ accessToken: 'stale', expiresAtMs: Date.now() - 5_000 }),
    );
    writePersistedGoogleIdentity({ email: 'me@example.com', displayName: 'Me' });
    const get = renderProvider();
    await waitFor(() => expect(get().googleAuthReady).toBe(true));
    expect(get().googleAccessToken).toBeNull();
    expect(get().googleSessionExpired).toBe(true);
    expect(requestGoogleAccessToken).not.toHaveBeenCalled();
  });

  it('signInWithGoogle makes exactly one interactive call (no silent prefetch)', async () => {
    vi.mocked(requestGoogleAccessToken).mockResolvedValue({
      access_token: 'fresh-tok',
      expires_in: 3600,
    });
    vi.mocked(fetchGoogleUserProfile).mockResolvedValue({
      email: 'me@example.com',
      name: 'Me',
    } as unknown as Awaited<ReturnType<typeof fetchGoogleUserProfile>>);

    const get = renderProvider();
    await waitFor(() => expect(get().googleAuthReady).toBe(true));

    await act(async () => {
      await get().signInWithGoogle();
    });

    expect(requestGoogleAccessToken).toHaveBeenCalledTimes(1);
    // Crucially, the call did NOT pass `prompt: 'none'` — that would mean a silent prefetch
    // snuck back in. The options object should be empty or only carry `loginHint`.
    const call = vi.mocked(requestGoogleAccessToken).mock.calls[0]!;
    const options = call[2] as { prompt?: string } | undefined;
    expect(options?.prompt).toBeUndefined();
    expect(get().googleAccessToken).toBe('fresh-tok');
  });

  it('does not register a `visibilitychange` listener', async () => {
    const docAddSpy = vi.spyOn(document, 'addEventListener');
    const get = renderProvider();
    await waitFor(() => expect(get().googleAuthReady).toBe(true));
    const visibilityRegistrations = docAddSpy.mock.calls.filter(
      ([type]) => type === 'visibilitychange',
    );
    expect(visibilityRegistrations).toHaveLength(0);
    docAddSpy.mockRestore();
  });

  it('a sibling-tab `storage` event with a fresh persisted session restores the token without GIS', async () => {
    const get = renderProvider();
    await waitFor(() => expect(get().googleAuthReady).toBe(true));
    expect(get().googleAccessToken).toBeNull();

    await act(async () => {
      // Simulate tab A's interactive sign-in writing to localStorage.
      writePersistedGoogleSession('sibling-tab-tok', 3600);
      writePersistedGoogleIdentity({ email: 'me@example.com', displayName: 'Me' });
      // jsdom's native `storage` event would only fire in OTHER tabs; dispatch one manually
      // to simulate that exact scenario.
      window.dispatchEvent(
        new StorageEvent('storage', { key: ENCORE_GOOGLE_SESSION_STORAGE_KEY }),
      );
      // Let React flush the state update inside the listener.
      await Promise.resolve();
    });

    expect(get().googleAccessToken).toBe('sibling-tab-tok');
    expect(get().googleEmail).toBe('me@example.com');
    expect(get().googleSessionExpired).toBe(false);
    expect(requestGoogleAccessToken).not.toHaveBeenCalled();
  });

  it('local expiry-tick flips into expired mode without calling GIS', async () => {
    // Persist a session whose effective expiry boundary is two minutes away. The expiry-tick
    // effect schedules at `expiresAtMs - 60_000`, so the tick should fire just under that.
    const expiresAtMs = Date.now() + 2 * 60 * 1000;
    window.localStorage.setItem(
      ENCORE_GOOGLE_SESSION_STORAGE_KEY,
      JSON.stringify({ accessToken: 'about-to-expire', expiresAtMs }),
    );
    writePersistedGoogleIdentity({ email: 'me@example.com', displayName: 'Me' });

    vi.useFakeTimers({ shouldAdvanceTime: true });
    const get = renderProvider();
    await waitFor(() => expect(get().googleAuthReady).toBe(true));
    expect(get().googleAccessToken).toBe('about-to-expire');
    expect(get().googleSessionExpired).toBe(false);

    await act(async () => {
      // Fast-forward past the scheduled tick.
      vi.advanceTimersByTime(2 * 60 * 1000);
      await Promise.resolve();
    });

    expect(get().googleSessionExpired).toBe(true);
    expect(get().googleAccessToken).toBeNull();
    expect(requestGoogleAccessToken).not.toHaveBeenCalled();
  });
});
