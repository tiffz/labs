import {
  ensureLabsGoogleAccessTokenForDrive,
} from '../../shared/google/labsGoogleDriveAccess';

let tokenInFlight: Promise<string | null> | null = null;

/** Best-effort Drive token for background image loads (previews, session). Single-flight per tab. */
export async function readGestureDriveAccessToken(): Promise<string | null> {
  if (tokenInFlight) return tokenInFlight;

  tokenInFlight = (async () => {
    try {
      return await ensureLabsGoogleAccessTokenForDrive({ interactive: false });
    } catch {
      // Never return a clock-fresh but revoked token — that causes 401 storms on preview grids.
      return null;
    } finally {
      tokenInFlight = null;
    }
  })();

  return tokenInFlight;
}

/** Clear single-flight state after sign-in/out (optional). */
export function resetGestureDriveAccessTokenFlight(): void {
  tokenInFlight = null;
}
