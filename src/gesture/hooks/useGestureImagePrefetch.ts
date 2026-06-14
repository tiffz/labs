import { useEffect, useMemo, useState } from 'react';

import { resolveGestureReferenceImageUrl } from '../media/gestureThumbnailLinkCache';
import {
  getCachedGestureImageUrl,
  preloadGestureImageViaElement,
  prefetchGestureImageUrl,
  retainGesturePrefetchKeys,
} from '../media/gestureImagePrefetchCache';
import type { SessionQueueItem } from '../types';

export function useGestureImagePrefetch(
  queue: SessionQueueItem[],
  index: number,
  accessToken: string | null,
): { src: string | null; loading: boolean; error: string | null } {
  const current = queue[index] ?? null;
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const windowKeys = useMemo(() => {
    const keys: string[] = [];
    for (let i = index; i <= index + 2 && i < queue.length; i += 1) {
      keys.push(queue[i]!.driveFileId);
    }
    if (index > 0) keys.unshift(queue[index - 1]!.driveFileId);
    return keys;
  }, [index, queue]);

  useEffect(() => {
    retainGesturePrefetchKeys(windowKeys);
  }, [windowKeys]);

  useEffect(() => {
    let cancelled = false;
    if (!current) {
      setSrc(null);
      setLoading(false);
      setError(null);
      return;
    }

    const key = current.driveFileId;
    const cached = getCachedGestureImageUrl(key);
    if (cached) {
      setSrc(cached);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }

    void (async () => {
      try {
        const remoteUrl = await resolveGestureReferenceImageUrl(accessToken, key);
        const objectUrl = getCachedGestureImageUrl(key) ?? (await prefetchGestureImageUrl(remoteUrl, key));
        if (!cancelled) {
          setSrc(objectUrl);
          setLoading(false);
        }
        for (let i = index + 1; i <= index + 2 && i < queue.length; i += 1) {
          const next = queue[i]!;
          if (getCachedGestureImageUrl(next.driveFileId)) continue;
          const nextUrl = await resolveGestureReferenceImageUrl(accessToken, next.driveFileId);
          void prefetchGestureImageUrl(nextUrl, next.driveFileId).catch(() => {
            void preloadGestureImageViaElement(nextUrl).catch(() => undefined);
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load image.');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, current, index, queue]);

  return { src, loading, error };
}
