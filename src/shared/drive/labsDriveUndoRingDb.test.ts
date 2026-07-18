import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  findLatestLabsDriveUndoRingPrePull,
  labsDriveUndoRingDb,
  listLabsDriveUndoRingSnapshots,
  migrateLegacyLocalStorageUndoRing,
  pushLabsDriveUndoRingSnapshot,
} from './labsDriveUndoRingDb';

describe('labsDriveUndoRingDb', () => {
  beforeEach(async () => {
    await labsDriveUndoRingDb.snapshots.clear();
    localStorage.clear();
  });

  it('pushes, lists newest-first, and finds pre-pull', async () => {
    await pushLabsDriveUndoRingSnapshot('scales', '{"a":1}', 'manual-backup', 'one');
    await pushLabsDriveUndoRingSnapshot('scales', '{"a":2}', 'pre-pull', 'two');
    const listed = await listLabsDriveUndoRingSnapshots('scales');
    expect(listed[0]?.trigger).toBe('pre-pull');
    expect(listed).toHaveLength(2);
    const pre = await findLatestLabsDriveUndoRingPrePull('scales');
    expect(pre?.payloadJson).toBe('{"a":2}');
  });

  it('trims to max and isolates apps', async () => {
    for (let i = 0; i < 5; i += 1) {
      await pushLabsDriveUndoRingSnapshot('gesture', `g${i}`, 'pre-pull', `g${i}`, 3);
    }
    await pushLabsDriveUndoRingSnapshot('zinebox', 'z', 'pre-pull', 'z', 3);
    expect(await listLabsDriveUndoRingSnapshots('gesture', 10)).toHaveLength(3);
    expect(await listLabsDriveUndoRingSnapshots('zinebox')).toHaveLength(1);
  });

  it('migrates legacy localStorage once', async () => {
    localStorage.setItem(
      'labs_scales_drive_undo_snapshots_v2',
      JSON.stringify([
        {
          createdAt: 1,
          label: 'legacy',
          trigger: 'pre-pull',
          envelopeJson: '{"legacy":true}',
        },
      ]),
    );
    await migrateLegacyLocalStorageUndoRing({
      appId: 'scales',
      legacyStorageKey: 'labs_scales_drive_undo_snapshots_v2',
    });
    const listed = await listLabsDriveUndoRingSnapshots('scales');
    expect(listed[0]?.payloadJson).toBe('{"legacy":true}');
    expect(localStorage.getItem('labs_scales_drive_undo_snapshots_v2')).toBeNull();
  });

  it('unions legacy localStorage into an existing IndexedDB ring before clearing the key', async () => {
    await pushLabsDriveUndoRingSnapshot('scales', '{"idb":true}', 'pre-pull', 'idb');
    localStorage.setItem(
      'labs_scales_drive_undo_snapshots_v2',
      JSON.stringify([
        {
          createdAt: 1,
          label: 'legacy',
          trigger: 'manual-backup',
          envelopeJson: '{"legacy":true}',
        },
        {
          createdAt: 2,
          label: 'dup',
          trigger: 'pre-pull',
          envelopeJson: '{"idb":true}',
        },
      ]),
    );
    await migrateLegacyLocalStorageUndoRing({
      appId: 'scales',
      legacyStorageKey: 'labs_scales_drive_undo_snapshots_v2',
    });
    const listed = await listLabsDriveUndoRingSnapshots('scales');
    expect(listed.map((r) => r.payloadJson).sort()).toEqual(['{"idb":true}', '{"legacy":true}']);
    expect(localStorage.getItem('labs_scales_drive_undo_snapshots_v2')).toBeNull();
  });
});
