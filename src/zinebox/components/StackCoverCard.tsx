import { useDroppable } from '@dnd-kit/core';
import { memo, useMemo } from 'react';

import { sortComicIdsNatural } from '../collections/naturalSortComics';
import type { ZineboxCollection, ZineboxComic } from '../types';
import {
  summarizeStackCoverRead,
  zineboxStackIssueCountLabel,
} from '../utils/zineboxCoverReadSummary';
import ZineboxCoverReadIndicators from './ZineboxCoverReadIndicators';
import ZineboxStackIssueBadge from './ZineboxStackIssueBadge';
import ZineboxSearchHighlight from './ZineboxSearchHighlight';

const MAX_STACK_PREVIEW_COVERS = 3;

type StackCoverCardProps = {
  collection: ZineboxCollection;
  comicsById: ReadonlyMap<string, ZineboxComic>;
  searchQuery?: string | null;
  onOpenStack: (collection: ZineboxCollection) => void;
};

export default memo(function StackCoverCard({
  collection,
  comicsById,
  searchQuery,
  onOpenStack,
}: StackCoverCardProps): React.ReactElement {
  const { setNodeRef, isOver } = useDroppable({ id: collection.id });

  const sortedIds = useMemo(
    () => sortComicIdsNatural(comicsById, collection.itemIds, collection.customSortOrder),
    [collection.customSortOrder, collection.itemIds, comicsById],
  );

  const previewIds = useMemo(() => {
    const ids = sortedIds.slice(0, MAX_STACK_PREVIEW_COVERS);
    return ids.length > 0 ? ids : collection.itemIds.slice(0, MAX_STACK_PREVIEW_COVERS);
  }, [collection.itemIds, sortedIds]);

  const count = collection.itemIds.length;
  const stackComics = useMemo(
    () =>
      collection.itemIds
        .map((id) => comicsById.get(id))
        .filter((comic): comic is ZineboxComic => comic != null),
    [collection.itemIds, comicsById],
  );
  const readSummary = useMemo(() => summarizeStackCoverRead(stackComics), [stackComics]);

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
        aria-label={`Open stack ${collection.name}, ${zineboxStackIssueCountLabel(count)}`}
      >
        <div className="zinebox-stack-card__pile">
          {previewIds.length > 0 ? (
            previewIds.map((comicId, index) => {
              const comic = comicsById.get(comicId);
              const layer = previewIds.length - 1 - index;
              return (
                <div
                  key={comicId}
                  className={`zinebox-stack-card__layer zinebox-stack-card__layer--${layer}`}
                  aria-hidden={index > 0}
                >
                  {comic ? (
                    <img
                      src={comic.coverThumbnailBase64}
                      alt=""
                      className="zinebox-cover-card__image"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="zinebox-stack-card__placeholder" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="zinebox-stack-card__layer zinebox-stack-card__layer--0">
              <div className="zinebox-stack-card__placeholder" aria-hidden />
            </div>
          )}
          <div className="zinebox-stack-card__front">
            <ZineboxStackIssueBadge count={count} />
            <ZineboxCoverReadIndicators {...readSummary} />
          </div>
        </div>
        <p className="zinebox-cover-card__title">
          <ZineboxSearchHighlight text={collection.name} query={searchQuery} />
        </p>
      </button>
    </article>
  );
});
