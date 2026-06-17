import { useEffect, useState } from 'react';

import {
  isPersistedSessionStillFresh,
  readPersistedGoogleSession,
} from '../../shared/google/encoreGoogleTokenStorage';
import { useLabsEncoreGoogleIdentity } from '../../shared/google/useLabsEncoreGoogleSession';

/** Returns a fresh access token when the persisted Labs Google session is still valid. */
export function useZineboxGoogleAccessToken(): string | null {
  const identity = useLabsEncoreGoogleIdentity();
  const [token, setToken] = useState<string | null>(() => readFreshGoogleAccessToken());

  useEffect(() => {
    setToken(readFreshGoogleAccessToken());
  }, [identity?.email]);

  return token;
}

function readFreshGoogleAccessToken(): string | null {
  const stored = readPersistedGoogleSession();
  if (stored && isPersistedSessionStillFresh(stored)) {
    return stored.accessToken;
  }
  return null;
}
