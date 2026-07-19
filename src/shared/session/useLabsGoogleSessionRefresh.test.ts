import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLabsGoogleSessionRefresh } from './useLabsGoogleSessionRefresh';
import {
  clearPersistedGoogleSession,
  writePersistedGoogleSession,
} from '../google/encoreGoogleTokenStorage';

// writePersistedGoogleSession(token, 3600) stores expiry at now + 3300s (300s buffer);
// the hook refreshes 300s before that → first timer fires at +3000s.
const FIRST_REFRESH_DELAY_MS = 3_000_000;

function okTokenResponse(token: string): Response {
  return new Response(
    JSON.stringify({ access_token: token, expires_in: 3600, email: 'me@example.com' }),
    { status: 200 },
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('VITE_LABS_SESSION_BFF_URL', 'http://127.0.0.1:8787');
});

afterEach(() => {
  clearPersistedGoogleSession();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useLabsGoogleSessionRefresh', () => {
  it('refreshes before expiry and re-arms for the next token lifetime', async () => {
    writePersistedGoogleSession('tok-0', 3600);
    const onRefreshed = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(okTokenResponse('tok-1'));

    renderHook(() => useLabsGoogleSessionRefresh(onRefreshed));
    expect(fetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(FIRST_REFRESH_DELAY_MS);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onRefreshed).toHaveBeenCalledWith('tok-1');

    // Regression: the timer must re-arm from the *new* expiry in the same tab
    // (it previously fired once and only re-armed on cross-tab storage events).
    vi.mocked(fetch).mockResolvedValueOnce(okTokenResponse('tok-2'));
    await vi.advanceTimersByTimeAsync(FIRST_REFRESH_DELAY_MS);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onRefreshed).toHaveBeenCalledWith('tok-2');
  });

  it('retries with backoff after a failed refresh', async () => {
    writePersistedGoogleSession('tok-0', 3600);
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    renderHook(() => useLabsGoogleSessionRefresh());
    await vi.advanceTimersByTimeAsync(FIRST_REFRESH_DELAY_MS);
    expect(fetch).toHaveBeenCalledTimes(1);

    vi.mocked(fetch).mockResolvedValueOnce(okTokenResponse('tok-1'));
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('skips the network call when another tab already refreshed', async () => {
    writePersistedGoogleSession('tok-0', 120);
    renderHook(() => useLabsGoogleSessionRefresh());
    // Sibling tab refreshes (storage event re-schedules from the fresh expiry).
    writePersistedGoogleSession('tok-1', 3600);
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'encore_google_oauth_v1' }),
    );
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch).not.toHaveBeenCalled();
  });
});
