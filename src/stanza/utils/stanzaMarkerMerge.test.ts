import { describe, expect, it } from 'vitest';
import { mergeStanzaMarkers } from './stanzaMarkerMerge';

describe('mergeStanzaMarkers', () => {
  it('unions markers by stable id', () => {
    const local = [
      { id: 'a', time: 10, label: 'A' },
      { id: 'b', time: 40, label: 'Local chorus' },
    ];
    const remote = [
      { id: 'a', time: 10, label: 'A' },
      { id: 'c', time: 70, label: 'Bridge' },
    ];
    const merged = mergeStanzaMarkers(local, remote);
    expect(merged).toHaveLength(3);
    expect(merged.map((m) => m.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('matches markers by time when ids differ', () => {
    const local = [{ id: 'local-1', time: 12.0, label: 'Verse' }];
    const remote = [{ id: 'remote-1', time: 12.05, label: 'Verse' }];
    const merged = mergeStanzaMarkers(local, remote);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.label).toBe('Verse');
  });
});
