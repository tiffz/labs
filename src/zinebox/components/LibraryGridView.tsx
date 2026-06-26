import { memo, useMemo } from 'react';

import type { ZineboxCollection, ZineboxComic } from '../types';
import type { ZineboxReaderParams } from '../routes/zineboxHash';
import ComicCoverCard from './ComicCoverCard';
import StackCoverCard from './StackCoverCard';

type LibraryGridViewProps = {
  comics: ZineboxComic[];
  collections: ZineboxCollection[];
  stackedComicIds: ReadonlySet<string>;
  comicsById: ReadonlyMap<string, ZineboxComic>;
  searchQuery?: string | null;
  readerParams: ZineboxReaderParams;
  onOpenComic: (comicId: string) => void;
  onOpenStack: (collection: ZineboxCollection) => void;
};

function LibraryGridView({
  comics,
  collections,
  stackedComicIds,
  comicsById,
  searchQuery,
  readerParams,
  onOpenComic,
  onOpenStack,
}: LibraryGridViewProps): React.ReactElement {
  const looseComics = useMemo(
    () => comics.filter((comic) => !stackedComicIds.has(comic.id)),
    [comics, stackedComicIds],
  );

  return (
    <div className="zinebox-library-grid">
      {collections.map((collection) => (
        <StackCoverCard
          key={collection.id}
          collection={collection}
          comicsById={comicsById}
          searchQuery={searchQuery}
          onOpenStack={onOpenStack}
        />
      ))}
      {looseComics.map((comic) => (
        <ComicCoverCard
          key={comic.id}
          comic={comic}
          readerParams={readerParams}
          searchQuery={searchQuery}
          onOpen={onOpenComic}
        />
      ))}
    </div>
  );
}

export default memo(LibraryGridView);
