import { describe, expect, it } from 'vitest';
import type { EncoreSong } from '../types';
import { withPracticingToggle } from './practicingToggle';

const ISO = '2026-01-01T00:00:00.000Z';
const NOW = '2026-05-16T10:00:00.000Z';

function baseSong(overrides: Partial<EncoreSong> = {}): EncoreSong {
  return {
    id: 's1',
    title: 'Yesterday',
    artist: 'The Beatles',
    journalMarkdown: '',
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

describe('withPracticingToggle', () => {
  it('turning practicing ON sets practicing=true and bumps updatedAt', () => {
    const next = withPracticingToggle(baseSong(), true, NOW);
    expect(next.practicing).toBe(true);
    expect(next.updatedAt).toBe(NOW);
  });

  it('turning practicing ON removes any existing practiceRemovedAt tombstone', () => {
    const song = baseSong({ practicing: false, practiceRemovedAt: ISO });
    const next = withPracticingToggle(song, true, NOW);
    expect(next.practicing).toBe(true);
    expect('practiceRemovedAt' in next).toBe(false);
  });

  it('turning practicing OFF sets practicing=false AND sets practiceRemovedAt to now', () => {
    const song = baseSong({ practicing: true });
    const next = withPracticingToggle(song, false, NOW);
    expect(next.practicing).toBe(false);
    expect(next.practiceRemovedAt).toBe(NOW);
    expect(next.updatedAt).toBe(NOW);
  });

  it('turning practicing OFF on a song that already had a tombstone refreshes the tombstone', () => {
    const oldTombstone = '2025-01-01T00:00:00.000Z';
    const song = baseSong({ practicing: false, practiceRemovedAt: oldTombstone });
    const next = withPracticingToggle(song, false, NOW);
    expect(next.practiceRemovedAt).toBe(NOW);
  });

  it('preserves unrelated fields (title, artist, attachments) verbatim', () => {
    const song = baseSong({
      tags: ['ballad', 'pop'],
      performanceKey: 'C',
      attachments: [{ kind: 'chart', driveFileId: 'abc123' }],
    });
    const next = withPracticingToggle(song, true, NOW);
    expect(next.tags).toEqual(['ballad', 'pop']);
    expect(next.performanceKey).toBe('C');
    expect(next.attachments).toEqual([{ kind: 'chart', driveFileId: 'abc123' }]);
  });

  it('returns a new object (does not mutate the input)', () => {
    const song = baseSong();
    const next = withPracticingToggle(song, true, NOW);
    expect(next).not.toBe(song);
    expect(song.updatedAt).toBe(ISO);
    expect(song.practicing).toBeUndefined();
  });

  it('defaults nowIso to a fresh timestamp when not supplied', () => {
    const before = Date.now();
    const next = withPracticingToggle(baseSong(), true);
    const after = Date.now();
    const stampMs = Date.parse(next.updatedAt);
    expect(stampMs).toBeGreaterThanOrEqual(before);
    expect(stampMs).toBeLessThanOrEqual(after);
  });
});
