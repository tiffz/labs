/** YouTube thumbnail without API keys (may 404 for very new/private videos). */
export function youtubeMqThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;
}

/** Best-effort title from YouTube oEmbed (browser fetch; may fail on CORS/network). */
export async function fetchYoutubeOEmbedTitle(videoId: string): Promise<string | null> {
  const watch = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`;
  try {
    const res = await fetch(oembed);
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return typeof data.title === 'string' && data.title.trim() ? data.title.trim() : null;
  } catch {
    return null;
  }
}
