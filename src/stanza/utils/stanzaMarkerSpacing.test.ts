import { describe, expect, it } from 'vitest';
import {
  canPlaceMarkerAtTime,
  clampMarkerTimeBetweenNeighbours,
  markersAreTooClose,
  STANZA_MIN_MARKER_GAP_SEC,
} from './stanzaMarkerSpacing';

describe('stanzaMarkerSpacing', () => {
  it('treats markers within min gap as too close', () => {
    expect(markersAreTooClose(10, 10 + STANZA_MIN_MARKER_GAP_SEC - 0.01)).toBe(true);
    expect(markersAreTooClose(10, 10 + STANZA_MIN_MARKER_GAP_SEC)).toBe(false);
  });

  it('rejects placing a marker on top of an existing one', () => {
    const markers = [{ id: 'a', time: 30, label: 'verse' }];
    expect(canPlaceMarkerAtTime(30.1, markers, 120)).toBe(false);
    expect(canPlaceMarkerAtTime(30.6, markers, 120)).toBe(true);
  });

  it('clamps drag so neighbours stay at least min gap apart', () => {
    const markers = [
      { id: 'a', time: 10, label: 'A' },
      { id: 'b', time: 20, label: 'B' },
    ];
    const clamped = clampMarkerTimeBetweenNeighbours('b', 20.1, markers, 120);
    expect(clamped).toBeGreaterThanOrEqual(10 + STANZA_MIN_MARKER_GAP_SEC);
    expect(clamped).toBeLessThanOrEqual(120 - STANZA_MIN_MARKER_GAP_SEC);
  });
});
