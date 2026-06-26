import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { memo } from 'react';

import { handleSpaLinkClick } from '../routes/zineboxHash';
import { zineboxReadHref, type ZineboxReaderParams } from '../routes/zineboxHash';
import type { ZineboxComic } from '../types';
import ZineboxCoverReadIndicators from './ZineboxCoverReadIndicators';
import ZineboxSearchHighlight from './ZineboxSearchHighlight';
import {
  summarizeComicCoverRead,
  zineboxComicOpenAriaLabel,
} from '../utils/zineboxCoverReadSummary';

type ComicCoverCardProps = {
  comic: ZineboxComic;
  readerParams: ZineboxReaderParams;
  searchQuery?: string | null;
  onOpen: (comicId: string) => void;
};

export default memo(function ComicCoverCard({
  comic,
  readerParams,
  searchQuery,
  onOpen,
}: ComicCoverCardProps): React.ReactElement {
  const readHref = zineboxReadHref(comic.id, readerParams);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: comic.id,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: comic.id });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <article
      ref={(node) => {
        setNodeRef(node);
        setDropRef(node);
      }}
      className={[
        'zinebox-cover-card',
        isDragging ? 'zinebox-cover-card--dragging' : '',
        isOver ? 'zinebox-cover-card--drop-target' : '',
        comic.readStatus === 'unread' ? 'zinebox-cover-card--unread' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      {...listeners}
      {...attributes}
    >
      <a
        href={readHref}
        className="zinebox-cover-card__button"
        onClick={(e) => handleSpaLinkClick(e, () => onOpen(comic.id))}
        aria-label={zineboxComicOpenAriaLabel(
          comic.title,
          comic.readStatus,
          comic.progressPercentage,
        )}
      >
        <div className="zinebox-cover-card__cover">
          <img
            src={comic.coverThumbnailBase64}
            alt=""
            className="zinebox-cover-card__image"
            loading="lazy"
            decoding="async"
          />
          <ZineboxCoverReadIndicators {...summarizeComicCoverRead(comic)} />
        </div>
        <p className="zinebox-cover-card__title">
          <ZineboxSearchHighlight text={comic.title} query={searchQuery} />
        </p>
        <p className="zinebox-cover-card__source">
          <ZineboxSearchHighlight text={comic.source} query={searchQuery} />
        </p>
      </a>
    </article>
  );
});
