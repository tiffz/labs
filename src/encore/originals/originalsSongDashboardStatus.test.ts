import { describe, expect, it } from 'vitest';
import {
  buildOriginalSongDashboardStatus,
  hasOriginalChartFile,
} from './originalsSongDashboardStatus';
import { createBlankOriginalSong } from './types';

describe('buildOriginalSongDashboardStatus', () => {
  it('flags missing chart file and demo take on blank song', () => {
    const song = createBlankOriginalSong();
    const status = buildOriginalSongDashboardStatus(song);
    expect(status.missingChartFile).toBe(true);
    expect(status.missingDemoTake).toBe(true);
    expect(status.incompleteWorkflow).toBe(true);
    expect(status.workflowSteps.every((s) => !s.complete)).toBe(true);
  });

  it('detects pdf reference as chart file', () => {
    const song = {
      ...createBlankOriginalSong(),
      songReferences: [
        {
          id: 'ref-1',
          kind: 'pdf' as const,
          label: 'chart.pdf',
          createdAt: new Date().toISOString(),
        },
      ],
    };
    expect(hasOriginalChartFile(song)).toBe(true);
    expect(buildOriginalSongDashboardStatus(song).missingChartFile).toBe(false);
  });

  it('detects inline chords without uploaded chart', () => {
    const song = {
      ...createBlankOriginalSong(),
      lyricsAndChords: '[Verse]\n[F]Hello',
    };
    const status = buildOriginalSongDashboardStatus(song);
    expect(status.hasInlineChords).toBe(true);
    expect(status.missingChartFile).toBe(true);
  });
});
