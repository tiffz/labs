import { zineboxDb } from '../db/zineboxDb';
import type { ZineboxSyncPayload } from './zineboxDriveEnvelope';

export async function readZineboxLocalPayload(): Promise<ZineboxSyncPayload> {
  const [comics, collections] = await Promise.all([
    zineboxDb.comics.toArray(),
    zineboxDb.collections.toArray(),
  ]);
  return { comics, collections };
}

export async function writeZineboxLocalPayload(payload: ZineboxSyncPayload): Promise<void> {
  await zineboxDb.transaction('rw', zineboxDb.comics, zineboxDb.collections, async () => {
    const comicIds = new Set(payload.comics.map((c) => c.id));
    const collectionIds = new Set(payload.collections.map((c) => c.id));
    const existingComics = await zineboxDb.comics.toArray();
    const existingCollections = await zineboxDb.collections.toArray();
    for (const comic of existingComics) {
      if (!comicIds.has(comic.id)) await zineboxDb.comics.delete(comic.id);
    }
    for (const collection of existingCollections) {
      if (!collectionIds.has(collection.id)) await zineboxDb.collections.delete(collection.id);
    }
    for (const comic of payload.comics) {
      await zineboxDb.comics.put(comic);
    }
    for (const collection of payload.collections) {
      await zineboxDb.collections.put(collection);
    }
  });
}
