import { describe, expect, it } from 'vitest';
import {
  commitSelectionSpanToHullBoundaryMarkers,
  nextBeatMediaTimeAtOrAfter,
  previousBeatMediaTimeAtOrBefore,
  sectionBoundaryBeatMisaligned,
  snapSegmentBoundaryMarkersToBeats,
} from './stanzaBeatGrid';
import type { StanzaMarker, StanzaSegmentMetronomeCalibration } from '../db/stanzaDb';
import { deriveSegments } from './segments';

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

describe('nextBeatMediaTimeAtOrAfter', () => {
  it('returns t unchanged when t is on a beat (within epsilon)', () => {
    expect(nextBeatMediaTimeAtOrAfter(1.0, 0, 120)).toBeCloseTo(1.0, 6);
  });

  it('rounds UP to the next beat when t is mid-beat', () => {
    expect(nextBeatMediaTimeAtOrAfter(1.25, 0, 120)).toBeCloseTo(1.5, 6);
  });

  it('rounds UP to the next beat when t is just past a beat', () => {
    expect(nextBeatMediaTimeAtOrAfter(1.05, 0, 120)).toBeCloseTo(1.5, 6);
  });

  it('rounds UP to the next beat when t is just before a beat', () => {
    expect(nextBeatMediaTimeAtOrAfter(1.45, 0, 120)).toBeCloseTo(1.5, 6);
  });

  it('respects a non-zero anchor (Beat 1 at 0.3s, BPM 60)', () => {
    expect(nextBeatMediaTimeAtOrAfter(1.4, 0.3, 60)).toBeCloseTo(2.3, 6);
    expect(nextBeatMediaTimeAtOrAfter(1.3, 0.3, 60)).toBeCloseTo(1.3, 6);
  });
});

describe('previousBeatMediaTimeAtOrBefore', () => {
  it('returns t unchanged when t is on a beat (within epsilon)', () => {
    expect(previousBeatMediaTimeAtOrBefore(1.0, 0, 120)).toBeCloseTo(1.0, 6);
  });

  it('rounds DOWN to the previous beat when t is mid-beat', () => {
    expect(previousBeatMediaTimeAtOrBefore(1.25, 0, 120)).toBeCloseTo(1.0, 6);
  });

  it('rounds DOWN to the previous beat when t is just past a beat', () => {
    expect(previousBeatMediaTimeAtOrBefore(1.05, 0, 120)).toBeCloseTo(1.0, 6);
  });

  it('respects a non-zero anchor (Beat 1 at 0.3s, BPM 60)', () => {
    expect(previousBeatMediaTimeAtOrBefore(1.4, 0.3, 60)).toBeCloseTo(1.3, 6);
  });
});

const songCal = (bpm: number, anchor: number): StanzaSegmentMetronomeCalibration => ({
  bpm,
  anchorMediaTime: anchor,
  source: 'tap',
});

