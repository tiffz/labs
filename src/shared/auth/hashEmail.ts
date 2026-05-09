/** Normalize email before hashing (lowercase + trim). */
export function normalizeEmailForHash(email: string): string {
  return email.trim().toLowerCase();
}

/** SHA-256 hex digest of UTF-8 email (normalized). */
export async function sha256HexOfEmail(email: string): Promise<string> {
  const normalized = normalizeEmailForHash(email);
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Parse comma-separated hex hashes from env (empty = no one allowed). */
export function parseAllowedEmailHashesFromEnv(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isEmailHashAllowed(hexHash: string, allowed: Set<string>): boolean {
  return allowed.has(hexHash.toLowerCase());
}
