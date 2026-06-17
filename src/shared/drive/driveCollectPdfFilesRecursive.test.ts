import { describe, expect, it } from 'vitest';

import { drivePdfDedupeKey, isDrivePdfFile } from './driveCollectPdfFilesRecursive';
import { GOOGLE_DRIVE_SHORTCUT_MIME } from './driveFetch';

describe('isDrivePdfFile', () => {
  it('accepts direct PDF mime types', () => {
    expect(isDrivePdfFile({ mimeType: 'application/pdf', name: 'zine.pdf' })).toBe(true);
  });

  it('accepts octet-stream rows with a .pdf name', () => {
    expect(isDrivePdfFile({ mimeType: 'application/octet-stream', name: 'zine.pdf' })).toBe(true);
  });

  it('accepts Drive shortcuts whose target is a PDF', () => {
    expect(
      isDrivePdfFile({
        mimeType: GOOGLE_DRIVE_SHORTCUT_MIME,
        name: 'Issue.pdf',
        shortcutDetails: { targetMimeType: 'application/pdf', targetId: 'target-1' },
      }),
    ).toBe(true);
  });

  it('accepts Drive shortcuts named .pdf even when target mime is missing', () => {
    expect(
      isDrivePdfFile({
        mimeType: GOOGLE_DRIVE_SHORTCUT_MIME,
        name: 'Issue.pdf',
        shortcutDetails: { targetId: 'target-1' },
      }),
    ).toBe(true);
  });

  it('rejects folders and non-pdf shortcuts', () => {
    expect(isDrivePdfFile({ mimeType: 'application/vnd.google-apps.folder', name: 'Zines' })).toBe(false);
    expect(
      isDrivePdfFile({
        mimeType: GOOGLE_DRIVE_SHORTCUT_MIME,
        name: 'video.mp4',
        shortcutDetails: { targetMimeType: 'video/mp4' },
      }),
    ).toBe(false);
  });
});

describe('drivePdfDedupeKey', () => {
  it('prefers shortcut target id over shortcut row id', () => {
    expect(
      drivePdfDedupeKey({
        id: 'shortcut-row',
        shortcutDetails: { targetId: 'pdf-target' },
      }),
    ).toBe('pdf-target');
  });
});
