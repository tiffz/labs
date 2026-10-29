/**
 * What a collection's source link says. A source is either the Drive folder its pieces came from
 * or the website they were published on, and one label for both hid which you were about to open.
 * Null when the link is not a web address, so nothing renders rather than a dead link.
 */
export function lyreflySourceLinkLabel(url: string): string | null {
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    host = parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  if (host === 'drive.google.com') return 'Open in Drive';
  return `View on ${host}`;
}
