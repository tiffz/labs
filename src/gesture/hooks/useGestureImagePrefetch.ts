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
  const driveFileId = queue[index]?.driveFileId ?? '';
  const fileName = queue[index]?.name;
  const queueKey = useMemo(() => queue.map((item) => item.driveFileId).join(','), [queue]);
  const queueIds = useMemo(
    () => (queueKey.length > 0 ? queueKey.split(',') : []),
    [queueKey],
  );

  const [src, setSrc] = useState<string | null>(null);
  const [displayReady, setDisplayReady] = useState(false);
  /** Keep the last decoded photo visible while the next one loads (avoids blank/broken frames). */
  const [visibleSrc, setVisibleSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const windowKeys = useMemo(() => {
    const keys: string[] = [];
    const prev = queueIds[index - 1];
    if (prev) keys.push(prev);
    const cur = queueIds[index];
    if (cur) keys.push(cur);
    const next = queueIds[index + 1];
    if (next) keys.push(next);
    return keys;
  }, [index, queueIds]);

  useEffect(() => {
    retainGesturePrefetchKeys(windowKeys);
  }, [windowKeys]);

  useEffect(() => {
    let cancelled = false;
    if (!driveFileId) {
      setSrc(null);
      setDisplayReady(false);
      setVisibleSrc(null);
      setLoading(false);
      setError(null);
      return;
    }

    const key = driveFileId;
    setError(null);

    const cached = getCachedGestureImageUrl(key);
    if (isGestureSessionPhotoDisplayReady(key) && cached) {
      setSrc(cached);
      setVisibleSrc(cached);
      setDisplayReady(true);
      setLoading(false);
      return;
    }

    setVisibleSrc(null);
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
          fileName,
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
  }, [accessToken, driveFileId, fileName, index, queueKey]);

  useEffect(() => {
    if (!src || !driveFileId) {
      setDisplayReady(false);
      return;
    }
    if (isGestureSessionPhotoDisplayReady(driveFileId)) {
      setDisplayReady(true);
      return;
    }
    let cancelled = false;
    void preloadGestureImageViaElement(src)
      .then(() => {
        if (!cancelled) {
          markGestureSessionPhotoDisplayReady(driveFileId);
          setDisplayReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          unmarkGestureSessionPhotoDisplayReady(driveFileId);
          dropGesturePrefetchEntry(driveFileId);
          setDisplayReady(false);
          setVisibleSrc(null);
          setError('Could not load image.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [driveFileId, src]);

  useEffect(() => {
    if (displayReady && src) {
      setVisibleSrc(src);
    }
  }, [displayReady, src]);

  const ready = Boolean(visibleSrc) && displayReady;

  return {
    src: visibleSrc,
    ready,
    loading: loading || (Boolean(src) && !displayReady),
    error,
  };
}
