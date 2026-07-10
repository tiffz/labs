import { useEffect, useState } from 'react';

import {
  clearStanzaLocalMainDecodeCache,
  getStanzaLocalMainDecodedBuffer,
} from '../audio/stanzaLocalMainDecodeCache';

/**
 * Decodes the local main blob once per media identity so transport can trust
 * {@link AudioBuffer.duration} when HTML5 metadata is short (common VBR MP3).
 *
 * Shares the decode cache with transpose playback (`getStanzaLocalMainDecodedBuffer`).
 */
export function useStanzaLocalDecodedDuration(opts: {
  enabled: boolean;
  mediaKey: string;
  blob: Blob | null | undefined;
  mediaUrl: string | null;
  title: string;
  isVideo: boolean;
}): number {
  const { enabled, mediaKey, blob, mediaUrl, title, isVideo } = opts;
  const [durationSec, setDurationSec] = useState(0);

  useEffect(() => {
    if (!enabled || !mediaKey || !blob || !mediaUrl) {
      setDurationSec(0);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const buf = await getStanzaLocalMainDecodedBuffer({
          mediaKey,
          blob,
          title: title || 'Stanza track',
          mediaUrl,
          isVideo,
        });
        if (cancelled) return;
        const d = buf.duration;
        setDurationSec(Number.isFinite(d) && d > 0 ? d : 0);
      } catch (err) {
        if (!cancelled) {
          console.warn('[stanza] local duration decode failed', err);
          setDurationSec(0);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, mediaKey, blob, mediaUrl, title, isVideo]);

  useEffect(() => {
    return () => {
      clearStanzaLocalMainDecodeCache(mediaKey || undefined);
    };
  }, [mediaKey]);

  return durationSec;
}
