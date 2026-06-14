import { useMemo } from 'react';
import { buildGestureSessionQueueFromConfig } from '../session/gestureSessionQueueFromConfig';
import { useGestureSessionPhotoPipeline } from './useGestureSessionPhotoPipeline';
import type { GestureDrawRecord, GesturePackFile, SessionConfig } from '../types';

type UseGestureSessionWarmupInput = {
  config: Omit<SessionConfig, 'queue'>;
  packFiles: GesturePackFile[];
  drawHistory: GestureDrawRecord[];
  enabled?: boolean;
};

/** Continuously prefetches the first session photo while the user configures practice. */
export function useGestureSessionWarmup({
  config,
  packFiles,
  drawHistory,
  enabled = true,
}: UseGestureSessionWarmupInput): { firstPhotoReady: boolean } {
  const queue = useMemo(
    () => buildGestureSessionQueueFromConfig(config, packFiles, drawHistory),
    [config, drawHistory, packFiles],
  );

  const { headReady } = useGestureSessionPhotoPipeline({
    queue,
    headIndex: 0,
    aheadIndex: null,
    enabled: enabled && queue.length > 0,
  });

  return { firstPhotoReady: headReady };
}

/** Prefetch the first photo for an imminent restart (debrief screen). */
export function useGestureRestartWarmup(
  config: SessionConfig | null,
  packFiles: GesturePackFile[],
  drawHistory: GestureDrawRecord[],
): void {
  const queue = useMemo(() => {
    if (!config) return [];
    if (config.queue?.length) return config.queue;
    return buildGestureSessionQueueFromConfig(config, packFiles, drawHistory);
  }, [config, drawHistory, packFiles]);

  useGestureSessionPhotoPipeline({
    queue,
    headIndex: 0,
    aheadIndex: null,
    enabled: Boolean(config && queue.length > 0),
  });
}
