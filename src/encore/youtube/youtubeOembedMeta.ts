/**
 * YouTube watch-page title/channel from oEmbed (shared cache for hover cards and inline chips).
 * When {@link YoutubeOembedMeta#embedDenied} is true, oEmbed refused the URL (often embedding or
 * syndication is disabled); UI may hide deep links that depend on playable embeds.
 */
export type YoutubeOembedMeta = {
  title: string;
  subtitle: string;
  /** Set when oEmbed returned 401/403/404 — common for playback/embedding-restricted videos. */
  embedDenied?: boolean;
};

const youtubeOembedCache = new Map<string, YoutubeOembedMeta>();

export function getYoutubeOembedCached(watchUrl: string): YoutubeOembedMeta | undefined {
  return youtubeOembedCache.get(watchUrl);
}

export async function fetchYoutubeOembedMeta(watchUrl: string): Promise<YoutubeOembedMeta | null> {
  const cached = youtubeOembedCache.get(watchUrl);
  if (cached) return cached;
  try {
    const u = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`;
    const res = await fetch(u, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) {
      /** YouTube typically returns these when the video can’t be used in third-party/embed contexts. */
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        const denied: YoutubeOembedMeta = { title: '', subtitle: '', embedDenied: true };
        youtubeOembedCache.set(watchUrl, denied);
        return denied;
      }
      return null;
    }
    const j = (await res.json()) as { title?: string; author_name?: string };
    const title = typeof j.title === 'string' ? j.title.trim() : '';
    if (!title) return null;
    const subtitle =
      typeof j.author_name === 'string' && j.author_name.trim() ? j.author_name.trim() : 'YouTube';
    const meta: YoutubeOembedMeta = { title, subtitle, embedDenied: false };
    youtubeOembedCache.set(watchUrl, meta);
    return meta;
  } catch {
    return null;
  }
}