describe('snapSegmentBoundaryMarkersToBeats (snap-start + pad-end)', () => {
  it('snaps the start to the nearest beat AND pads the end forward', () => {
    // Song calibration: BPM 120 at anchor 0 → beats every 0.5s starting from 0.
    // Section: marker 'start' at 5.05 (between beats 5.0 and 5.5; nearest = 5.0).
    // End marker at 12.35 (between beats 12.0 and 12.5; pad → 12.5).
    const markers: StanzaMarker[] = [m('start', 5.05), m('end', 12.35)];
    const duration = 60;
    const segments = deriveSegments(markers, duration);
    const result = snapSegmentBoundaryMarkersToBeats(
      1,
      segments,
      markers,
      duration,
      undefined,
      songCal(120, 0),
    );
    expect(result).not.toBeNull();
    const byId = Object.fromEntries(result!.markers.map((x) => [x.id, x.time]));
    expect(byId.start).toBeCloseTo(5.0, 6);
    expect(byId.end).toBeCloseTo(12.5, 6);
    // No section override, so no calibration update.
    expect(result!.updatedSegmentCalibration).toBeUndefined();
  });

  it('does nothing when both boundaries already sit on beats', () => {
    const markers: StanzaMarker[] = [m('start', 5.0), m('end', 12.0)];
    const segments = deriveSegments(markers, 60);
    const result = snapSegmentBoundaryMarkersToBeats(
      1,
      segments,
      markers,
      60,
      undefined,
      songCal(120, 0),
    );
    expect(result).toBeNull();
  });

  it('refuses to pad the end when the next marker would be crossed', () => {
    // Section ends at 12.35, would pad to 12.5; next marker sits at 12.4.
    const markers: StanzaMarker[] = [m('start', 5.0), m('end', 12.35), m('next', 12.4)];
    const segments = deriveSegments(markers, 60);
    const result = snapSegmentBoundaryMarkersToBeats(
      1,
      segments,
      markers,
      60,
      undefined,
      songCal(120, 0),
    );
    // Start was already on a beat (5.0) so nothing else moves either → null.
    expect(result).toBeNull();
  });

  it('still snaps the start even if the end pad is blocked', () => {
    // Song grid BPM 60 → beats every 1.0s from 0. Start 5.05 → nearest beat
    // 5.0. End 12.35 wants 13.0 but the next marker at 12.5 blocks the pad.
    // Result: start moves, end stays put.
    const markers: StanzaMarker[] = [m('start', 5.05), m('end', 12.35), m('next', 12.5)];
    const segments = deriveSegments(markers, 60);
    const result = snapSegmentBoundaryMarkersToBeats(
      1,
      segments,
      markers,
      60,
      undefined,
      songCal(60, 0),
    );
    expect(result).not.toBeNull();
    const byId = Object.fromEntries(result!.markers.map((x) => [x.id, x.time]));
    expect(byId.start).toBeCloseTo(5.0, 6);
    expect(byId.end).toBeCloseTo(12.35, 6);
  });

  it('skips the start move on the first section (start is fixed at 0)', () => {
    // Song grid: BPM 120 anchored at 0.3 → beats at 0.3, 0.8, ... so segment[0]
    // start (0) does NOT sit on a beat. Snapping start would require moving
    // backward into negative time; we leave the first section's start alone.
    // End marker at 5.0 should still pad forward to 5.3.
    const markers: StanzaMarker[] = [m('end', 5.0)];
    const segments = deriveSegments(markers, 60);
    const result = snapSegmentBoundaryMarkersToBeats(
      0,
      segments,
      markers,
      60,
      undefined,
      songCal(120, 0.3),
    );
    expect(result).not.toBeNull();
    const byId = Object.fromEntries(result!.markers.map((x) => [x.id, x.time]));
    expect(byId.end).toBeCloseTo(5.3, 6);
  });

  it('returns null for the last section when nothing else moves', () => {
    // Last section's end is the track end (no marker). With start already on a beat,
    // there is nothing to snap.
    const markers: StanzaMarker[] = [m('start', 5.0)];
    const duration = 12.35;
    const segments = deriveSegments(markers, duration);
    const result = snapSegmentBoundaryMarkersToBeats(
      segments.length - 1,
      segments,
      markers,
      duration,
      undefined,
      songCal(120, 0),
    );
    expect(result).toBeNull();
  });

  it('uses the section override grid when present', () => {
    const markers: StanzaMarker[] = [m('start', 5.05), m('end', 12.35)];
    const segments = deriveSegments(markers, 60);
    const sectionId = segments[1]!.id;
    // Section grid: anchor 5.30, BPM 60 → beats every 1.0s from 5.30.
    // Beats inside: 5.30, 6.30, ..., 12.30. Start 5.05 → nearest beat = 5.30.
    // End 12.35 → pad to 13.30.
    const overrides: Record<string, StanzaSegmentMetronomeCalibration> = {
      [sectionId]: { bpm: 60, anchorMediaTime: 5.3, source: 'tap' },
    };
    const result = snapSegmentBoundaryMarkersToBeats(
      1,
      segments,
      markers,
      60,
      overrides,
      songCal(120, 0),
    );
    expect(result).not.toBeNull();
    const byId = Object.fromEntries(result!.markers.map((x) => [x.id, x.time]));
    expect(byId.start).toBeCloseTo(5.3, 6);
    expect(byId.end).toBeCloseTo(13.3, 6);
  });

  it('returns an updated section calibration when a section-scope start moves', () => {
    // Section override: anchor 5.30 (Beat 1 in original calibration), BPM 60.
    // Snap moves start from 5.05 → 5.30 (the nearest grid beat = the existing
    // Beat 1). After the snap we re-anchor: firstBeatOffsetSec = 0,
    // anchorMediaTime = new start (5.30 — same as before in this case).
    const markers: StanzaMarker[] = [m('start', 5.05), m('end', 12.0)];
    const segments = deriveSegments(markers, 60);
    const sectionId = segments[1]!.id;
    const overrides: Record<string, StanzaSegmentMetronomeCalibration> = {
      [sectionId]: { bpm: 60, anchorMediaTime: 5.3, firstBeatOffsetSec: 0.25, source: 'tap' },
    };
    const result = snapSegmentBoundaryMarkersToBeats(
      1,
      segments,
      markers,
      60,
      overrides,
      songCal(120, 0),
    );
    expect(result).not.toBeNull();
    expect(result!.updatedSegmentCalibration).toBeDefined();
    expect(result!.updatedSegmentCalibration!.segmentId).toBe(sectionId);
    expect(result!.updatedSegmentCalibration!.calibration.firstBeatOffsetSec).toBe(0);
    expect(result!.updatedSegmentCalibration!.calibration.anchorMediaTime).toBeCloseTo(5.3, 6);
    expect(result!.updatedSegmentCalibration!.calibration.bpm).toBe(60);
  });

  it('does NOT return an updated calibration when the start did not move (only end padded)', () => {
    // Start is already on a beat; only the end pads. Calibration should stay
    // exactly as-is (no spurious re-anchor).
    const markers: StanzaMarker[] = [m('start', 5.3), m('end', 12.35)];
    const segments = deriveSegments(markers, 60);
    const sectionId = segments[1]!.id;
    const overrides: Record<string, StanzaSegmentMetronomeCalibration> = {
      [sectionId]: { bpm: 60, anchorMediaTime: 5.3, firstBeatOffsetSec: 0, source: 'tap' },
    };
    const result = snapSegmentBoundaryMarkersToBeats(
      1,
      segments,
      markers,
      60,
      overrides,
      songCal(120, 0),
    );
    expect(result).not.toBeNull();
    expect(result!.updatedSegmentCalibration).toBeUndefined();
  });
});

