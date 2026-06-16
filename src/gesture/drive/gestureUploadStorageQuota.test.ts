import { describe, expect, it } from 'vitest';
import {
  canStageUploadBytes,
  planUploadStagingMode,
  totalFileBytes,
} from './gestureUploadStorageQuota';

describe('gestureUploadStorageQuota', () => {
  it('plans handle mode when a directory handle exists', () => {
    expect(planUploadStagingMode(true, 1_000_000, 500_000)).toBe('handle');
  });

  it('plans staging when bytes fit headroom', () => {
    expect(planUploadStagingMode(false, 1_000_000, 2_000_000)).toBe('staging');
  });

  it('falls back to stream when quota is tight', () => {
    expect(planUploadStagingMode(false, 5_000_000, 1_000_000)).toBe('stream');
  });

  it('totals file bytes', () => {
    const files = [new File(['ab'], 'a.jpg'), new File(['cde'], 'b.jpg')];
    expect(totalFileBytes(files)).toBe(5);
  });

  it('applies slack when checking staging fit', () => {
    expect(canStageUploadBytes(1_000_000, 1_000_000)).toBe(false);
    expect(canStageUploadBytes(800_000, 1_000_000)).toBe(true);
  });
});
