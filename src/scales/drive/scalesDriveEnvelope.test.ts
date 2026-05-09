import { describe, expect, it } from 'vitest';
import {
  buildScalesDriveEnvelope,
  parseScalesDriveEnvelope,
  serializeScalesDriveEnvelope,
  SCALES_DRIVE_APP_ID,
} from './scalesDriveEnvelope';
import type { ScalesProgressData } from '../progress/types';

const minimalProgress = (): ScalesProgressData => ({
  version: 3,
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
