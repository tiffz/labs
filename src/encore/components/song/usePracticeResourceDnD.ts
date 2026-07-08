import { PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useCallback } from 'react';
import type { EncoreSong } from '../../types';
import { applyPracticeResourceDragEnd } from '../../repertoire/practiceResourceOrder';

export type PracticeResourceSongChange = (
  updater: EncoreSong | ((before: EncoreSong) => EncoreSong),
  undoLabel?: string,
) => void;

export function usePracticeResourceDnDHandlers(onSongChange: PracticeResourceSongChange): {
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
} {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      onSongChange(
        (before) => applyPracticeResourceDragEnd(before, event),
        'Reorder practice resource',
      );
    },
    [onSongChange],
  );

  return { sensors, onDragEnd };
}
