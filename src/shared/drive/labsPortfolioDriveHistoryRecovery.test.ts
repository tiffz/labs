import { describe, expect, it } from 'vitest';
import {
  assessPortfolioHistoryRecovery,
  pickNewestHistoryEntitySlice,
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
