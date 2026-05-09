import { parseAllowedEmailHashesFromEnv, sha256HexOfEmail } from '../auth/hashEmail';

/** Comma-separated SHA-256 hex digests of normalized tester emails (same format as Encore allowlist). */
export function parseLabsDriveTesterHashesFromEnv(raw: string | undefined): Set<string> {
  return parseAllowedEmailHashesFromEnv(raw);
}

export function getLabsDriveTesterHashesFromEnv(): Set<string> {
  return parseLabsDriveTesterHashesFromEnv(import.meta.env.VITE_LABS_DRIVE_TESTER_HASHES as string | undefined);
}

export async function isEmailAllowedLabsDriveTester(email: string): Promise<boolean> {
  const allowed = getLabsDriveTesterHashesFromEnv();
  if (allowed.size === 0) return false;
  const hash = await sha256HexOfEmail(email);
  return allowed.has(hash.toLowerCase());
}
