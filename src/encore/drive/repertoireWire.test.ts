import { describe, expect, it } from 'vitest';
import type { EncoreSong } from '../types';
import { mergeRecordsByUpdatedAt, parseRepertoireWire, serializeRepertoireWire, buildWireFromTables } from './repertoireWire';

describe('parseRepertoireWire', () => {
  it('parses valid payload', () => {
    const wire = buildWireFromTables([], []);
    const round = parseRepertoireWire(serializeRepertoireWire(wire));
    expect(round.songs).toEqual([]);
    expect(round.performances).toEqual([]);
  });

  it('rejects invalid', () => {
    expect(() => parseRepertoireWire('{}')).toThrow();
  });
});

describe('mergeRecordsByUpdatedAt', () => {
  it('keeps newer updatedAt per id', () => {
    const a: EncoreSong = {
      id: '1',
      title: 'A',
      artist: 'X',
      journalMarkdown: '',
      createdAt: '2020-01-01',
      updatedAt: '2020-01-02',
    };
    const b: EncoreSong = { ...a, title: 'B', updatedAt: '2020-01-03' };
    const merged = mergeRecordsByUpdatedAt<EncoreSong>([a], [b]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.title).toBe('B');
  });
});
