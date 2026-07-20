/**
 * Hostname checks that avoid substring false-positives
 * (`https://evil.com/?q=youtube.com`).
 */

export function tryParseUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed);
  } catch {
    try {
      return new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }
}

/** True when hostname is exactly `host` or a subdomain of `host`. */
export function hostnameMatches(raw: string, host: string): boolean {
  const url = tryParseUrl(raw);
  if (!url) return false;
  const h = url.hostname.toLowerCase();
  const target = host.toLowerCase();
  return h === target || h.endsWith(`.${target}`);
}

/** True when hostname equals any of the hosts or is a subdomain of one. */
export function hostnameMatchesAny(raw: string, hosts: readonly string[]): boolean {
  return hosts.some((host) => hostnameMatches(raw, host));
}
