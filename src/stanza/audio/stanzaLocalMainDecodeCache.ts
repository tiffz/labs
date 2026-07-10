import { decodeStanzaLocalBlobForPlayback } from '../audio/decodeStanzaLocalBlob';

type CacheEntry =
  | { mediaKey: string; buffer: AudioBuffer }
  | { mediaKey: string; promise: Promise<AudioBuffer> };

let cache: CacheEntry | null = null;

/**
 * Decode the local main blob once per media identity and reuse the buffer for
 * duration probing and transpose playback (avoids double `decodeAudioData`).
 */
export async function getStanzaLocalMainDecodedBuffer(opts: {
  mediaKey: string;
  blob: Blob;
  mediaUrl: string;
  title: string;
  isVideo: boolean;
}): Promise<AudioBuffer> {
  const { mediaKey, blob, mediaUrl, title, isVideo } = opts;
  if (cache?.mediaKey === mediaKey) {
    if ('buffer' in cache) return cache.buffer;
    return cache.promise;
  }

  const promise = decodeStanzaLocalBlobForPlayback({
    blob,
    title: title || 'Stanza track',
    mediaUrl,
    isVideo,
  }).then((buffer) => {
    cache = { mediaKey, buffer };
    return buffer;
  });
  cache = { mediaKey, promise };
  try {
    return await promise;
  } catch (err) {
    if (cache?.mediaKey === mediaKey && 'promise' in cache) cache = null;
    throw err;
  }
}

/** Drop cached decode when the primary blob identity changes or the song unmounts. */
export function clearStanzaLocalMainDecodeCache(mediaKey?: string): void {
  if (mediaKey == null || cache?.mediaKey === mediaKey) cache = null;
}
