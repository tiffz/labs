import type { CompareChallenge } from '../../types';

export function scoreCompare(
  challenge: CompareChallenge,
  picked: 'left' | 'right',
  simulatePass: boolean | null,
): { passed: boolean } {
  const passed = picked === challenge.correctSide;
  if (simulatePass !== null) return { passed: simulatePass };
  return { passed };
}
