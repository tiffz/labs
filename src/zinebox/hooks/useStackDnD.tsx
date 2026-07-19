import { useCallback, useMemo, useState } from 'react';
import {
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';

import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import {
  appendComicToStackUndoable,
  createStackFromComicsUndoable,
} from '../undo/zineboxUndoableMutations';
import type { ZineboxCollection, ZineboxComic } from '../types';

export function useStackDnD(
  comics: ZineboxComic[],
  collections: ZineboxCollection[],
): {
  sensors: ReturnType<typeof useSensors>;
  activeComic: ZineboxComic | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  dndContextProps: {
    sensors: ReturnType<typeof useSensors>;
    onDragStart: (event: DragStartEvent) => void;
    onDragEnd: (event: DragEndEvent) => void;
  };
  dragOverlay: React.ReactNode;
} {
  const [activeComic, setActiveComic] = useState<ZineboxComic | null>(null);
  const { push } = useLabsUndo();

  const comicsById = useMemo(() => new Map(comics.map((c) => [c.id, c])), [comics]);
  const collectionsById = useMemo(
    () => new Map(collections.map((c) => [c.id, c])),
    [collections],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      setActiveComic(comicsById.get(id) ?? null);
    },
    [comicsById],
  );

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveComic(null);
      const activeId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : null;
      if (!overId || activeId === overId) return;

      const activeComicItem = comicsById.get(activeId);
      if (!activeComicItem) return;

      const overStack = collectionsById.get(overId);
      if (overStack) {
        const commit = await appendComicToStackUndoable(overStack, activeId, comicsById);
        if (commit) push(commit);
        return;
      }

      const overComic = comicsById.get(overId);
      if (!overComic) return;
      const { commit } = await createStackFromComicsUndoable(
        [activeComicItem, overComic],
        comicsById,
      );
      push(commit);
    },
    [collectionsById, comicsById, push],
  );

  const dndContextProps = useMemo(
    () => ({ sensors, onDragStart, onDragEnd }),
    [sensors, onDragStart, onDragEnd],
  );

  const dragOverlay = (
    <DragOverlay>
      {activeComic ? (
        <div className="zinebox-cover-card zinebox-cover-card--dragging">
          <img
            src={activeComic.coverThumbnailBase64}
            alt=""
            className="zinebox-cover-card__image"
          />
        </div>
      ) : null}
    </DragOverlay>
  );

  return {
    sensors,
    activeComic,
    onDragStart,
    onDragEnd,
    dndContextProps,
    dragOverlay,
  };
}
