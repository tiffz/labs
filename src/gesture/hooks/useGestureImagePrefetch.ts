import { useEffect, useMemo, useState } from 'react';

import { resolveGestureReferenceImageUrl } from '../media/gestureThumbnailLinkCache';
import {
  getCachedGestureImageUrl,
  preloadGestureImageViaElement,
  resolveGestureSessionImageSrc,
  retainGesturePrefetchKeys,
} from '../media/gestureImagePrefetchCache';
import type { SessionQueueItem } from '../types';

async function prefetchQueueItem(
  accessToken: string | null,
  item: SessionQueueItem,
): Promise<void> {
  if (getCachedGestureImageUrl(item.driveFileId)) return;
  const remoteUrl = await resolveGestureReferenceImageUrl(accessToken, item.driveFileId);
  await resolveGestureSessionImageSrc(accessToken, item.driveFileId, remoteUrl, item.name);
}

export function useGestureImagePrefetch(
  queue: SessionQueueItem[],
  index: number,
  accessToken: string | null,
): { src: string | null; ready: boolean; loading: boolean; error: string | null } {
  const current = queue[index] ?? null;
  const [src, setSrc] = useState<string | null>(null);
  const [displayReady, setDisplayReady] = useState(false);
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
      setDisplayReady(false);
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
      setSrc(null);
      setDisplayReady(false);
      setLoading(true);
      setError(null);
    }

    void (async () => {
      try {
        const remoteUrl = await resolveGestureReferenceImageUrl(accessToken, key);
        const displayUrl = await resolveGestureSessionImageSrc(
          accessToken,
          key,
          remoteUrl,
          current.name,
        );
        if (!cancelled) {
          setSrc(displayUrl);
          setLoading(false);
        }
        const warmItems = queue.slice(index + 1, index + 3);
        await Promise.all(
          warmItems.map((item) => prefetchQueueItem(accessToken, item).catch(() => undefined)),
        );
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

  useEffect(() => {
    if (!src) {
      setDisplayReady(false);
      return;
    }
    let cancelled = false;
    void preloadGestureImageViaElement(src)
      .then(() => {
        if (!cancelled) setDisplayReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayReady(false);
          setError('Could not load image.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const ready = Boolean(src) && displayReady;

  return { src, ready, loading: loading || (Boolean(src) && !displayReady), error };
}
