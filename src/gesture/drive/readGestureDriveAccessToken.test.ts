import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import {
  clearPersistedGoogleSession,
  writePersistedGoogleSession,
} from '../../shared/google/encoreGoogleTokenStorage';
import {
  readGestureDriveAccessToken,
  resetGestureDriveAccessTokenFlight,
} from './readGestureDriveAccessToken';

vi.mock('../../shared/google/labsGoogleDriveAccess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/google/labsGoogleDriveAccess')>();
  return {
    ...actual,
    ensureLabsGoogleAccessTokenForDrive: vi.fn(),
  };
});

import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';

describe('readGestureDriveAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPersistedGoogleSession();
    resetGestureDriveAccessTokenFlight();
  });

  afterEach(() => {
    resetGestureDriveAccessTokenFlight();
  });

  it('returns a token from ensureLabsGoogleAccessTokenForDrive', async () => {
    vi.mocked(ensureLabsGoogleAccessTokenForDrive).mockResolvedValue('good-token');
    await expect(readGestureDriveAccessToken()).resolves.toBe('good-token');
  });

  it('does not return a stale persisted token when ensure fails', async () => {
    writePersistedGoogleSession('expired-but-clock-fresh', 3600);
    vi.mocked(ensureLabsGoogleAccessTokenForDrive).mockRejectedValue(
      new LabsGoogleInteractiveAuthRequiredError(),
    );

    await expect(readGestureDriveAccessToken()).resolves.toBeNull();
  });

  it('dedupes concurrent reads via single-flight', async () => {
    let resolveEnsure!: (value: string) => void;
    vi.mocked(ensureLabsGoogleAccessTokenForDrive).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveEnsure = resolve;
        }),
    );

    const first = readGestureDriveAccessToken();
    const second = readGestureDriveAccessToken();
    resolveEnsure('shared-token');

    await expect(Promise.all([first, second])).resolves.toEqual(['shared-token', 'shared-token']);
    expect(ensureLabsGoogleAccessTokenForDrive).toHaveBeenCalledTimes(1);
  });
});
