/**
 * Tell an account link (`x.com/betweenwalks`) from a post link (`x.com/tiffatiel/status/…`), and
 * read the handle out of either. The importer needs the first; showing which account a publication
 * went out on needs the second, derived from the URL so it cannot drift from it.
 */
import { inferPublishPlatformFromUrl } from './inferPublishPlatform';

export type LyreflyLinkKind =
  | { kind: 'account'; platform: string; handle: string; url: string }
  | { kind: 'post'; platform: string; handle?: string };

function parse(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    // Respect any scheme already there: prefixing "mailto:me@x.com" made gmail.com a website.
    return new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

/** Path segments, without empty ones. */
function segmentsOf(url: URL): string[] {
  return url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
}

function accountUrl(url: URL, path: string): string {
  return `${url.protocol}//${url.hostname.replace(/^www\./i, '')}${path}`;
}

/**
 * @param platformHint used when the host alone cannot say (a Tumblr blog on its own domain).
 */
export function classifyLyreflyLink(rawUrl: string, platformHint?: string): LyreflyLinkKind | null {
  const url = parse(rawUrl);
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) return null;
  const host = url.hostname.replace(/^www\./i, '').toLowerCase();
  const seg = segmentsOf(url);
  const platform = inferPublishPlatformFromUrl(url.href)?.platform ?? host;

  switch (platform) {
    case 'X':
    case 'Instagram':
    case 'Facebook': {
      if (seg.length === 0) return null;
      // Facebook profiles without a username live at profile.php?id=…; the id is the handle.
      const fbId = platform === 'Facebook' && seg[0] === 'profile.php' ? url.searchParams.get('id') : null;
      if (fbId) {
        return { kind: 'account', platform, handle: fbId, url: `${accountUrl(url, '/profile.php')}?id=${fbId}` };
      }
      // Site sections, not people: never an account, and nobody's handle on a post.
      const reserved = new Set([
        'p', 'reel', 'reels', 'share', 'i', 'intent', 'home', 'search', 'explore', 'hashtag',
        'settings', 'messages', 'stories', 'groups', 'watch', 'profile.php', 'notifications',
      ]);
      if (seg.length === 1 && !reserved.has(seg[0]!)) {
        return { kind: 'account', platform, handle: seg[0]!, url: accountUrl(url, `/${seg[0]}`) };
      }
      return { kind: 'post', platform, handle: reserved.has(seg[0]!) ? undefined : seg[0] };
    }
    case 'Threads': {
      const handle = seg[0]?.startsWith('@') ? seg[0].slice(1) : undefined;
      if (handle && seg.length === 1) {
        return { kind: 'account', platform, handle, url: accountUrl(url, `/@${handle}`) };
      }
      return { kind: 'post', platform, handle };
    }
    case 'Bluesky': {
      const handle = seg[0] === 'profile' ? seg[1] : undefined;
      if (handle && seg.length === 2) {
        return { kind: 'account', platform, handle, url: accountUrl(url, `/profile/${handle}`) };
      }
      return { kind: 'post', platform, handle };
    }
    case 'Tumblr': {
      // name.tumblr.com[/post/…] or tumblr.com/name[/id]
      const sub = host.endsWith('.tumblr.com') ? host.slice(0, -'.tumblr.com'.length) : undefined;
      if (sub) {
        if (seg.length === 0) return { kind: 'account', platform, handle: sub, url: accountUrl(url, '/') };
        return { kind: 'post', platform, handle: sub };
      }
      if (seg.length === 1) return { kind: 'account', platform, handle: seg[0]!, url: accountUrl(url, `/${seg[0]}`) };
      return { kind: 'post', platform, handle: seg[0] };
    }
    default: {
      // Listing pages on comic and print platforms are publications, never accounts.
      const known = inferPublishPlatformFromUrl(url.href)?.source === 'known';
      if (seg.length === 0 && !known) {
        return { kind: 'account', platform: platformHint ?? 'Website', handle: host, url: accountUrl(url, '/') };
      }
      // The host names a listing better than the site's own label for it ("Mixam", not "Store").
      return { kind: 'post', platform };
    }
  }
}
