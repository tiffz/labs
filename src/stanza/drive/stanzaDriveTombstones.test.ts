import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addStanzaDriveTombstone,
  clearAllStanzaDriveTombstonesForTesting,
  clearStanzaDriveTombstone,
  getStanzaDriveTombstoneFileIds,
  MAX_STANZA_DRIVE_TOMBSTONES,
  readStanzaDriveTombstones,
  STANZA_DRIVE_TOMBSTONES_CHANGED_EVENT,
  unionStanzaDriveTombstones,
} from './stanzaDriveTombstones';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  clearAllStanzaDriveTombstonesForTesting();
});

describe('stanzaDriveTombstones', () => {
  it('starts empty', () => {
    expect(readStanzaDriveTombstones()).toEqual([]);
    expect(getStanzaDriveTombstoneFileIds().size).toBe(0);
  });

  it('round-trips a single tombstone', () => {
    addStanzaDriveTombstone('file-abc', '2026-05-17T22:00:00.000Z');
    const list = readStanzaDriveTombstones();
    expect(list).toEqual([{ fileId: 'file-abc', removedAt: '2026-05-17T22:00:00.000Z' }]);
    expect(getStanzaDriveTombstoneFileIds()).toEqual(new Set(['file-abc']));
  });

  it('dedupes by fileId, keeping the latest removedAt', () => {
    addStanzaDriveTombstone('file-abc', '2026-05-17T22:00:00.000Z');
    addStanzaDriveTombstone('file-abc', '2026-05-18T08:00:00.000Z');
    const list = readStanzaDriveTombstones();
    expect(list).toHaveLength(1);
    expect(list[0]?.removedAt).toBe('2026-05-18T08:00:00.000Z');
  });

  it('keeps an older removedAt when a newly-added one is earlier', () => {
    addStanzaDriveTombstone('file-abc', '2026-05-18T08:00:00.000Z');
    addStanzaDriveTombstone('file-abc', '2026-05-17T22:00:00.000Z');
    const list = readStanzaDriveTombstones();
    expect(list).toHaveLength(1);
    expect(list[0]?.removedAt).toBe('2026-05-18T08:00:00.000Z');
  });

  it('sorts newest first', () => {
    addStanzaDriveTombstone('older', '2026-05-17T08:00:00.000Z');
    addStanzaDriveTombstone('newer', '2026-05-17T22:00:00.000Z');
    const list = readStanzaDriveTombstones();
    expect(list.map((t) => t.fileId)).toEqual(['newer', 'older']);
  });

  it('clears a single tombstone', () => {
    addStanzaDriveTombstone('keep-me', '2026-05-17T22:00:00.000Z');
    addStanzaDriveTombstone('remove-me', '2026-05-18T08:00:00.000Z');
    clearStanzaDriveTombstone('remove-me');
    expect(readStanzaDriveTombstones().map((t) => t.fileId)).toEqual(['keep-me']);
  });

  it('clear on a missing fileId is a no-op (no localStorage write event)', () => {
    addStanzaDriveTombstone('keep-me', '2026-05-17T22:00:00.000Z');
    const listener = vi.fn();
    window.addEventListener(STANZA_DRIVE_TOMBSTONES_CHANGED_EVENT, listener);
    try {
      clearStanzaDriveTombstone('not-here');
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(STANZA_DRIVE_TOMBSTONES_CHANGED_EVENT, listener);
    }
  });

  it('ignores blank file ids', () => {
    addStanzaDriveTombstone('   ', '2026-05-17T22:00:00.000Z');
    expect(readStanzaDriveTombstones()).toEqual([]);
  });

  it('caps the persisted store at the documented limit', () => {
    for (let i = 0; i < MAX_STANZA_DRIVE_TOMBSTONES + 10; i++) {
      const stamp = new Date(2026, 0, 1, 0, 0, i).toISOString();
      addStanzaDriveTombstone(`file-${i.toString().padStart(4, '0')}`, stamp);
    }
    const list = readStanzaDriveTombstones();
    expect(list.length).toBe(MAX_STANZA_DRIVE_TOMBSTONES);
    // Newest first: file-0509 down to file-0010 are retained, file-0009 ... file-0000 dropped.
    expect(list[0]?.fileId).toBe(`file-${(MAX_STANZA_DRIVE_TOMBSTONES + 9).toString().padStart(4, '0')}`);
  });

  it('unions remote tombstones into local without losing local-only ones', () => {
    addStanzaDriveTombstone('local-only', '2026-05-17T08:00:00.000Z');
    addStanzaDriveTombstone('overlap', '2026-05-17T09:00:00.000Z');
    unionStanzaDriveTombstones([
      { fileId: 'overlap', removedAt: '2026-05-17T11:00:00.000Z' },
      { fileId: 'remote-only', removedAt: '2026-05-17T10:00:00.000Z' },
    ]);
    const list = readStanzaDriveTombstones();
    const byId = new Map(list.map((t) => [t.fileId, t.removedAt]));
    expect(byId.get('local-only')).toBe('2026-05-17T08:00:00.000Z');
    expect(byId.get('overlap')).toBe('2026-05-17T11:00:00.000Z');
    expect(byId.get('remote-only')).toBe('2026-05-17T10:00:00.000Z');
  });

  it('union with no new content does not emit a change event', () => {
    addStanzaDriveTombstone('only', '2026-05-17T08:00:00.000Z');
    const listener = vi.fn();
    window.addEventListener(STANZA_DRIVE_TOMBSTONES_CHANGED_EVENT, listener);
    try {
      unionStanzaDriveTombstones([{ fileId: 'only', removedAt: '2026-05-17T08:00:00.000Z' }]);
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(STANZA_DRIVE_TOMBSTONES_CHANGED_EVENT, listener);
    }
  });

  it('emits a same-tab change event when a tombstone is added', () => {
    const listener = vi.fn();
    window.addEventListener(STANZA_DRIVE_TOMBSTONES_CHANGED_EVENT, listener);
    try {
      addStanzaDriveTombstone('file-abc', '2026-05-17T22:00:00.000Z');
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(STANZA_DRIVE_TOMBSTONES_CHANGED_EVENT, listener);
    }
  });

  it('drops malformed persisted entries on read', () => {
    window.localStorage.setItem(
      'stanza_drive_file_tombstones_v1',
      JSON.stringify({
        schemaVersion: 1,
        tombstones: [
          { fileId: 'good', removedAt: '2026-05-17T08:00:00.000Z' },
          { fileId: '', removedAt: '2026-05-17T09:00:00.000Z' },
          { fileId: 'no-stamp' },
          null,
          'not-an-object',
        ],
      }),
    );
    const list = readStanzaDriveTombstones();
    expect(list).toEqual([{ fileId: 'good', removedAt: '2026-05-17T08:00:00.000Z' }]);
  });

  it('returns empty list when the persisted schema is unknown', () => {
    window.localStorage.setItem(
      'stanza_drive_file_tombstones_v1',
      JSON.stringify({ schemaVersion: 99, tombstones: [{ fileId: 'a', removedAt: 'b' }] }),
    );
    expect(readStanzaDriveTombstones()).toEqual([]);
  });
});
