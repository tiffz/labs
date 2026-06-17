import type { ZineboxCollection, ZineboxComic } from '../types';
import ComicCoverCard from './ComicCoverCard';
import StackCoverCard from './StackCoverCard';

type LibraryGridViewProps = {
  comics: ZineboxComic[];
  collections: ZineboxCollection[];
  stackedComicIds: ReadonlySet<string>;
  comicsById: ReadonlyMap<string, ZineboxComic>;
  onOpenComic: (comicId: string) => void;
  onOpenStack: (collection: ZineboxCollection) => void;
};

export default function LibraryGridView({
  comics,
  collections,
  stackedComicIds,
  comicsById,
  onOpenComic,
  onOpenStack,
}: LibraryGridViewProps): React.ReactElement {
  const looseComics = comics.filter((comic) => !stackedComicIds.has(comic.id));

  return (
    <div className="zinebox-library-grid">
      {collections.map((collection) => (
        <StackCoverCard
          key={collection.id}
          collection={collection}
          comicsById={comicsById}
          onOpenStack={onOpenStack}
        />
      ))}
      {looseComics.map((comic) => (
        <ComicCoverCard key={comic.id} comic={comic} onOpen={onOpenComic} />
      ))}
    </div>
  );
}