describe('sectionBoundaryBeatMisaligned', () => {
  it('flags an end that is off the grid', () => {
    const markers: StanzaMarker[] = [m('end', 12.35)];
    const segments = deriveSegments(markers, 60);
    expect(sectionBoundaryBeatMisaligned(segments[0]!, 60, undefined, songCal(120, 0))).toBe(true);
  });

  it('flags a start that is off the grid (non-first section)', () => {
    // Two interior markers: middle section starts at 5.05 (off-grid for BPM 120).
    const markers: StanzaMarker[] = [m('a', 5.05), m('b', 12.0)];
    const segments = deriveSegments(markers, 60);
    expect(sectionBoundaryBeatMisaligned(segments[1]!, 60, undefined, songCal(120, 0))).toBe(true);
  });

  it('does not flag a section whose boundaries land on beats', () => {
    const markers: StanzaMarker[] = [m('a', 5.0), m('b', 12.0)];
    const segments = deriveSegments(markers, 60);
    expect(sectionBoundaryBeatMisaligned(segments[1]!, 60, undefined, songCal(120, 0))).toBe(false);
  });

  it('ignores the first section start (fixed at 0; not user-movable)', () => {
    // Anchor 0.3 → beats at 0.3, 0.8, ... First section's start (0) is off-grid
    // but unmovable, so we don't flag it. End at 5.0 IS off-grid → still flagged.
    const markers: StanzaMarker[] = [m('end', 5.0)];
    const segments = deriveSegments(markers, 60);
    expect(sectionBoundaryBeatMisaligned(segments[0]!, 60, undefined, songCal(120, 0.3))).toBe(true);
  });

  it('does not flag the last section (its end is the track end)', () => {
    const markers: StanzaMarker[] = [m('start', 5.0)];
    const duration = 12.0;
    const segments = deriveSegments(markers, duration);
    const last = segments[segments.length - 1]!;
    expect(sectionBoundaryBeatMisaligned(last, duration, undefined, songCal(120, 0))).toBe(false);
  });
});
