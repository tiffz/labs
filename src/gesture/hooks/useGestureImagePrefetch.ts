import { useEffect, useMemo, useState } from 'react';

import { resolveGestureReferenceImageUrl } from '../media/gestureThumbnailLinkCache';
import {
  getCachedGestureImageUrl,
  preloadGestureImageViaElement,
  resolveGestureSessionImageSrc,
  retainGesturePrefetchKeys,
} from '../media/gestureImagePrefetchCache';
import {
  isGestureSessionPhotoDisplayReady,
  markGestureSessionPhotoDisplayReady,
} from '../media/gestureSessionPhotoPipeline';
import type { SessionQueueItem } from '../types';

export function useGestureImagePrefetch(
  queue: SessionQueueItem[],
  index: number,
  accessToken: string | null,
): { src: string | null; ready: boolean; loading: boolean; error: string | null } {
  const current = queue[index] ?? null;
  const [src, setSrc] = useState<string | null>(null);
  const [displayReady, setDisplayReady] = useState(false);
  /** Keep the last decoded photo visible while the next one loads (avoids blank/broken frames). */
  const [visibleSrc, setVisibleSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const windowKeys = useMemo(() => {
    const keys: string[] = [];
    const cur = queue[index];
    if (cur) keys.push(cur.driveFileId);
    const next = queue[index + 1];
    if (next) keys.push(next.driveFileId);
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
      setVisibleSrc(null);
      setLoading(false);
      setError(null);
      return;
    }

    const key = current.driveFileId;
    setError(null);

    if (isGestureSessionPhotoDisplayReady(key)) {
      const cached = getCachedGestureImageUrl(key);
      if (cached) {
        setSrc(cached);
        setDisplayReady(true);
        setLoading(false);
        return;
      }
    }

    const cached = getCachedGestureImageUrl(key);
    if (cached) {
      setSrc(cached);
      setLoading(false);
    } else {
      setSrc(null);
      setDisplayReady(false);
      setLoading(true);
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
    if (isGestureSessionPhotoDisplayReady(current?.driveFileId ?? '')) {
      setDisplayReady(true);
      return;
    }
    let cancelled = false;
    void preloadGestureImageViaElement(src)
      .then(() => {
        if (!cancelled) {
          if (current?.driveFileId) markGestureSessionPhotoDisplayReady(current.driveFileId);
          setDisplayReady(true);
        }
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
  }, [current?.driveFileId, src]);

  useEffect(() => {
    if (displayReady && src) {
      setVisibleSrc(src);
    }
  }, [displayReady, src]);

  const ready = Boolean(src) && displayReady;

  return {
    src: visibleSrc,
    ready,
    loading: loading || (Boolean(src) && !displayReady),
    error,
  };
}
