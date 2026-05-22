import { scoreAnchorPivot } from '../../generators/anchorPivot';
import type { AnchorPivotChallenge, PracticeReveal } from '../../types';

export function scoreAnchorPivotReveal(
  challenge: AnchorPivotChallenge,
  pivotHue: number,
  simulatePass: boolean | null,
): Extract<PracticeReveal, { kind: 'anchor-pivot' }> {
  if (simulatePass !== null) {
    return {
      kind: 'anchor-pivot',
      passed: simulatePass,
      angularScore: simulatePass ? 95 : 50,
      maxAngularError: simulatePass ? 4 : 20,
    };
  }
  const r = scoreAnchorPivot(challenge, pivotHue);
  return {
    kind: 'anchor-pivot',
    passed: r.passed,
    angularScore: r.angularScore,
    maxAngularError: r.maxAngularError,
  };
}
