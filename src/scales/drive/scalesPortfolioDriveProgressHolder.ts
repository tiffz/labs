import type { ScalesProgressData } from '../progress/types';

/** Mutable holder so portfolio Drive config can read latest store progress without a 400-line hook. */
let current: ScalesProgressData | null = null;

export function setScalesPortfolioDriveProgress(progress: ScalesProgressData): void {
  current = progress;
}

export function readScalesPortfolioDriveLocalPayload(): ScalesProgressData {
  if (!current) {
    throw new Error('Scales portfolio Drive progress not initialized');
  }
  return current;
}
