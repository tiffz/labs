export interface YouTubePlaylistItemRow {
  videoId: string;
  title: string;
  channelTitle: string;
  /** First lines sometimes repeat `Artist - Title`; used when title parse is low-confidence. */
  description?: string;
}

async function youtubeGet<T>(pathWithQuery: string, googleAccessToken: string): Promise<T> {
  const url = `https://www.googleapis.com/youtube/v3/${pathWithQuery}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${googleAccessToken}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`YouTube API ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/** Paginates `playlistItems` for the given playlist id. */
export async function fetchYouTubePlaylistItems(
  googleAccessToken: string,
  playlistId: string,
): Promise<YouTubePlaylistItemRow[]> {
  const out: YouTubePlaylistItemRow[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: '50',
    });
    if (pageToken) q.set('pageToken', pageToken);
    const data = await youtubeGet<{
      items?: Array<{
        snippet?: {
          resourceId?: { videoId?: string };
          title?: string;
          description?: string;
          videoOwnerChannelTitle?: string;
          channelTitle?: string;
        };
      }>;
      nextPageToken?: string;
    }>(`playlistItems?${q.toString()}`, googleAccessToken);
    for (const it of data.items ?? []) {
      const sn = it.snippet;
      const vid = sn?.resourceId?.videoId;
      if (!vid) continue;
      const desc = (sn?.description ?? '').trim();
      out.push({
        videoId: vid,
        title: (sn?.title ?? '').trim() || 'Untitled',
        channelTitle: (sn?.videoOwnerChannelTitle ?? sn?.channelTitle ?? '').trim(),
        ...(desc ? { description: desc.slice(0, 5000) } : {}),
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return out;
}
