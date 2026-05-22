import type {
  AlbersFlashcardChallenge,
  IsolatedFlashcardChallenge,
} from '../../types';

export function scoreIsolatedFlashcard(
  challenge: IsolatedFlashcardChallenge,
  picked: 'left' | 'right',
  simulatePass: boolean | null,
): { passed: boolean } {
  const passed = picked === challenge.correctSide;
  if (simulatePass !== null) return { passed: simulatePass };
  return { passed };
}

export function scoreAlbersFlashcard(
  challenge: AlbersFlashcardChallenge,
  pick: { side?: 'left' | 'right'; binary?: 'same' | 'different' },
  simulatePass: boolean | null,
): { passed: boolean } {
  let passed = false;
  if (challenge.question === 'identity' && pick.binary) {
    passed = pick.binary === challenge.correctBinary;
  } else if (pick.side && challenge.correctSide) {
    passed = pick.side === challenge.correctSide;
  }
  if (simulatePass !== null) return { passed: simulatePass };
  return { passed };
}
