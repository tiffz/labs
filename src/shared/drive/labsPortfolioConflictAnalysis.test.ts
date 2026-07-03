import { describe, expect, it } from 'vitest';
import {
  analyzePortfolioRows,
  classifyPortfolioRow,
  labsPortfolioClockFromIso,
  shouldBlockSyncForConflict,
  type LabsPortfolioRowClock,
} from './labsPortfolioConflictAnalysis';

const row = (id: string, updatedAt: number, label?: string): LabsPortfolioRowClock => ({
  id,
  updatedAt,
  label: label ?? id,
  kind: 'song',
});

describe('classifyPortfolioRow', () => {
  const lastSynced = 1000;
  const lastRemote = 1000;

  it('classifies local-only edits', () => {
    expect(classifyPortfolioRow(row('a', 2000), undefined, lastSynced, lastRemote)).toBe('localOnly');
  });

  it('classifies remote-only edits', () => {
    expect(classifyPortfolioRow(undefined, row('a', 2000), lastSynced, lastRemote)).toBe('remoteOnly');
  });

  it('classifies bothEdited when both sides moved past baselines', () => {
    expect(classifyPortfolioRow(row('a', 2000), row('a', 3000), lastSynced, lastRemote)).toBe(
      'bothEdited',
    );
  });

  it('treats equal clocks as inSync', () => {
    expect(classifyPortfolioRow(row('a', 1500), row('a', 1500), lastSynced, lastRemote)).toBe('inSync');
  });

  it('treats unchanged local-only rows as inSync', () => {
    expect(classifyPortfolioRow(row('a', 500), undefined, lastSynced, lastRemote)).toBe('inSync');
  });
});

describe('analyzePortfolioRows', () => {
  it('buckets localOnly, remoteOnly, and auto-resolvable bothEdited', () => {
    const analysis = analyzePortfolioRows({
      lastSyncedLocalMax: 1000,
      lastRemoteSeen: 1000,
      localRows: [row('local-only', 2000, 'Local'), row('shared', 2000, 'Shared')],
      remoteRows: [row('remote-only', 2000, 'Remote'), row('shared', 3000, 'Shared')],
      defaultKind: 'song',
    });
    expect(analysis.localOnly.map((r) => r.id)).toEqual(['local-only']);
    expect(analysis.remoteOnly.map((r) => r.id)).toEqual(['remote-only']);
    expect(analysis.autoResolved.map((r) => r.id)).toEqual(['shared']);
    expect(analysis.needsReview).toEqual([]);
    expect(shouldBlockSyncForConflict(analysis)).toBe(false);
  });

  it('puts bothEdited into needsReview when isAutoResolvable returns false', () => {
    const analysis = analyzePortfolioRows({
      lastSyncedLocalMax: 1000,
      lastRemoteSeen: 1000,
      localRows: [row('shared', 2000, 'Shared')],
      remoteRows: [row('shared', 3000, 'Shared')],
      isAutoResolvable: () => false,
      summarizeStakes: () => '12 sections here · 8 on Drive',
    });
    expect(analysis.needsReview).toHaveLength(1);
    expect(analysis.needsReview[0]?.stakesSummary).toBe('12 sections here · 8 on Drive');
    expect(analysis.autoResolved).toEqual([]);
    expect(shouldBlockSyncForConflict(analysis)).toBe(true);
  });

  it('returns empty analysis when nothing diverged', () => {
    const analysis = analyzePortfolioRows({
      lastSyncedLocalMax: 5000,
      lastRemoteSeen: 5000,
      localRows: [row('a', 1000)],
      remoteRows: [row('a', 1000)],
    });
    expect(analysis).toEqual({
      localOnly: [],
      remoteOnly: [],
      autoResolved: [],
      needsReview: [],
    });
  });
});

describe('labsPortfolioClockFromIso', () => {
  it('parses ISO timestamps', () => {
    expect(labsPortfolioClockFromIso('2026-06-01T00:00:00.000Z')).toBe(
      Date.parse('2026-06-01T00:00:00.000Z'),
    );
  });

  it('returns 0 for missing or invalid', () => {
    expect(labsPortfolioClockFromIso(null)).toBe(0);
    expect(labsPortfolioClockFromIso('not-a-date')).toBe(0);
  });
});
