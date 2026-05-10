import { isStanzaBlobLikeVideo } from '../db/stanzaLocalAudioImport';
import { stanzaDb } from '../db/stanzaDb';

const thumbBackfillInFlight = new Set<string>();

const THUMB_MIN_EDGE_SEC = 0.001;
const THUMB_EARLY_FALLBACK_SEC = 0.05;
const THUMB_METADATA_WAIT_MS = 2000;

/** @internal exported for unit tests */
export function pickThumbnailSeekSec(video: HTMLVideoElement, fraction: number): number {
  const d = video.duration;
  if (!Number.isFinite(d) || d <= 0) return THUMB_EARLY_FALLBACK_SEC;
  if (d > THUMB_MIN_EDGE_SEC * 3) {
    return Math.max(THUMB_MIN_EDGE_SEC, Math.min(d * fraction, d - THUMB_MIN_EDGE_SEC));
  }
  return Math.max(0, d / 2);
}

/**
 * Extract a single preview frame from an in-memory video blob for library cards (JPEG).
 * Returns null when the environment cannot decode the blob or dimensions are unavailable.
 *
 * By default seeks to **middle** of the clip (`seekFraction` 0.5) so posters are not a black
 * leader frame; falls back to {@link THUMB_EARLY_FALLBACK_SEC} when duration is still unknown.
 */
export async function captureVideoThumbnailAsJpeg(
  videoBlob: Blob,
  opts?: {
    maxWidth?: number;
    quality?: number;
    /** Media-time fraction 0–1 (default 0.5 = middle of clip). */
    seekFraction?: number;
    /** When set, seeks here instead of a derived time from duration. */
    seekSec?: number;
    /** Song/file name when MIME is missing or octet-stream (Drive). */
    filenameHint?: string | null;
  },
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  if (!isStanzaBlobLikeVideo(videoBlob, opts?.filenameHint)) return null;

  const maxWidth = opts?.maxWidth ?? 480;
  const quality = opts?.quality ?? 0.72;
  const seekFraction = opts?.seekFraction ?? 0.5;

  const url = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  try {
    await new Promise<void>((resolve, reject) => {
      const done = () => {
        video.removeEventListener('loadeddata', done);
        video.removeEventListener('error', onErr);
        resolve();
      };
      const onErr = () => {
        video.removeEventListener('loadeddata', done);
        video.removeEventListener('error', onErr);
        reject(new Error('video load failed'));
      };
      video.addEventListener('loadeddata', done, { once: true });
      video.addEventListener('error', onErr, { once: true });
      video.src = url;
    });

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      await Promise.race([
        new Promise<void>((resolve) => {
          if (Number.isFinite(video.duration) && video.duration > 0) {
            resolve();
            return;
          }
          const onMeta = () => {
            video.removeEventListener('loadedmetadata', onMeta);
            resolve();
          };
          video.addEventListener('loadedmetadata', onMeta, { once: true });
        }),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, THUMB_METADATA_WAIT_MS);
        }),
      ]);
    }

    const seekSec =
      typeof opts?.seekSec === 'number' && Number.isFinite(opts.seekSec)
        ? opts.seekSec
        : pickThumbnailSeekSec(video, seekFraction);
    video.currentTime = seekSec;

    await new Promise<void>((resolve, reject) => {
      const ok = () => {
        video.removeEventListener('seeked', ok);
        video.removeEventListener('error', onErr);
        resolve();
      };
      const onErr = () => {
        video.removeEventListener('seeked', ok);
        video.removeEventListener('error', onErr);
        reject(new Error('seek failed'));
      };
      video.addEventListener('seeked', ok, { once: true });
      video.addEventListener('error', onErr, { once: true });
    });

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;

    const scale = Math.min(1, maxWidth / vw);
    const cw = Math.round(vw * scale);
    const ch = Math.round(vh * scale);

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, cw, ch);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
    });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute('src');
    video.load();
  }
}

/** Writes `localVideoThumbnailBlob` once when missing (new imports + legacy rows). */
export async function backfillStanzaVideoThumbnailIfNeeded(songId: string): Promise<void> {
  if (thumbBackfillInFlight.has(songId)) return;
  thumbBackfillInFlight.add(songId);
  try {
    const latest = await stanzaDb.songs.get(songId);
    if (!latest) return;
    const media = latest.localAudioBlob;
    if (!media || !isStanzaBlobLikeVideo(media, latest.title)) return;
    if (latest.localVideoThumbnailBlob) return;
    const hint = latest.title;
    const thumb =
      (await captureVideoThumbnailAsJpeg(media, { filenameHint: hint, seekFraction: 0.5 })) ??
      (await captureVideoThumbnailAsJpeg(media, { filenameHint: hint, seekFraction: 0.25 })) ??
      (await captureVideoThumbnailAsJpeg(media, { filenameHint: hint, seekSec: THUMB_EARLY_FALLBACK_SEC }));
    if (!thumb) return;
    const row = await stanzaDb.songs.get(songId);
    if (!row?.localAudioBlob || !isStanzaBlobLikeVideo(row.localAudioBlob, row.title)) return;
    if (row.localVideoThumbnailBlob) return;
    await stanzaDb.songs.put({ ...row, localVideoThumbnailBlob: thumb, updatedAt: Date.now() });
  } finally {
    thumbBackfillInFlight.delete(songId);
  }
}
