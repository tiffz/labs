import { useEffect, useRef, useState } from 'react';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import {
  isGestureSessionPhotoDisplayReady,
  prefetchGestureSessionQueuePhoto,
} from '../media/gestureSessionPhotoPipeline';
import type { SessionQueueItem } from '../types';

type UseGestureSessionPhotoPipelineOptions = {
  queue: SessionQueueItem[];
  /** Queue index to keep display-ready (0 before session / restart). */
  headIndex?: number;
  /** When set, also prefetch this index (typically current + 1 during zen). */
  aheadIndex?: number | null;
  enabled?: boolean;
};

/**
 * Keeps at most two photos warm: the head (next to show) and one ahead.
 * Before session start, only the first photo is prefetched.
 */
export function useGestureSessionPhotoPipeline({
  queue,
  headIndex = 0,
  aheadIndex = null,
  enabled = true,
}: UseGestureSessionPhotoPipelineOptions): {
  headReady: boolean;
} {
  const [headReady, setHeadReady] = useState(false);
  const runIdRef = useRef(0);
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const headItem = queue[headIndex];
  const headId = headItem?.driveFileId ?? '';
  const queueKey = queue.map((item) => item.driveFileId).join(',');

  useEffect(() => {
    if (!enabled || !headId) {
      setHeadReady(false);
      return;
    }

    setHeadReady(isGestureSessionPhotoDisplayReady(headId));

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    let cancelled = false;

    void (async () => {
      const token = await readGestureDriveAccessToken();
      if (cancelled || runIdRef.current !== runId) return;

      const activeQueue = queueRef.current;
      await prefetchGestureSessionQueuePhoto(token, activeQueue, headIndex);
      if (cancelled || runIdRef.current !== runId) return;

      if (aheadIndex != null && aheadIndex !== headIndex) {
        await prefetchGestureSessionQueuePhoto(token, activeQueue, aheadIndex);
      }

      if (!cancelled && runIdRef.current === runId) {
        setHeadReady(isGestureSessionPhotoDisplayReady(headId));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [aheadIndex, enabled, headId, headIndex, queueKey]);

  return { headReady };
}
