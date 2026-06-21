import type { RiffPattern, RiffStep } from '../types';

const MATCH_TOLERANCE_MS = 80;

export function createEmptyRiff(): RiffPattern {
  return {
    id: crypto.randomUUID(),
    title: 'My riff',
    steps: [],
    beatsPerStep: 1,
  };
}

export function midiMatchesRiffStep(
  midi: number,
  step: RiffStep | undefined,
  perfMs: number,
  expectedPerfMs: number,
): boolean {
  if (!step || step.pitches.length === 0) return false;
  if (Math.abs(perfMs - expectedPerfMs) > MATCH_TOLERANCE_MS) return false;
  return step.pitches.includes(midi);
}
