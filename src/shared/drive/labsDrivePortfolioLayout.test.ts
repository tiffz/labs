import { describe, expect, it } from 'vitest';
import {
  LABS_DRIVE_APP_FOLDER_SCALES,
  LABS_DRIVE_APP_FOLDER_STANZA,
  LABS_DRIVE_PROGRESS_FILE,
  LABS_DRIVE_ROOT_FOLDER,
} from './labsDrivePortfolioLayout';

describe('labsDrivePortfolioLayout constants', () => {
  it('uses the portfolio folder names from the Labs Drive spec', () => {
    expect(LABS_DRIVE_ROOT_FOLDER).toBe('Tiff Zhang Labs');
    expect(LABS_DRIVE_APP_FOLDER_SCALES).toBe('LearnYourScales');
    expect(LABS_DRIVE_APP_FOLDER_STANZA).toBe('Stanza');
    expect(LABS_DRIVE_PROGRESS_FILE).toBe('progress.json');
  });
});
