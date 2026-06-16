import { useEffect, useMemo, useRef } from 'react';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import { resolveGesturePackCoverFileIds, useGesturePackStats } from './useGesturePackStats';
import { useGesturePacks } from './useGesturePacks';
import {
  peekGesturePreviewUrl,
  resolveGesturePreviewImageUrl,
} from '../media/gesturePreviewImageUrl';
import { GESTURE_COMPACT_PREVIEW_THUMB_WIDTH } from '../media/gestureMediaPolicy';

const WARMUP_CONCURRENCY = 6;
/** Cap idle warmup so large libraries defer to viewport-gated card fetches. */
const WARMUP_MAX_FILE_IDS = 24;

function scheduleIdle(task: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => task(), { timeout: 3000 });
  } else {
    setTimeout(task, 32);
  }
}

async function runWarmupQueue(fileIds: string[], accessToken: string | null): Promise<void> {
  const pending = fileIds.filter(
    (id) => !peekGesturePreviewUrl(id, GESTURE_COMPACT_PREVIEW_THUMB_WIDTH),
  );
  if (pending.length === 0) return;

  let index = 0;
  async function worker(): Promise<void> {
    while (index < pending.length) {
      const fileId = pending[index];
      index += 1;
      if (!fileId) continue;
      try {
        await resolveGesturePreviewImageUrl(
          accessToken,
          fileId,
          GESTURE_COMPACT_PREVIEW_THUMB_WIDTH,
        );
      } catch {
        /* best-effort */
      }
    }
  }

  await Promise.all(Array.from({ length: WARMUP_CONCURRENCY }, () => worker()));
}

/** Background preview warmup for collection cover thumbnails (Collections tab only). */
export function useGestureMediaWarmup(enabled = true): void {
  const { packs, packsHydrated } = useGesturePacks();
  const { coverIds } = useGesturePackStats();
  const runIdRef = useRef(0);

  const coverFileIds = useMemo(() => {
    const ids = new Set<string>();
    for (const pack of packs) {
      if (pack.coverFileIds?.length) {
        for (const id of pack.coverFileIds.slice(0, 4)) {
          if (id) ids.add(id);
        }
        continue;
      }
      for (const id of resolveGesturePackCoverFileIds(pack, coverIds)) {
        if (id) ids.add(id);
      }
    }
    return [...ids].slice(0, WARMUP_MAX_FILE_IDS);
  }, [coverIds, packs]);

  useEffect(() => {
    if (!enabled || !packsHydrated || coverFileIds.length === 0) return;
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    let cancelled = false;

    scheduleIdle(() => {
      void (async () => {
        const token = await readGestureDriveAccessToken();
        if (cancelled || runIdRef.current !== runId) return;
        await runWarmupQueue(coverFileIds, token);
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [coverFileIds, enabled, packsHydrated]);
}
