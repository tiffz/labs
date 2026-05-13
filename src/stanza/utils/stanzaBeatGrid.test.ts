import { describe, expect, it } from 'vitest';
import { commitSelectionSpanToHullBoundaryMarkers } from './stanzaBeatGrid';
import type { StanzaMarker } from '../db/stanzaDb';

const m = (id: string, time: number): StanzaMarker => ({ id, time, label: '' });

describe('commitSelectionSpanToHullBoundaryMarkers', () => {
  it('moves outer hull markers to match effective span', () => {
    const markers: StanzaMarker[] = [m('a', 10), m('b', 40)];
    const hull = { start: 10, end: 40 };
    const effective = { start: 8, end: 42 };
    const next = commitSelectionSpanToHullBoundaryMarkers(markers, 120, hull, effective);
    expect(next).not.toBeNull();
    const byId = Object.fromEntries(next!.map((x) => [x.id, x.time]));
    expect(byId.a).toBeCloseTo(8, 5);
    expect(byId.b).toBeCloseTo(42, 5);
  });

  it('returns null when span matches hull', () => {
    const markers: StanzaMarker[] = [m('a', 10), m('b', 40)];
    const hull = { start: 10, end: 40 };
    const effective = { start: 10, end: 40 };
    expect(commitSelectionSpanToHullBoundaryMarkers(markers, 120, hull, effective)).toBeNull();
  });
});
