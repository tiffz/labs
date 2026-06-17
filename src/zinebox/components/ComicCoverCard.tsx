import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import type { ZineboxComic } from '../types';

type ComicCoverCardProps = {
  comic: ZineboxComic;
  onOpen: (comicId: string) => void;
};

export default function ComicCoverCard({
  comic,
  onOpen,
}: ComicCoverCardProps): React.ReactElement {
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
      <button
        type="button"
        className="zinebox-cover-card__button"
        onClick={() => onOpen(comic.id)}
        aria-label={`Open ${comic.title}`}
      >
        <div className="zinebox-cover-card__cover">
          <img src={comic.coverThumbnailBase64} alt="" className="zinebox-cover-card__image" />
          {comic.readStatus === 'unread' ? (
            <span className="zinebox-cover-card__unread-dot" aria-hidden />
          ) : null}
        </div>
        <p className="zinebox-cover-card__title">{comic.title}</p>
        <p className="zinebox-cover-card__source">{comic.source}</p>
      </button>
    </article>
  );
}
