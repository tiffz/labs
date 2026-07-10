import type { StanzaSong } from './stanzaDb';
import { computeStanzaLocalMediaFingerprint } from '../utils/stanzaLocalMediaFingerprint';
import { probeFileAudioDurationSeconds } from '../utils/probeFileAudioDuration';

/**
 * Helpers that turn a browser `File` (or a drag-and-drop `DataTransfer`) into a Stanza-shaped
 * song row, without touching Dexie. Pulled out of `StanzaWorkspace` so the drop pipeline and the
 * button-pickers go through the same validation + row construction, and so the rules can be
 * unit-tested without spinning up the workspace component.
 *
 * Design notes:
 * - Stanza handles audio and common local video containers (mp4/mov/webm). Video rows use the same
 *   `localAudioBlob` field and render in `<video>` when {@link isStanzaBlobLikeVideo} matches.
 * - We make a fresh `Blob` from `arrayBuffer()` rather than keeping the `File` reference; this lets
 *   IndexedDB own the bytes outright (no implicit lifetime tie to the picked DOM `File`).
 */

/**
 * Generous audio sniff: MIME prefix `audio/` is the primary signal, with an extension fallback
 * because some browsers (Safari especially) hand us empty `file.type` for less-common formats.
 */
const AUDIO_EXTENSION_FALLBACK = /\.(mp3|m4a|aac|flac|wav|wave|ogg|oga|opus|webm|aiff?|caf|amr|wma)$/i;

/** Common phone / performance uploads in Drive; Stanza plays them via `<audio>` when the browser exposes an audio track. */
const DRIVE_PRACTICEABLE_VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

/** File name hint when `Blob.type` is empty or `application/octet-stream` (common for Drive downloads). */
const VIDEO_EXTENSION_FALLBACK = /\.(mp4|m4v|mov|webm|mkv|avi|mpeg|mpg)$/i;

/**
 * True when a local blob is likely a video container (library thumbnail + `<video>` playback).
 * Drive often serves `application/octet-stream`; use `fileNameHint` (e.g. song title with extension).
 */
export function isStanzaBlobLikeVideo(blob: Blob, fileNameHint?: string | null): boolean {
  const t = (blob.type ?? '').toLowerCase();
  if (t.startsWith('video/')) return true;
  if (DRIVE_PRACTICEABLE_VIDEO_MIMES.has(t)) return true;
  const hint = fileNameHint?.trim();
  if (t === 'application/octet-stream' && hint && VIDEO_EXTENSION_FALLBACK.test(hint)) return true;
  return false;
}

/**
 * MIME sniff for Google Drive `files` metadata (or `alt=media` Content-Type): audio types plus a
 * small allowlist of video containers Encore often stores as performance / backing recordings.
 */
export function isPracticeableStanzaDriveMime(mime: string | undefined, fallbackName?: string | null): boolean {
  const m = (mime ?? '').toLowerCase();
  if (m.startsWith('audio/')) return true;
  if (m === 'application/ogg') return true;
  if (DRIVE_PRACTICEABLE_VIDEO_MIMES.has(m)) return true;
  if (m === 'application/octet-stream' && fallbackName && AUDIO_EXTENSION_FALLBACK.test(fallbackName)) return true;
  return false;
}

export function isAudioFileForStanza(file: File): boolean {
  if (!file) return false;
  const mime = typeof file.type === 'string' ? file.type.toLowerCase() : '';
  if (mime.startsWith('image/') || mime.startsWith('text/')) return false;
  if (mime.startsWith('audio/')) return true;
  if (typeof file.name === 'string' && AUDIO_EXTENSION_FALLBACK.test(file.name)) return true;
  return false;
}

/** Audio uploads plus local video containers Stanza can practice (mp4/mov/webm). */
export function isLocalMediaFileForStanza(file: File): boolean {
  if (isAudioFileForStanza(file)) return true;
  const mime = typeof file.type === 'string' ? file.type.toLowerCase() : '';
  if (DRIVE_PRACTICEABLE_VIDEO_MIMES.has(mime)) return true;
  if (mime.startsWith('video/') && typeof file.name === 'string' && VIDEO_EXTENSION_FALLBACK.test(file.name)) {
    return true;
  }
  if (mime === 'application/octet-stream' && typeof file.name === 'string' && VIDEO_EXTENSION_FALLBACK.test(file.name)) {
    return true;
  }
  return false;
}

async function probePlayableDurationSeconds(file: File): Promise<number | null> {
  const durationSec = await probeFileAudioDurationSeconds(file);
  if (durationSec == null || !Number.isFinite(durationSec) || durationSec <= 0) return null;
  return durationSec;
}

/**
 * All practiceable local media from a drag-and-drop payload, in list order (non-media entries skipped).
 */
export function allAudioFilesFromDataTransfer(dt: DataTransfer | null | undefined): File[] {
  const files = dt?.files;
  if (!files || files.length === 0) return [];
  const out: File[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const f = files.item(i);
    if (f && isLocalMediaFileForStanza(f)) out.push(f);
  }
  return out;
}

/**
 * Extracts the first audio-like file from a drag-and-drop payload, ignoring non-audio entries
 * (e.g. an accidental .mov sibling). Returns null when the payload is missing or has no audio.
 */
export function firstAudioFileFromDataTransfer(dt: DataTransfer | null | undefined): File | null {
  const all = allAudioFilesFromDataTransfer(dt);
  return all[0] ?? null;
}

/** Strip the trailing extension when titling a song from a filename (`.mp3` -> ``). */
export function stanzaSongTitleFromFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'Local audio';
  return trimmed.replace(/\.[^/.]+$/, '') || trimmed;
}

/**
 * Build a Stanza-shaped song row from a picked or dropped file. Caller is responsible for
 * persisting via `stanzaDb.songs.put(row)` and for selecting it. Pure (no IndexedDB / no React)
 * so this can be exercised in jsdom tests without faking Dexie.
 *
 * @throws if `crypto.randomUUID` is unavailable (very old browsers); no other failure modes.
 */
export async function buildLocalPracticeAudioPatch(
  file: File,
): Promise<Pick<StanzaSong, 'localAudioBlob' | 'localMediaFingerprint'>> {
  if (!isLocalMediaFileForStanza(file)) {
    throw new Error(`Not a supported recording: ${file.name || 'unnamed file'}`);
  }
  const durationSec = await probePlayableDurationSeconds(file);
  if (durationSec == null) {
    throw new Error(
      `Could not read audio from "${file.name || 'unnamed file'}". Choose a supported audio or video file (MP3, WAV, MP4, …).`,
    );
  }
  const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'audio/mpeg' });
  return {
    localAudioBlob: blob,
    localMediaFingerprint: computeStanzaLocalMediaFingerprint({
      sizeBytes: blob.size,
      durationSec,
      fileName: file.name,
    }),
  };
}

export async function buildLocalAudioStanzaSong(file: File): Promise<StanzaSong> {
  const patch = await buildLocalPracticeAudioPatch(file);
  return {
    id: crypto.randomUUID(),
    ytId: null,
    title: stanzaSongTitleFromFileName(file.name),
    markers: [],
    stats: {},
    updatedAt: Date.now(),
    ...patch,
  };
}
