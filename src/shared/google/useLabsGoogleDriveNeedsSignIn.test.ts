import { afterEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  ENCORE_GOOGLE_SESSION_STORAGE_KEY,
  writePersistedGoogleIdentity,
  writePersistedGoogleSession,
} from './encoreGoogleTokenStorage';
import { useLabsGoogleDriveNeedsSignIn } from './useLabsGoogleDriveNeedsSignIn';

/** CodeQL models StorageEvent as 1-arg; build a storage event without init-dict args. */
function makeStorageEvent(key: string, newValue: string | null): Event {
  const event = new Event('storage');
  Object.defineProperty(event, 'key', { value: key });
  Object.defineProperty(event, 'newValue', { value: newValue });
  return event;
}

describe('useLabsGoogleDriveNeedsSignIn', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('returns false when there is no persisted identity', () => {
    const { result } = renderHook(() => useLabsGoogleDriveNeedsSignIn(false));
    expect(result.current).toBe(false);
  });

  it('returns true when identity exists but the session is expired', () => {
    writePersistedGoogleIdentity({ email: 'user@example.com', displayName: 'User' });
    writePersistedGoogleSession('stale-token', -120);
    const { result } = renderHook(() => useLabsGoogleDriveNeedsSignIn(true));
    expect(result.current).toBe(true);
  });

  it('returns false when identity and session are fresh', () => {
    writePersistedGoogleIdentity({ email: 'user@example.com', displayName: 'User' });
    writePersistedGoogleSession('fresh-token', 3600);
    const { result } = renderHook(() => useLabsGoogleDriveNeedsSignIn(true));
    expect(result.current).toBe(false);
  });

  it('refreshes after oauth storage changes in another tab', () => {
    writePersistedGoogleIdentity({ email: 'user@example.com', displayName: 'User' });
    writePersistedGoogleSession('stale-token', -120);
    const { result } = renderHook(() => useLabsGoogleDriveNeedsSignIn(true));
    expect(result.current).toBe(true);

    writePersistedGoogleSession('fresh-token', 3600);
    act(() => {
      window.dispatchEvent(
        makeStorageEvent(
          ENCORE_GOOGLE_SESSION_STORAGE_KEY,
          localStorage.getItem(ENCORE_GOOGLE_SESSION_STORAGE_KEY),
        ),
      );
    });
    expect(result.current).toBe(false);
  });
});
