import type { StanzaMarker } from '../db/stanzaDb';
import { parseYoutubeVideoId } from './parseYoutubeVideoId';

const TIME_EPS = 0.02;

export type YoutubePasteImport = {
  videoId: string;
  markers: StanzaMarker[];
  /** Optional seek after the iframe player is ready (e.g. LoopTube loop start). */
  seekSec?: number;
  /** Optional playback rate from paste (clamped to YouTube-ish bounds). */
  playbackRate?: number;
};

function parseNumberParam(sp: URLSearchParams, key: string): number | null {
  const v = sp.get(key);
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clampPlaybackRate(r: number): number {
  return Math.min(4, Math.max(0.25, r));
}

/** Parses LoopTube-style URLs (hidden compatibility): `videoId`, `start`, `end`, `rate` query params. */
export function tryParseLooptubeImport(raw: string): YoutubePasteImport | null {
  const s = raw.trim();
  if (!s) return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (host !== 'looptube.io' && host !== 'www.looptube.io') return null;

  const sp = u.searchParams;
  const videoId = sp.get('videoId') ?? sp.get('v');
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;

  const start = parseNumberParam(sp, 'start');
  const end = parseNumberParam(sp, 'end');
  const rateN = parseNumberParam(sp, 'rate');

  const markers: StanzaMarker[] = [];
  const startOk = start != null && start >= 0;
  const endOk = end != null && end >= 0;

  if (startOk && endOk && end > start + TIME_EPS) {
    markers.push({ time: start, label: 'A' }, { time: end, label: 'B' });
  } else if (startOk) {
    markers.push({ time: start, label: 'A' });
  } else if (endOk) {
    markers.push({ time: end, label: 'B' });
  }

  markers.sort((a, b) => a.time - b.time);

  const seekSec = startOk ? start : undefined;
  const playbackRate =
    rateN != null && rateN > 0 && Number.isFinite(rateN) ? clampPlaybackRate(rateN) : undefined;

  return { videoId, markers, seekSec, playbackRate };
}

/** Resolves a bare id, YouTube URL, or LoopTube URL into a video id plus optional Stanza seed data. */
export function resolveYoutubePaste(raw: string): YoutubePasteImport | null {
  const lo = tryParseLooptubeImport(raw);
  if (lo) return lo;
  const videoId = parseYoutubeVideoId(raw);
  if (!videoId) return null;
  return { videoId, markers: [] };
}

export function canResolveYoutubePaste(raw: string): boolean {
  return resolveYoutubePaste(raw) != null;
}
