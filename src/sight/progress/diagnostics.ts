import type { SightProfile } from '../types';
import { passRateForTags } from './skillMatrix';
import type { GrowthDiagnostic, RepRecord } from './types';

const FOCUS_CLEAR_PASS_RATE = 0.8;
const FOCUS_CLEAR_MIN_REPS = 5;

export function evaluateDeficiencies(reps: RepRecord[]): GrowthDiagnostic | null {
  if (reps.length < 8) return null;

  const neutralValue = passRateForTags(reps, ['kind:flashcard-isolated', 'axis:lighter'], ['warm-bg']);
  const warmValue = passRateForTags(reps, ['warm-bg'], []);
  const warmAlbers = passRateForTags(reps, ['kind:flashcard-albers', 'warm-bg'], []);
  if (
    neutralValue !== null &&
    neutralValue >= 0.8 &&
    warmValue !== null &&
    warmValue < 0.5 &&
    warmAlbers !== null &&
    warmAlbers < 0.55
  ) {
    return {
      id: 'WARM_VALUE_BLINDNESS',
      label: 'Focus workout · warm backgrounds',
      description:
        'Value reads well on neutral fields but slips when backgrounds run warm or saturated.',
      severityScore: 1 - warmValue,
      remedyModule: 'contextual',
      remedyLevel: 14,
      forcedConstraints: {
        hueRange: [25, 55],
        minBackgroundChroma: 0.12,
        maxDeltaE: 4,
        contextualProfile: 'valueLocked',
      },
    };
  }

  const chromaFails = reps.filter(
    (r) =>
      r.kind === 'flashcard-isolated' &&
      (r.tags.includes('profile:chromaHard') || r.tags.includes('profile:chromaEasy')) &&
      !r.passed,
  );
  const hueLockedCtx = reps.filter(
    (r) => r.kind === 'contextual' && r.tags.some((t) => t.includes('hueLocked') || t.includes('hue')),
  );
  if (
    chromaFails.length >= 4 &&
    hueLockedCtx.length >= 3 &&
    chromaFails.length / Math.max(1, reps.length) > 0.25
  ) {
    return {
      id: 'CHROMA_OVER_STEERING',
      label: 'Focus workout · hue lock',
      description: 'Chroma guesses may be bleeding into hue. Practice holding hue steady while you match.',
      severityScore: chromaFails.length / reps.length,
      remedyModule: 'contextual',
      remedyLevel: 15,
      forcedConstraints: {
        contextualProfile: 'hueLocked',
        maxDeltaE: 3.5,
      },
    };
  }

  const tempRate = passRateForTags(reps, ['axis:warmer'], []);
  const tempCool = passRateForTags(reps, ['axis:cooler'], []);
  const valueOk = passRateForTags(reps, ['axis:lighter'], []);
  if (
    tempRate !== null &&
    tempCool !== null &&
    valueOk !== null &&
    valueOk >= 0.7 &&
    (tempRate < 0.45 || tempCool < 0.45)
  ) {
    return {
      id: 'TEMPERATURE_UNDER_COMPENSATION',
      label: 'Focus workout · temperature',
      description: 'Undertone reads are lagging while value and chroma stay steady.',
      severityScore: 1 - Math.min(tempRate, tempCool),
      remedyModule: 'flashcard',
      remedyLevel: 7,
      forcedConstraints: {
        isolatedProfile: 'temperatureHueBoundary',
      },
    };
  }

  return null;
}

export function shouldClearFocus(reps: RepRecord[]): boolean {
  const focusReps = reps.filter((r) => r.purpose === 'focus');
  if (focusReps.length < FOCUS_CLEAR_MIN_REPS) return false;
  const passRate = focusReps.filter((r) => r.passed).length / focusReps.length;
  const meanDe = focusReps
    .filter((r) => r.deltaE !== undefined)
    .map((r) => r.deltaE!);
  const avgDe = meanDe.length ? meanDe.reduce((a, b) => a + b, 0) / meanDe.length : null;
  return passRate >= FOCUS_CLEAR_PASS_RATE || (avgDe !== null && avgDe < 5);
}

export function updateFocusAfterSession(profile: SightProfile): SightProfile {
  const reps = profile.recentReps;
  if (profile.activeFocus && shouldClearFocus(reps)) {
    const nextDiag = evaluateDeficiencies(reps);
    return { ...profile, activeFocus: nextDiag };
  }
  if (!profile.activeFocus) {
    const nextDiag = evaluateDeficiencies(reps);
    if (nextDiag) return { ...profile, activeFocus: nextDiag };
  }
  return profile;
}
