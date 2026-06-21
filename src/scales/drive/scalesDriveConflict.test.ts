import { describe, expect, it } from 'vitest';
import type { ScalesProgressData } from '../progress/types';
import { assessScalesDriveBackupConflict, shouldPromptScalesDriveMerge } from './scalesDriveConflict';
import type { ScalesDriveEnvelopeV1 } from './scalesDriveEnvelope';

function envelope(overrides: Partial<ScalesDriveEnvelopeV1> = {}): ScalesDriveEnvelopeV1 {
  return {
    version: 1,
    exportedAt: '2026-06-03T00:00:00.000Z',
    payload: {
      version: 4,
      exercises: { 'C-major': { exerciseId: 'C-major' } as never },
      currentTierId: 'beginner',
      seenOnboarding: false,
      introducedConcepts: {},
      introducedExerciseHands: {},
      progressUpdatedAt: '2026-06-03T00:00:00.000Z',
    },
    ...overrides,
  };
}

function progress(overrides: Partial<ScalesProgressData> = {}): ScalesProgressData {
  return {
    version: 4,
    exercises: {},
    currentTierId: 'beginner',
    seenOnboarding: false,
    introducedConcepts: {},
    introducedExerciseHands: {},
    progressUpdatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('assessScalesDriveBackupConflict', () => {
  it('does not prompt when remote envelope is missing', () => {
    expect(
      assessScalesDriveBackupConflict({
        syncMeta: {},
        cloudModifiedTime: undefined,
        remoteEnvelope: null,
      }),
    ).toEqual({ needsPrompt: false, reasons: [] });
  });

  it('does not prompt when remote envelope has no exercises', () => {
    expect(
      assessScalesDriveBackupConflict({
        syncMeta: {},
        cloudModifiedTime: '2026-06-03',
        remoteEnvelope: envelope({ payload: { ...envelope().payload, exercises: {} } }),
      }),
    ).toEqual({ needsPrompt: false, reasons: [] });
  });

  it('prompts when Drive file is newer than last seen', () => {
    const result = assessScalesDriveBackupConflict({
      syncMeta: { lastCloudModifiedTime: '2026-06-01' },
      cloudModifiedTime: '2026-06-03',
      remoteEnvelope: envelope(),
    });
    expect(result.needsPrompt).toBe(true);
    expect(result.reasons).toContain('drive_file_newer_than_seen');
  });

  it('prompts on first device when Drive already has progress', () => {
    const result = assessScalesDriveBackupConflict({
      syncMeta: {},
      cloudModifiedTime: '2026-06-03',
      remoteEnvelope: envelope(),
    });
    expect(result.needsPrompt).toBe(true);
    expect(result.reasons).toContain('drive_nonempty_first_device');
  });
});

describe('shouldPromptScalesDriveMerge', () => {
  it('never prompts — silent_union policy', () => {
    expect(
      shouldPromptScalesDriveMerge({
        syncMeta: { lastBackupExportedAt: '2026-06-01T00:00:00.000Z' },
        cloudModifiedTime: '2026-06-03',
        remoteEnvelope: envelope(),
        progress: progress({ progressUpdatedAt: '2026-06-02T00:00:00.000Z' }),
      }),
    ).toBe(false);
  });
});
