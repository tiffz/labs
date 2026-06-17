import { useDroppable } from '@dnd-kit/core';
import { useMemo } from 'react';

import { sortComicIdsNatural } from '../collections/naturalSortComics';
import type { ZineboxCollection, ZineboxComic } from '../types';

type StackCoverCardProps = {
  collection: ZineboxCollection;
  comicsById: ReadonlyMap<string, ZineboxComic>;
  onOpenStack: (collection: ZineboxCollection) => void;
};

export default function StackCoverCard({
  collection,
  comicsById,
  onOpenStack,
}: StackCoverCardProps): React.ReactElement {
  const { setNodeRef, isOver } = useDroppable({ id: collection.id });

  const sortedIds = useMemo(
    () => sortComicIdsNatural(comicsById, collection.itemIds, collection.customSortOrder),
    [collection.customSortOrder, collection.itemIds, comicsById],
  );

  const primaryComic = comicsById.get(sortedIds[0] ?? '');
  const count = collection.itemIds.length;

  return (
    <article
      ref={setNodeRef}
      className={[
        'zinebox-stack-card',
        isOver ? 'zinebox-stack-card--drop-target' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="zinebox-stack-card__button"
        onClick={() => onOpenStack(collection)}
        aria-label={`Open stack ${collection.name}, ${count} issues`}
      >
        <div className="zinebox-stack-card__pile">
          <div className="zinebox-stack-card__edge zinebox-stack-card__edge--back" aria-hidden />
          <div className="zinebox-stack-card__edge zinebox-stack-card__edge--mid" aria-hidden />
          <div className="zinebox-stack-card__cover">
            {primaryComic ? (
              <img
                src={primaryComic.coverThumbnailBase64}
                alt=""
                className="zinebox-cover-card__image"
              />
            ) : (
              <div className="zinebox-stack-card__placeholder" aria-hidden />
            )}
            <span className="zinebox-stack-card__badge">{count}</span>
          </div>
        </div>
        <p className="zinebox-cover-card__title">{collection.name}</p>
      </button>
    </article>
  );
}
