// @vitest-environment node
/**
 * The owner's report: "I lost my section yet again today", on a YouTube song, with Drive sync
 * paused for a month — so nothing to do with syncing. She loses the section she just added.
 *
 * `stanzaSegmentLayoutDuration` falls back to the marker extent when no media duration is known
 * (`maxMarkerTime + STANZA_TIME_EPS`), and `sanitizeStanzaMarkers` then deletes any marker at
 * `>= duration - STANZA_TIME_EPS` whose label is auto-generated. Those two cancel out exactly: the
 * newest marker is ALWAYS judged to be sitting on the track end. A section added with its default
 * `Marker N` label is deleted the moment it is saved, and the write uses `recordUndo: false`, so
 * undo cannot bring it back.
 */
import { describe, expect, it } from 'vitest';
import { sanitizeStanzaMarkers, STANZA_TIME_EPS } from './segments';
import {
  stanzaMediaDurationForMarkerTrim,
  stanzaSegmentLayoutDuration,
} from './stanzaSegmentLayoutDuration';

const m = (id: string, time: number, label: string) => ({ id, time, label });

describe('a newly added section survives being saved', () => {
  it('keeps a default-labelled section added past the last one, with no media duration yet', () => {
    // A YouTube song whose iframe player has not reported duration (still loading, or it errored).
    const existing = [m('a', 0, 'Intro'), m('b', 30, 'Verse')];
    const added = m('c', 90, 'Marker 3'); // the default label addMarkerAtPlayhead assigns
    const next = [...existing, added];

    // persistSong now trims against the MEDIA duration, which is unknown here (0).
    const duration = stanzaMediaDurationForMarkerTrim({ playbackDuration: 0 });
    const clean = sanitizeStanzaMarkers(next, duration);

    // The old code used the layout duration, derived from the previous markers — that is what
    // deleted the section. Kept here so this test fails again if anyone routes it back.
    const layoutDuration = stanzaSegmentLayoutDuration({ markers: existing, playbackDuration: 0 });
    expect(sanitizeStanzaMarkers(next, layoutDuration).map((x) => x.id)).not.toContain('c');

    expect(clean.map((x) => x.id)).toContain('c');
  });

  it('keeps the newest section when the duration is derived from the markers themselves', () => {
    const markers = [m('a', 0, 'Intro'), m('b', 30, 'Verse'), m('c', 90, 'Marker 3')];

    // The circularity, stated plainly: the layout extent is maxTime + EPS and the trim cuts at
    // duration - EPS, so the last marker always landed exactly on the cut.
    const layoutDuration = stanzaSegmentLayoutDuration({ markers, playbackDuration: 0 });
    expect(layoutDuration).toBeCloseTo(90 + STANZA_TIME_EPS, 6);
    expect(sanitizeStanzaMarkers(markers, layoutDuration).map((x) => x.id)).not.toContain('c');

    // The cleanup effect now passes the media duration, so the newest section survives.
    const duration = stanzaMediaDurationForMarkerTrim({ playbackDuration: 0 });
    expect(sanitizeStanzaMarkers(markers, duration).map((x) => x.id)).toContain('c');
  });

  it('a renamed section survives today — which is why the loss looks arbitrary', () => {
    const markers = [m('a', 0, 'Intro'), m('c', 90, 'Outro')];
    const layoutDuration = stanzaSegmentLayoutDuration({ markers, playbackDuration: 0 });
    expect(sanitizeStanzaMarkers(markers, layoutDuration).map((x) => x.id)).toContain('c');
  });

  it('still drops a genuine ghost marker at 0:00 (the behaviour this trim exists for)', () => {
    const markers = [m('ghost', 0, 'Marker 1'), m('real', 30, 'Verse')];
    const clean = sanitizeStanzaMarkers(markers, 240);
    expect(clean.map((x) => x.id)).toEqual(['real']);
  });

  it('still drops an auto-labelled marker sitting on a REAL media end', () => {
    const markers = [m('a', 0, 'Intro'), m('edge', 240, 'Marker 2')];
    const clean = sanitizeStanzaMarkers(markers, 240);
    expect(clean.map((x) => x.id)).toEqual(['a']);
  });
});
