import Dexie, { type EntityTable } from 'dexie';

import type { ZineboxCollection, ZineboxComic, ZineboxComicFile } from '../types';

export class ZineboxDb extends Dexie {
  comics!: EntityTable<ZineboxComic, 'id'>;
  collections!: EntityTable<ZineboxCollection, 'id'>;
  comicFiles!: EntityTable<ZineboxComicFile, 'comicId'>;

  constructor() {
    super('zinebox');
    this.version(1).stores({
      comics: 'id, source, readStatus',
      collections: 'id',
    });
    this.version(2).stores({
      comicFiles: 'comicId',
    });
  }
}

export const zineboxDb = new ZineboxDb();
