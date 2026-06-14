import {
  isPersistedSessionStillFresh,
  readPersistedGoogleSession,
} from '../../shared/google/encoreGoogleTokenStorage';
import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';

/** Best-effort Drive token for background image loads (previews, session). */
export async function readGestureDriveAccessToken(): Promise<string | null> {
  try {
    return await ensureLabsGoogleAccessTokenForDrive({ interactive: false });
  } catch {
    const session = readPersistedGoogleSession();
    if (session && isPersistedSessionStillFresh(session)) {
      return session.accessToken;
    }
    return session?.accessToken ?? null;
  }
}
