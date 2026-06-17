import { describe, expect, it } from 'vitest';
import {
  assessLabsDriveBackupConflict,
  labsPortfolioLocalChangedSinceIsoBackup,
  shouldPromptBeforePortfolioMerge,
  shouldPromptPortfolioMerge,
  LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT,
} from './labsDriveBackupTypes';

describe('shouldPromptPortfolioMerge', () => {
  const divergedAssessment = assessLabsDriveBackupConflict({
    syncMeta: { lastBackupExportedAt: '2026-01-01T00:00:00.000Z' },
    cloudModifiedTime: '2026-01-03',
    remoteExportedAt: '2026-01-03T00:00:00.000Z',
    remoteHasContent: true,
  });

  it('silent_union never prompts', () => {
    expect(
      shouldPromptPortfolioMerge({
        policy: 'silent_union',
        assessment: divergedAssessment,
        localChangedSinceLastBackup: true,
      }),
    ).toBe(false);
  });

  it('prompt_when_both_edited prompts when local changed and cloud diverged', () => {
    expect(
      shouldPromptPortfolioMerge({
        policy: 'prompt_when_both_edited',
        assessment: divergedAssessment,
        localChangedSinceLastBackup: true,
      }),
    ).toBe(true);
  });

  it('default policy is silent_union', () => {
    expect(LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT).toBe('silent_union');
  });
});

describe('shouldPromptBeforePortfolioMerge', () => {
  it('does not prompt when cloud is newer but local unchanged since backup', () => {
    const assessment = assessLabsDriveBackupConflict({
      syncMeta: { lastBackupExportedAt: '2026-01-02T00:00:00.000Z', lastCloudModifiedTime: '2026-01-01' },
      cloudModifiedTime: '2026-01-03',
      remoteExportedAt: '2026-01-03T00:00:00.000Z',
      remoteHasContent: true,
    });
    expect(assessment.needsPrompt).toBe(true);
    expect(
      shouldPromptBeforePortfolioMerge({
        assessment,
        localChangedSinceLastBackup: false,
      }),
    ).toBe(false);
  });

  it('prompts when cloud diverged and local edited since last backup', () => {
    const assessment = assessLabsDriveBackupConflict({
      syncMeta: { lastBackupExportedAt: '2026-01-01T00:00:00.000Z' },
      cloudModifiedTime: '2026-01-03',
      remoteExportedAt: '2026-01-03T00:00:00.000Z',
      remoteHasContent: true,
    });
    expect(
      shouldPromptBeforePortfolioMerge({
        assessment,
        localChangedSinceLastBackup: true,
      }),
    ).toBe(true);
  });

  it('does not prompt when assessment says cloud is already in sync', () => {
    const assessment = assessLabsDriveBackupConflict({
      syncMeta: {
        lastCloudModifiedTime: '2026-01-03',
        lastBackupExportedAt: '2026-01-03T00:00:00.000Z',
      },
      cloudModifiedTime: '2026-01-03',
      remoteExportedAt: '2026-01-03T00:00:00.000Z',
      remoteHasContent: true,
    });
    expect(assessment.needsPrompt).toBe(false);
    expect(
      shouldPromptBeforePortfolioMerge({
        assessment,
        localChangedSinceLastBackup: true,
      }),
    ).toBe(false);
  });

  it('prompts on first-device conflict when local already has edits', () => {
    const assessment = assessLabsDriveBackupConflict({
      syncMeta: {},
      cloudModifiedTime: '2026-01-03',
      remoteExportedAt: '2026-01-03T00:00:00.000Z',
      remoteHasContent: true,
    });
    expect(assessment.reasons).toContain('drive_nonempty_first_device');
    expect(
      shouldPromptBeforePortfolioMerge({
        assessment,
        localChangedSinceLastBackup: true,
      }),
    ).toBe(true);
  });

  it('allows silent merge on first device when local is still empty', () => {
    const assessment = assessLabsDriveBackupConflict({
      syncMeta: {},
      cloudModifiedTime: '2026-01-03',
      remoteExportedAt: '2026-01-03T00:00:00.000Z',
      remoteHasContent: true,
    });
    expect(
      shouldPromptBeforePortfolioMerge({
        assessment,
        localChangedSinceLastBackup: false,
      }),
    ).toBe(false);
  });
});

describe('labsPortfolioLocalChangedSinceIsoBackup', () => {
  it('returns false when local clock is before last backup', () => {
    expect(
      labsPortfolioLocalChangedSinceIsoBackup(
        Date.parse('2026-01-01T00:00:00.000Z'),
        '2026-01-02T00:00:00.000Z',
      ),
    ).toBe(false);
  });

  it('returns true when local clock is after last backup', () => {
    expect(
      labsPortfolioLocalChangedSinceIsoBackup(
        Date.parse('2026-01-03T00:00:00.000Z'),
        '2026-01-02T00:00:00.000Z',
      ),
    ).toBe(true);
  });

  it('returns false when local has no edits', () => {
    expect(labsPortfolioLocalChangedSinceIsoBackup(0, '2026-01-02T00:00:00.000Z')).toBe(false);
  });

  it('treats missing backup timestamp as local-changed when local has edits', () => {
    expect(labsPortfolioLocalChangedSinceIsoBackup(Date.parse('2026-01-01T00:00:00.000Z'), undefined)).toBe(true);
  });

  it('treats invalid backup timestamp as local-changed when local has edits', () => {
    expect(labsPortfolioLocalChangedSinceIsoBackup(Date.parse('2026-01-01T00:00:00.000Z'), 'not-a-date')).toBe(true);
  });
});

describe('assessLabsDriveBackupConflict', () => {
  it('returns no prompt when remote is empty', () => {
    expect(
      assessLabsDriveBackupConflict({
        syncMeta: {},
        cloudModifiedTime: '2026-01-02',
        remoteExportedAt: '2026-01-01',
        remoteHasContent: false,
      }),
    ).toEqual({ needsPrompt: false, reasons: [] });
  });

  it('flags drive file newer than last seen', () => {
    const result = assessLabsDriveBackupConflict({
      syncMeta: { lastCloudModifiedTime: '2026-01-01' },
      cloudModifiedTime: '2026-01-03',
      remoteExportedAt: '2026-01-01',
      remoteHasContent: true,
    });
    expect(result.needsPrompt).toBe(true);
    expect(result.reasons).toContain('drive_file_newer_than_seen');
  });

  it('flags first device with remote content', () => {
    const result = assessLabsDriveBackupConflict({
      syncMeta: {},
      cloudModifiedTime: undefined,
      remoteExportedAt: undefined,
      remoteHasContent: true,
    });
    expect(result.reasons).toContain('drive_nonempty_first_device');
  });

  it('flags remote export newer than last backup', () => {
    const result = assessLabsDriveBackupConflict({
      syncMeta: { lastBackupExportedAt: '2026-01-01T00:00:00.000Z' },
      cloudModifiedTime: '2026-01-01T00:00:00.000Z',
      remoteExportedAt: '2026-01-02T00:00:00.000Z',
      remoteHasContent: true,
    });
    expect(result.needsPrompt).toBe(true);
    expect(result.reasons).toContain('remote_export_newer_than_last_backup');
  });
});
