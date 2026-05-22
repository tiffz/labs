import { getLevelConfig } from '../levels';
import type { FlashcardChallenge } from '../types';
import { generateAlbersFlashcardChallenge } from './albersFlashcard';
import { generateIsolatedFlashcardChallenge } from './isolatedFlashcard';

export function generateFlashcardChallenge(seed: number, level: number): FlashcardChallenge {
  const cfg = getLevelConfig(level);
  if (cfg.flashcardKind === 'albers') {
    return generateAlbersFlashcardChallenge(seed, level);
  }
  return generateIsolatedFlashcardChallenge(seed, level);
}
