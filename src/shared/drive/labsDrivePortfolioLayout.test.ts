import { describe, expect, it } from 'vitest';
import {
  isLabsDrivePortfolioProgressPlaceholder,
  LABS_DRIVE_APP_FOLDER_SCALES,
  LABS_DRIVE_APP_FOLDER_STANZA,
  LABS_DRIVE_APP_FOLDER_ZINEBOX,
  LABS_DRIVE_PROGRESS_FILE,
  LABS_DRIVE_ROOT_FOLDER,
} from './labsDrivePortfolioLayout';

describe('labsDrivePortfolioLayout constants', () => {
  it('uses the portfolio folder names from the Labs Drive spec', () => {
    expect(LABS_DRIVE_ROOT_FOLDER).toBe('Tiff Zhang Labs');
    expect(LABS_DRIVE_APP_FOLDER_SCALES).toBe('LearnYourScales');
    expect(LABS_DRIVE_APP_FOLDER_STANZA).toBe('Stanza');
    expect(LABS_DRIVE_APP_FOLDER_ZINEBOX).toBe('ZineBox');
    expect(LABS_DRIVE_PROGRESS_FILE).toBe('progress.json');
  });
});

describe('isLabsDrivePortfolioProgressPlaceholder', () => {
  it('detects the layout stub progress.json by its explicit _placeholder flag', () => {
    // The actual object ensureLabsDrivePortfolioProgressLayout writes.
    const stub = JSON.stringify({
      schemaVersion: 0,
      exportedAt: '2026-01-01T00:00:00.000Z',
      _placeholder: true,
    });
    expect(isLabsDrivePortfolioProgressPlaceholder(stub)).toBe(true);
  });

  it('returns false for app envelopes', () => {
    const real = JSON.stringify({ schemaVersion: 1, exportedAt: '2026-01-01T00:00:00.000Z', app: 'zinebox' });
    expect(isLabsDrivePortfolioProgressPlaceholder(real)).toBe(false);
  });

  it('does NOT treat schemaVersion 0 as a placeholder without the flag (cloud-clobber guard)', () => {
    // A real envelope — rich cloud data — that legitimately uses schemaVersion 0 (a 7th app or a
    // migration) must NOT be mistaken for an empty stub. If it were, the pull would see empty
    // cloud, mark itself succeeded, and the next push would clobber the real Drive data.
    const realWithSchemaZero = JSON.stringify({
      schemaVersion: 0,
      exportedAt: '2026-01-01T00:00:00.000Z',
      app: 'future-app',
      payload: { rows: [{ id: 'a', value: 42 }] },
    });
    expect(isLabsDrivePortfolioProgressPlaceholder(realWithSchemaZero)).toBe(false);
  });

  it('returns false on unparseable JSON (never degrade to "empty")', () => {
    expect(isLabsDrivePortfolioProgressPlaceholder('{ not json')).toBe(false);
  });
});
