import { useEffect, useMemo, useRef } from 'react';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import { resolveGesturePackCoverFileIds, useGesturePackStats } from './useGesturePackStats';
import { useGesturePacks } from './useGesturePacks';
import {
  peekGesturePreviewUrl,
  resolveGesturePreviewImageUrl,
} from '../media/gesturePreviewImageUrl';

const WARMUP_CONCURRENCY = 6;

function scheduleIdle(task: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => task(), { timeout: 3000 });
  } else {
    setTimeout(task, 32);
  }
}

async function runWarmupQueue(fileIds: string[], accessToken: string | null): Promise<void> {
  const pending = fileIds.filter((id) => !peekGesturePreviewUrl(id));
  if (pending.length === 0) return;

  let index = 0;
  async function worker(): Promise<void> {
    while (index < pending.length) {
      const fileId = pending[index];
      index += 1;
      if (!fileId) continue;
      try {
        await resolveGesturePreviewImageUrl(accessToken, fileId);
      } catch {
        /* best-effort */
      }
    }
  }

  await Promise.all(Array.from({ length: WARMUP_CONCURRENCY }, () => worker()));
}

/** Background preview warmup for collection cover thumbnails after Dexie hydrates. */
export function useGestureMediaWarmup(): void {
  const { packs, packsHydrated } = useGesturePacks();
  const { coverIds } = useGesturePackStats();
  const runIdRef = useRef(0);

  const coverFileIds = useMemo(() => {
    const ids = new Set<string>();
    for (const pack of packs) {
      for (const id of resolveGesturePackCoverFileIds(pack, coverIds)) {
        if (id) ids.add(id);
      }
    }
    return [...ids];
  }, [coverIds, packs]);

  useEffect(() => {
    if (!packsHydrated || coverFileIds.length === 0) return;
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
  }, [coverFileIds, packsHydrated]);
}
