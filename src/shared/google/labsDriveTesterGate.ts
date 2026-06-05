import { parseAllowedEmailHashesFromEnv, sha256HexOfEmail } from '../auth/hashEmail';

/**
 * Optional restriction list for Stanza / Scales Drive backup (`VITE_LABS_DRIVE_TESTER_HASHES`).
 * When unset, any signed-in Google user may use Drive backup (GA default).
 *
 * `resolveLabsDriveTesterHashSets` remains for legacy Encore allowlist fallback in tests only.
 */
export function resolveLabsDriveTesterHashSets(
  viteLabsDriveTesterHashes: string | undefined,
  viteAllowedEmailHashes: string | undefined,
): Set<string> {
  const drive = parseAllowedEmailHashesFromEnv(viteLabsDriveTesterHashes);
  if (drive.size > 0) return drive;
  return parseAllowedEmailHashesFromEnv(viteAllowedEmailHashes);
}

/** Optional deploy-time restriction; empty set means backup is open to all signed-in users. */
export function getLabsDriveBackupRestrictionHashesFromEnv(): Set<string> {
  return parseAllowedEmailHashesFromEnv(
    import.meta.env.VITE_LABS_DRIVE_TESTER_HASHES as string | undefined,
  );
}

export async function isEmailAllowedLabsDriveBackup(email: string): Promise<boolean> {
  if (!email.trim()) return false;
  const allowed = getLabsDriveBackupRestrictionHashesFromEnv();
  if (allowed.size === 0) return true;
  const hash = await sha256HexOfEmail(email);
  return allowed.has(hash.toLowerCase());
}
