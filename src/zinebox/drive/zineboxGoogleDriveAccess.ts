import { ensureLabsGoogleAccessTokenForDriveImport } from '../../shared/google/labsGoogleDriveAccess';

export type ZineboxGoogleDriveAccessOptions = {
  interactive?: boolean;
  /**
   * When true, request full Zine Box Drive scopes in one GIS prompt:
   * portfolio backup (`drive.file`) plus folder PDF import (`drive.readonly`).
   */
  upgradeScopes?: boolean;
};

/**
 * Single OAuth entry for Zine Box — portfolio backup and Drive folder import share one token.
 * Always uses GIS on the user click (`skipBff`) so sign-in does not chain through the session BFF.
 */
export async function ensureZineboxGoogleDriveAccess(
  options?: ZineboxGoogleDriveAccessOptions,
): Promise<string> {
  return ensureLabsGoogleAccessTokenForDriveImport({
    interactive: options?.interactive ?? true,
    upgradeScopes: options?.upgradeScopes ?? false,
    skipBff: true,
  });
}

/** Account menu sign-in / reconnect — one prompt for backup + import scopes. */
export async function signInZineboxGoogleDrive(): Promise<string> {
  return ensureZineboxGoogleDriveAccess({ interactive: true, upgradeScopes: true });
}
