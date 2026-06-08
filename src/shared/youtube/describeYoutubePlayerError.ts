export type DescribeYoutubePlayerErrorOpts = {
  /** e.g. "in Encore", "inside Stanza" — inserted in embed-blocked copy. */
  embedBlockedContext?: string;
};

/** YouTube IFrame API `onError` codes where embedding is disallowed. */
export function isYoutubeEmbedBlockedError(code: number): boolean {
  return code === 101 || code === 150;
}

/** One-line hint for compact playback UI when embed is blocked. */
export function youtubeEmbedBlockedBarHint(): string {
  return 'Embedding disabled by the publisher';
}

/** Hide raw `Video · {id}` placeholders in playback chrome. */
export function youtubePlaybackBarTitle(rawTitle: string): string {
  const title = rawTitle.trim();
  if (/^Video · [A-Za-z0-9_-]{6,}$/i.test(title)) return 'YouTube video';
  return title || 'Untitled';
}

export function describeYoutubePlayerError(
  code: number,
  opts?: DescribeYoutubePlayerErrorOpts,
): string {
  const ctx = opts?.embedBlockedContext?.trim() || 'here';
  if (isYoutubeEmbedBlockedError(code)) {
    return `This video cannot be played ${ctx} because the publisher disabled embedding on other sites.`;
  }
  if (code === 100) {
    return 'This video is unavailable (removed, private, or not found).';
  }
  if (code === 5) {
    return 'YouTube reported a playback error in the embedded player.';
  }
  if (code === 2) {
    return 'YouTube reported invalid playback parameters.';
  }
  return `YouTube reported playback error ${code}.`;
}
