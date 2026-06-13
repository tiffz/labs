import { inferMediaMimeType } from '../../shared/drive/inferMediaMimeType';

export type EncoreMediaPlaybackKind = 'drive-audio' | 'drive-video' | 'youtube' | 'spotify';

export type EncoreMediaPlaybackTarget = {
  playbackId: string;
  kind: EncoreMediaPlaybackKind;
  title: string;
  subtitle?: string;
  driveFileId?: string;
  mimeType?: string;
  /** Originals take cached locally when Drive id is missing or upload is pending. */
  localTakeKey?: string;
  youtubeVideoId?: string;
  spotifyTrackId?: string;
};

export type EncoreMediaPlaybackPhase = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export function isEncorePlayableDriveMime(mime?: string | null): boolean {
  const normalized = mime?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!normalized || normalized === 'application/octet-stream') return false;
  return normalized.startsWith('audio/') || normalized.startsWith('video/');
}

/** Drive and browser uploads often omit MIME or use octet-stream (typical for Logic `.m4a`). */
const ENCORE_DRIVE_AUDIO_EXTENSION = /\.(m4a|aac|mp3|wav|wave|aif|aiff|caf|flac|ogg|oga|opus|webm)$/i;

export function resolveEncoreDriveMediaMime(input: {
  fileName?: string | null;
  mimeType?: string | null;
  mimeTypeHint?: string | null;
}): string {
  const fileName = (input.fileName ?? '').trim();
  const rawType = (input.mimeType ?? input.mimeTypeHint ?? '').trim();

  // Logic / Drive often tag `.m4a` as `video/mp4` or `application/octet-stream` — trust the extension.
  if (fileName && ENCORE_DRIVE_AUDIO_EXTENSION.test(fileName)) {
    return inferMediaMimeType({ name: fileName, type: '' }).split(';')[0]?.trim().toLowerCase() ?? 'audio/mp4';
  }

  const inferred = inferMediaMimeType({ name: fileName, type: rawType });
  const normalized = inferred.split(';')[0]?.trim().toLowerCase() ?? 'application/octet-stream';
  if (normalized !== 'application/octet-stream') return normalized;
  const rawHint =
    input.mimeType?.split(';')[0]?.trim().toLowerCase() ||
    input.mimeTypeHint?.split(';')[0]?.trim().toLowerCase();
  return rawHint || 'application/octet-stream';
}

/** True when the browser is unlikely to decode this MIME via a plain `<audio>` src. */
export function encoreDriveMediaPreferWebAudioPlayback(mime?: string | null): boolean {
  const normalized = mime?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!normalized.startsWith('audio/')) return false;
  if (typeof document === 'undefined') return false;
  const probe = document.createElement('audio');
  const canPlay = probe.canPlayType(normalized);
  return canPlay !== 'probably' && canPlay !== 'maybe';
}

export function encoreDrivePlaybackKind(mime?: string | null): 'drive-audio' | 'drive-video' | null {
  const normalized = mime?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (normalized.startsWith('audio/')) return 'drive-audio';
  if (normalized.startsWith('video/')) return 'drive-video';
  return null;
}

export function encoreMediaPlaybackSupportsSpeed(kind: EncoreMediaPlaybackKind): boolean {
  return kind === 'drive-audio' || kind === 'drive-video' || kind === 'youtube';
}

export function encoreMediaPlaybackSupportsTranspose(kind: EncoreMediaPlaybackKind): boolean {
  return kind === 'drive-audio' || kind === 'drive-video';
}

export function encoreMediaPlaybackSupportsLoop(kind: EncoreMediaPlaybackKind): boolean {
  return kind !== 'spotify';
}

export function encoreDriveMediaPlaybackId(driveFileId: string): string {
  return `drive:${driveFileId.trim()}`;
}

export function encoreYoutubeMediaPlaybackId(videoId: string): string {
  return `youtube:${videoId.trim()}`;
}

export function encoreSpotifyMediaPlaybackId(trackId: string): string {
  return `spotify:${trackId.trim()}`;
}
