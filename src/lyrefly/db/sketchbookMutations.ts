import { notifyLyreflyLocalChange } from './lyreflyChangeBus';
import { lyreflyDb } from './lyreflyDb';
import type { SketchbookSeed } from '../types';

export async function putSketchbookSeed(seed: SketchbookSeed, blob?: Blob | null): Promise<void> {
  await lyreflyDb.transaction('rw', [lyreflyDb.sketchbookSeeds, lyreflyDb.sketchbookBlobs], async () => {
    await lyreflyDb.sketchbookSeeds.put(seed);
    if (blob) {
      await lyreflyDb.sketchbookBlobs.put({ seedId: seed.id, blob });
    }
  });
  notifyLyreflyLocalChange();
}

export async function loadSketchbookBlob(seedId: string): Promise<Blob | null> {
  const row = await lyreflyDb.sketchbookBlobs.get(seedId);
  return row?.blob ?? null;
}
