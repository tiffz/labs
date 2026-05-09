const MAX_NESTED_V_DEPTH = 5;

function urlFromMaybeSchemeless(input: string): URL | null {
  const s = input.trim();
  if (!s) return null;
  try {
    return new URL(s);
  } catch {
    try {
      if (!/^[a-z+.-]+:/i.test(s)) {
        return new URL(`https://${s.replace(/^\/\//, '')}`);
      }
    } catch {
      /* invalid */
    }
  }
  return null;
}

/** Extract an 11-character YouTube video id from a bare id or common watch / short / embed URLs. */
export function parseYoutubeVideoId(input: string): string | null {
  return parseYoutubeVideoIdInner(input, 0);
}

function parseYoutubeVideoIdInner(input: string, depth: number): string | null {
  const s = input.trim();
  if (!s || depth > MAX_NESTED_V_DEPTH) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;

  const u = urlFromMaybeSchemeless(s);
  if (!u) return null;

  const host = u.hostname.toLowerCase();
  if (host === 'youtu.be') {
    const id = u.pathname.replace(/^\//, '').split('/')[0] ?? '';
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }
  if (host === 'www.youtube.com' || host === 'youtube.com' || host === 'm.youtube.com') {
    const v = u.searchParams.get('v');
    if (v) {
      if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const nested = parseYoutubeVideoIdInner(v, depth + 1);
      if (nested) return nested;
    }
    const embed = u.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embed?.[1]) return embed[1];
    const shorts = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shorts?.[1]) return shorts[1];
  }
  return null;
}

/** Canonical `youtube.com/watch?v=` URL, or null if the field does not resolve to a video id. */
export function youtubeWatchUrlFromInput(input: string | undefined | null): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  const id = parseYoutubeVideoId(raw);
  if (!id) return null;
  return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
}
