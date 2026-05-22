import { getLevelConfig } from '../levels';
import type { PracticeGenConstraints } from '../progress/types';
import type { FlashcardChallenge } from '../types';
import { generateAlbersFlashcardChallenge } from './albersFlashcard';
import { generateIsolatedFlashcardChallenge } from './isolatedFlashcard';

export function generateFlashcardChallenge(
  seed: number,
  level: number,
  constraints?: PracticeGenConstraints,
): FlashcardChallenge {
  const cfg = getLevelConfig(level);
  if (cfg.flashcardKind === 'albers') {
    return generateAlbersFlashcardChallenge(seed, level, constraints);
  }
  return generateIsolatedFlashcardChallenge(seed, level, constraints);
}
