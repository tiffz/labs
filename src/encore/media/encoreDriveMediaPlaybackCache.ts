import { loadOriginalTakeBlob } from '../originals/originalTakeLocalAudio';
import {
  driveGetMediaArrayBuffer,
  driveResolveFileForMedia,
} from '../drive/driveFetch';
import { encoreDrivePlaybackKind, resolveEncoreDriveMediaMime } from './encorePlayableMedia';

export type EncoreDriveMediaCacheKind = 'drive-audio' | 'drive-video';

type EncoreDriveMediaCacheEntry = {
  key: string;
  blob: Blob;
  mimeType: string;
  kind: EncoreDriveMediaCacheKind;
  objectUrl: string;
  byteSize: number;
  lastUsedAt: number;
  audioBuffer: AudioBuffer | null;
  audioDecodePromise: Promise<AudioBuffer | null> | null;
};

const MAX_CACHE_ENTRIES = 16;
/** ~512 MB — session-only; evicted LRU when exceeded. */
const MAX_CACHE_BYTES = 512 * 1024 * 1024;

const entries = new Map<string, EncoreDriveMediaCacheEntry>();
let totalBytes = 0;

export function encoreDriveMediaCacheKey(input: {
  driveFileId?: string | null;
  localTakeKey?: string | null;
}): string | null {
  const drive = input.driveFileId?.trim();
  if (drive) return `drive:${drive}`;
  const local = input.localTakeKey?.trim();
  if (local) return `local:${local}`;
  return null;
}

function touchEntry(entry: EncoreDriveMediaCacheEntry): void {
  entry.lastUsedAt = Date.now();
}

function evictLru(excludeKey?: string): void {
  while (entries.size > MAX_CACHE_ENTRIES || totalBytes > MAX_CACHE_BYTES) {
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [key, entry] of entries) {
      if (key === excludeKey) continue;
      if (entry.lastUsedAt < oldestAt) {
        oldestAt = entry.lastUsedAt;
        oldestKey = key;
      }
    }
    if (!oldestKey) break;
    const victim = entries.get(oldestKey);
    if (!victim) break;
    URL.revokeObjectURL(victim.objectUrl);
    totalBytes -= victim.byteSize;
    entries.delete(oldestKey);
  }
}

export function getCachedEncoreDriveMedia(key: string): {
  objectUrl: string;
  mimeType: string;
  kind: EncoreDriveMediaCacheKind;
} | null {
  const entry = entries.get(key);
  if (!entry) return null;
  touchEntry(entry);
  return { objectUrl: entry.objectUrl, mimeType: entry.mimeType, kind: entry.kind };
}

export function putEncoreDriveMediaCache(
  key: string,
  blob: Blob,
  mimeType: string,
  kind: EncoreDriveMediaCacheKind,
): { objectUrl: string; mimeType: string; kind: EncoreDriveMediaCacheKind } {
  const existing = entries.get(key);
  if (existing) {
    touchEntry(existing);
    return { objectUrl: existing.objectUrl, mimeType: existing.mimeType, kind: existing.kind };
  }
  const objectUrl = URL.createObjectURL(blob);
  const entry: EncoreDriveMediaCacheEntry = {
    key,
    blob,
    mimeType,
    kind,
    objectUrl,
    byteSize: blob.size,
    lastUsedAt: Date.now(),
    audioBuffer: null,
    audioDecodePromise: null,
  };
  entries.set(key, entry);
  totalBytes += entry.byteSize;
  evictLru(key);
  return { objectUrl, mimeType, kind };
}

/** True when the URL is owned by the session cache (do not revoke on stop). */
export function shouldRevokeEncoreDriveMediaObjectUrl(objectUrl: string | null | undefined): boolean {
  if (!objectUrl) return false;
  for (const entry of entries.values()) {
    if (entry.objectUrl === objectUrl) return false;
  }
  return true;
}

export async function getOrDecodeCachedEncoreDriveAudioBuffer(key: string): Promise<AudioBuffer | null> {
  const entry = entries.get(key);
  if (!entry) return null;
  touchEntry(entry);
  if (entry.audioBuffer) return entry.audioBuffer;
  if (!entry.audioDecodePromise) {
    entry.audioDecodePromise = (async () => {
      try {
        const ab = await entry.blob.arrayBuffer();
        const ctx = new AudioContext();
        try {
          return await ctx.decodeAudioData(ab.slice(0));
        } finally {
          void ctx.close();
        }
      } catch {
        return null;
      } finally {
        entry.audioDecodePromise = null;
      }
    })();
  }
  const decoded = await entry.audioDecodePromise;
  if (decoded) entry.audioBuffer = decoded;
  return decoded;
}

export type ResolvedEncoreDriveMediaPlayback = {
  objectUrl: string;
  mimeType: string;
  kind: EncoreDriveMediaCacheKind;
  cacheKey: string;
};

export async function resolveEncoreDriveMediaForPlayback(input: {
  accessToken: string | null;
  driveFileId?: string | null;
  localTakeKey?: string | null;
  mimeTypeHint?: string | null;
  fileNameHint?: string | null;
}): Promise<ResolvedEncoreDriveMediaPlayback> {
  const cacheKey = encoreDriveMediaCacheKey(input);
  if (!cacheKey) {
    throw new Error('This media is not available to play yet.');
  }

  const cached = getCachedEncoreDriveMedia(cacheKey);
  if (cached) {
    return { ...cached, cacheKey };
  }

  const localTakeKey = input.localTakeKey?.trim();
  const driveFileId = input.driveFileId?.trim();
  const fileNameHint = input.fileNameHint?.trim();

  if (localTakeKey && (!driveFileId || !input.accessToken)) {
    const loaded = await loadOriginalTakeBlob(localTakeKey);
    if (!loaded) throw new Error('Local take audio not found.');
    const mime = resolveEncoreDriveMediaMime({
      fileName: fileNameHint,
      mimeType: loaded.mimeType,
    });
    const blobMime = mime === 'application/octet-stream' ? 'audio/mpeg' : mime;
    const kind = encoreDrivePlaybackKind(blobMime) ?? 'drive-audio';
    const blob = new Blob([await loaded.blob.arrayBuffer()], { type: blobMime });
    const put = putEncoreDriveMediaCache(cacheKey, blob, blobMime, kind);
    return { ...put, cacheKey };
  }

  if (!driveFileId || !input.accessToken) {
    throw new Error('Sign in to Google to play this file.');
  }

  const { mediaFileId, meta } = await driveResolveFileForMedia(input.accessToken, driveFileId);
  const buffer = await driveGetMediaArrayBuffer(input.accessToken, mediaFileId);
  const mime = resolveEncoreDriveMediaMime({
    fileName: meta.name ?? fileNameHint,
    mimeType: meta.mimeType,
    mimeTypeHint: input.mimeTypeHint,
  });
  const kind = encoreDrivePlaybackKind(mime) ?? 'drive-audio';
  const blobMime = mime === 'application/octet-stream' ? 'audio/mpeg' : mime;
  const blob = new Blob([buffer], { type: blobMime });
  const put = putEncoreDriveMediaCache(cacheKey, blob, blobMime, kind);
  return { ...put, cacheKey };
}

/** Test-only reset. */
export function resetEncoreDriveMediaPlaybackCacheForTests(): void {
  for (const entry of entries.values()) {
    URL.revokeObjectURL(entry.objectUrl);
  }
  entries.clear();
  totalBytes = 0;
}
