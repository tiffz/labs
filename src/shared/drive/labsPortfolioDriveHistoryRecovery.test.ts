import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./driveFetch', () => ({
  driveListRevisions: vi.fn(),
  driveGetRevisionMedia: vi.fn(),
}));

import { driveGetRevisionMedia, driveListRevisions, type DriveRevisionRow } from './driveFetch';
import {
  assessPortfolioHistoryRecovery,
  pickNewestHistoryEntitySlice,
  scanPortfolioProgressRevisions,
} from './labsPortfolioDriveHistoryRecovery';

type TestPayload = { items: { id: string; title: string }[] };
type TestEnvelope = { exportedAt: string; items: { id: string; title: string }[] };

describe('assessPortfolioHistoryRecovery', () => {
  it('finds ids present in history but missing locally', () => {
    const current: TestPayload = { items: [{ id: 'keep', title: 'Kept' }] };
    const snapshots = [
      {
        revisionId: 'r1',
        modifiedTime: '2026-01-02T00:00:00.000Z',
        envelope: {
          exportedAt: '2026-01-02T00:00:00.000Z',
          items: [
            { id: 'keep', title: 'Kept' },
            { id: 'lost', title: 'Lost Comic' },
          ],
        } satisfies TestEnvelope,
      },
    ];
    const entries = assessPortfolioHistoryRecovery({
      current,
      snapshots,
      listEntityIds: (p) => p.items.map((i) => i.id),
      envelopeToPayload: (env) => ({ items: env.items }),
      getEntityLabel: (id, p) => p.items.find((i) => i.id === id)?.title,
    });
    expect(entries).toEqual([
      { id: 'lost', label: 'Lost Comic', lastSeenModifiedTime: '2026-01-02T00:00:00.000Z' },
    ]);
  });
});

describe('pickNewestHistoryEntitySlice', () => {
  it('prefers the newest modifiedTime even when revision list is unordered', () => {
    const snapshots = [
      {
        revisionId: 'newer-first',
        modifiedTime: '2026-01-03T00:00:00.000Z',
        envelope: {
          exportedAt: '2026-01-03T00:00:00.000Z',
          items: [{ id: 'lost', title: 'New title' }],
        } satisfies TestEnvelope,
      },
      {
        revisionId: 'older',
        modifiedTime: '2026-01-01T00:00:00.000Z',
        envelope: {
          exportedAt: '2026-01-01T00:00:00.000Z',
          items: [{ id: 'lost', title: 'Old title' }],
        } satisfies TestEnvelope,
      },
    ];
    const slice = pickNewestHistoryEntitySlice({
      id: 'lost',
      snapshots,
      envelopeToPayload: (env) => ({ items: env.items }),
      payloadWithEntity: (source, id) => {
        const item = source.items.find((i) => i.id === id);
        return item ? { items: [item] } : null;
      },
    });
    expect(slice).toEqual({ items: [{ id: 'lost', title: 'New title' }] });
  });
});

describe('scanPortfolioProgressRevisions (newest-first + pin coverage)', () => {
  const listMock = driveListRevisions as ReturnType<typeof vi.fn>;
  const mediaMock = driveGetRevisionMedia as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Ratchet for FINDING #25: the daily `keepForever` pin and any recent overwrite land at
  // the NEWEST end of Drive's revision list, but the scan used to slice the OLDEST N. On a
  // file with more than `maxRevisions` revisions the scan could not see its own pins — a lost
  // entity that survives only in a recent or pinned revision was reported as unrecoverable.
  it('surfaces entities held only in recent revisions and in pinned revisions beyond the cap', async () => {
    // 60 revisions, oldest → newest (Drive's order). `keep` is present throughout.
    const RECENT_INDEX = 52; // within the newest 40 — missed by an oldest-first slice.
    const OLD_PINNED_INDEX = 3; // outside the newest 40 — recoverable only via keepForever.
    const NEWEST_PINNED_INDEX = 59; // the daily pin, newest of all.

    const rows: DriveRevisionRow[] = Array.from({ length: 60 }, (_, index) => ({
      id: `r${index}`,
      // Monotonic so newest-first sort is deterministic.
      modifiedTime: `2026-05-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
      keepForever: index === OLD_PINNED_INDEX || index === NEWEST_PINNED_INDEX,
    }));

    const bodyForIndex = (index: number): string => {
      const items = [{ id: 'keep', title: 'Kept' }];
      if (index === RECENT_INDEX) items.push({ id: 'lostRecent', title: 'Lost Recent' });
      if (index === OLD_PINNED_INDEX) items.push({ id: 'lostPinned', title: 'Lost Pinned' });
      return JSON.stringify({ exportedAt: rows[index].modifiedTime, items });
    };

    listMock.mockResolvedValue(rows);
    mediaMock.mockImplementation(async (_token: string, _fileId: string, revisionId: string) => {
      const index = Number(revisionId.slice(1));
      return bodyForIndex(index);
    });

    const scan = await scanPortfolioProgressRevisions<TestEnvelope>(
      'token',
      'file-1',
      (json) => JSON.parse(json) as TestEnvelope,
    );

    const entries = assessPortfolioHistoryRecovery({
      current: { items: [{ id: 'keep', title: 'Kept' }] } satisfies TestPayload,
      snapshots: scan.snapshots,
      listEntityIds: (p) => p.items.map((i) => i.id),
      envelopeToPayload: (env) => ({ items: env.items }),
      getEntityLabel: (id, p) => p.items.find((i) => i.id === id)?.title,
    });

    const surfacedIds = entries.map((e) => e.id).sort();
    // Recent revision (newest-first coverage) AND old pinned revision (keepForever coverage).
    expect(surfacedIds).toEqual(['lostPinned', 'lostRecent']);
  });
});
