import { useEffect, useMemo, useState } from 'react';

import { resolveGestureReferenceImageUrl } from '../media/gestureThumbnailLinkCache';
import {
  getCachedGestureImageUrl,
  preloadGestureImageViaElement,
  resolveGestureSessionImageSrc,
  retainGesturePrefetchKeys,
  dropGesturePrefetchEntry,
} from '../media/gestureImagePrefetchCache';
import {
  isGestureSessionPhotoDisplayReady,
  markGestureSessionPhotoDisplayReady,
  unmarkGestureSessionPhotoDisplayReady,
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
    const prev = queue[index - 1];
    if (prev) keys.push(prev.driveFileId);
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
    setVisibleSrc(null);

    const cached = getCachedGestureImageUrl(key);
    if (isGestureSessionPhotoDisplayReady(key) && cached) {
      setSrc(cached);
      setDisplayReady(true);
      setLoading(false);
      return;
    }
    if (isGestureSessionPhotoDisplayReady(key) && !cached) {
      unmarkGestureSessionPhotoDisplayReady(key);
    }

    if (cached) {
      setSrc(cached);
      setDisplayReady(false);
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
    if (!src || !current?.driveFileId) {
      setDisplayReady(false);
      return;
    }
    let cancelled = false;
    void preloadGestureImageViaElement(src)
      .then(() => {
        if (!cancelled) {
          markGestureSessionPhotoDisplayReady(current.driveFileId);
          setDisplayReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          unmarkGestureSessionPhotoDisplayReady(current.driveFileId);
          dropGesturePrefetchEntry(current.driveFileId);
          setDisplayReady(false);
          setVisibleSrc(null);
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
