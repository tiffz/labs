import { parseAllowedEmailHashesFromEnv, sha256HexOfEmail } from '../auth/hashEmail';

/**
 * Drive backup (`VITE_LABS_DRIVE_TESTER_HASHES`) may be unset in CI while Encore sign-in allowlist
 * (`VITE_ALLOWED_EMAIL_HASHES`) is set. Fall back so testers do not need duplicate secrets.
 */
export function resolveLabsDriveTesterHashSets(
  viteLabsDriveTesterHashes: string | undefined,
  viteAllowedEmailHashes: string | undefined,
): Set<string> {
  const drive = parseAllowedEmailHashesFromEnv(viteLabsDriveTesterHashes);
  if (drive.size > 0) return drive;
  return parseAllowedEmailHashesFromEnv(viteAllowedEmailHashes);
}

export function getLabsDriveTesterHashesFromEnv(): Set<string> {
  return resolveLabsDriveTesterHashSets(
    import.meta.env.VITE_LABS_DRIVE_TESTER_HASHES as string | undefined,
    import.meta.env.VITE_ALLOWED_EMAIL_HASHES as string | undefined,
  );
}

export async function isEmailAllowedLabsDriveTester(email: string): Promise<boolean> {
  const allowed = getLabsDriveTesterHashesFromEnv();
  if (allowed.size === 0) return false;
  const hash = await sha256HexOfEmail(email);
  return allowed.has(hash.toLowerCase());
}
