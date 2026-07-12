export type InferredPublishPlatform = {
  platform: string;
  /** Known catalog match vs hostname-derived indie label. */
  source: 'known' | 'hostname';
};

const KNOWN_PLATFORM_HOSTS: ReadonlyArray<{ test: (host: string) => boolean; platform: string }> = [
  { test: (h) => h === 'tapas.io' || h.endsWith('.tapas.io'), platform: 'Tapas' },
  { test: (h) => h === 'webtoons.com' || h.endsWith('.webtoons.com'), platform: 'WEBTOON' },
  { test: (h) => h === 'instagram.com' || h.endsWith('.instagram.com'), platform: 'Instagram' },
  { test: (h) => h === 'threads.net' || h.endsWith('.threads.net'), platform: 'Threads' },
  { test: (h) => h === 'twitter.com' || h.endsWith('.twitter.com') || h === 'x.com' || h.endsWith('.x.com'), platform: 'X' },
  { test: (h) => h === 'facebook.com' || h.endsWith('.facebook.com'), platform: 'Facebook' },
  { test: (h) => h === 'bsky.app' || h.endsWith('.bsky.app'), platform: 'Bluesky' },
  { test: (h) => h === 'tiktok.com' || h.endsWith('.tiktok.com'), platform: 'TikTok' },
  { test: (h) => h === 'youtube.com' || h.endsWith('.youtube.com') || h === 'youtu.be', platform: 'YouTube' },
  { test: (h) => h === 'patreon.com' || h.endsWith('.patreon.com'), platform: 'Patreon' },
  { test: (h) => h === 'ko-fi.com' || h.endsWith('.ko-fi.com'), platform: 'Ko-fi' },
  { test: (h) => h === 'itch.io' || h.endsWith('.itch.io'), platform: 'itch.io' },
  { test: (h) => h === 'gumroad.com' || h.endsWith('.gumroad.com'), platform: 'Gumroad' },
  { test: (h) => h === 'substack.com' || h.endsWith('.substack.com'), platform: 'Substack' },
  { test: (h) => h === 'mastodon.social' || h.includes('mastodon'), platform: 'Mastodon' },
  { test: (h) => h === 'tumblr.com' || h.endsWith('.tumblr.com'), platform: 'Tumblr' },
  { test: (h) => h === 'pixiv.net' || h.endsWith('.pixiv.net'), platform: 'pixiv' },
  { test: (h) => h === 'deviantart.com' || h.endsWith('.deviantart.com'), platform: 'DeviantArt' },
];

function titleCaseHostLabel(label: string): string {
  if (!label) return label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function hostnameLabel(host: string): string {
  const parts = host.split('.').filter(Boolean);
  if (parts.length >= 2) {
    const registrable = parts[parts.length - 2] ?? host;
    return titleCaseHostLabel(registrable.replace(/-/g, ' '));
  }
  return titleCaseHostLabel(host);
}

/** Infer a publication platform label from a URL. Indie hosts use the site name. */
export function inferPublishPlatformFromUrl(rawUrl: string): InferredPublishPlatform | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (!host) return null;

    for (const entry of KNOWN_PLATFORM_HOSTS) {
      if (entry.test(host)) {
        return { platform: entry.platform, source: 'known' };
      }
    }

    return { platform: hostnameLabel(host), source: 'hostname' };
  } catch {
    return null;
  }
}
