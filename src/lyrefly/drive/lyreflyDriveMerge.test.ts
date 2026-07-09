import { describe, expect, it } from 'vitest';

import { mergeLyreflySyncPayload } from './lyreflyDriveMerge';

describe('mergeLyreflySyncPayload', () => {
  it('unions local and remote projects', () => {
    const local = {
      projects: [
        { id: 'a', title: 'Local', status: 'draft' as const, updatedAt: '2026-01-01T00:00:00.000Z' },
      ],
    };
    const remote = {
      projects: [
        { id: 'b', title: 'Remote', status: 'wip' as const, updatedAt: '2026-01-02T00:00:00.000Z' },
      ],
    };
    const { payload } = mergeLyreflySyncPayload(local, remote);
    expect(payload.projects.map((p) => p.id).sort()).toEqual(['a', 'b']);
  });

  it('filters tombstoned project ids', () => {
    const local = {
      projects: [
        { id: 'a', title: 'Local', status: 'draft' as const, updatedAt: '2026-01-01T00:00:00.000Z' },
        { id: 'b', title: 'Gone', status: 'draft' as const, updatedAt: '2026-01-01T00:00:00.000Z' },
      ],
    };
    const remote = {
      projects: [
        { id: 'b', title: 'Remote', status: 'wip' as const, updatedAt: '2026-01-02T00:00:00.000Z' },
      ],
    };
    const { payload } = mergeLyreflySyncPayload(local, remote, {
      tombstoneProjectIds: new Set(['b']),
    });
    expect(payload.projects.map((p) => p.id)).toEqual(['a']);
  });
});
