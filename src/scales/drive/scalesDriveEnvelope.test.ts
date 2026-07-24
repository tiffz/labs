import { describe, expect, it } from 'vitest';
import {
  buildScalesDriveEnvelope,
  parseScalesDriveEnvelope,
  serializeScalesDriveEnvelope,
  SCALES_DRIVE_APP_ID,
} from './scalesDriveEnvelope';
import type { ScalesProgressData } from '../progress/types';

const minimalProgress = (): ScalesProgressData => ({
  version: 5,
  exercises: {},
  currentTierId: 'tier-0',
  introducedConcepts: {},
  introducedExerciseHands: {},
  seenOnboarding: false,
});

describe('scalesDriveEnvelope', () => {
  it('round-trips', () => {
    const env = buildScalesDriveEnvelope(minimalProgress());
    expect(env.app).toBe(SCALES_DRIVE_APP_ID);
    const back = parseScalesDriveEnvelope(serializeScalesDriveEnvelope(env));
    expect(back.payload.currentTierId).toBe('tier-0');
  });

  it('strips device-local scratch (lastFreePracticeParams, recentPracticeItems) from the synced payload', () => {
    const item = { kind: 'major-scale' as const, key: 'Bb' as const, hand: 'both' as const, octaves: 2 as const, bpm: 80, subdivision: 'none' as const };
    const env = buildScalesDriveEnvelope({
      ...minimalProgress(),
      lastFreePracticeParams: item,
      recentPracticeItems: [item],
      customRoutines: [{ id: 'r1', name: 'Keep me', updatedAt: '2026-01-01T00:00:00.000Z', items: [item] }],
    });
    expect(env.payload.lastFreePracticeParams).toBeUndefined();
    expect(env.payload.recentPracticeItems).toBeUndefined();
    // Routines still sync.
    expect(env.payload.customRoutines).toHaveLength(1);
  });

  it('rejects wrong app', () => {
    const bad = JSON.stringify({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      app: 'other',
      payload: minimalProgress(),
    });
    expect(() => parseScalesDriveEnvelope(bad)).toThrow(/not from Learn Your Scales/);
  });
});
