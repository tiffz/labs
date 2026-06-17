import { useCallback, useMemo, useState } from 'react';
import {
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';

import { sortComicIdsNatural } from '../collections/naturalSortComics';
import { zineboxDb } from '../db/zineboxDb';
import { notifyZineboxLocalChange } from '../db/zineboxChangeBus';
import type { ZineboxCollection, ZineboxComic } from '../types';

function newCollectionId(): string {
  return `stack-${crypto.randomUUID()}`;
}

async function createStackFromComics(
  comics: ZineboxComic[],
  comicsById: ReadonlyMap<string, ZineboxComic>,
): Promise<void> {
  const itemIds = comics.map((c) => c.id);
  const customSortOrder = sortComicIdsNatural(comicsById, itemIds);
  const name = `Stack · ${comics[0]?.title ?? 'Collection'}`;
  const collection: ZineboxCollection = {
    id: newCollectionId(),
    name,
    itemIds,
    customSortOrder,
  };
  await zineboxDb.collections.put(collection);
}

async function appendComicToStack(
  collection: ZineboxCollection,
  comicId: string,
  comicsById: ReadonlyMap<string, ZineboxComic>,
): Promise<void> {
  if (collection.itemIds.includes(comicId)) return;
  const itemIds = [...collection.itemIds, comicId];
  const customSortOrder = sortComicIdsNatural(comicsById, itemIds);
  await zineboxDb.collections.update(collection.id, { itemIds, customSortOrder });
}

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
        await appendComicToStack(overStack, activeId, comicsById);
        notifyZineboxLocalChange();
        return;
      }

      const overComic = comicsById.get(overId);
      if (!overComic) return;
      await createStackFromComics([activeComicItem, overComic], comicsById);
      notifyZineboxLocalChange();
    },
    [collectionsById, comicsById],
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
