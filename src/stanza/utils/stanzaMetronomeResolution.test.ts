import { describe, expect, it } from 'vitest';
import {
  resolveStanzaMetronomeGridSync,
  resolveStanzaMetronomePlaybackSync,
  STANZA_SONG_METRONOME_LIVE_ID,
} from './stanzaMetronomeResolution';
import type { DerivedSegment } from './segments';

const seg = (id: string, start: number): DerivedSegment => ({
  id,
  index: 0,
  start,
  end: start + 30,
  label: 'A',
});

const tapCal = (bpm: number, anchor: number, start: number) => ({
  bpm,
  anchorMediaTime: anchor,
  firstBeatOffsetSec: anchor - start,
  source: 'tap' as const,
});

describe('resolveStanzaMetronomeGridSync', () => {
  it('returns calibration when metronome toggle is off (drums use the same grid)', () => {
    expect(
      resolveStanzaMetronomeGridSync({
        playbackSeg: seg('a', 10),
        songCal: tapCal(100, 0, 0),
        segmentCal: undefined,
        railLive: null,
      }),
    ).toEqual({ bpm: 100, anchor: 0 });
  });

  it('returns empty when no playback segment', () => {
    expect(
      resolveStanzaMetronomeGridSync({
        playbackSeg: null,
        songCal: tapCal(100, 0, 0),
        segmentCal: undefined,
        railLive: null,
      }),
    ).toEqual({});
  });
});

describe('resolveStanzaMetronomePlaybackSync', () => {
  it('returns empty when metronome disabled', () => {
    expect(
      resolveStanzaMetronomePlaybackSync({
        metronomeEnabled: false,
        playbackSeg: seg('a', 10),
        songCal: tapCal(100, 0, 0),
        segmentCal: undefined,
        railLive: null,
      }),
    ).toEqual({});
  });

  it('returns empty when no playback segment', () => {
    expect(
      resolveStanzaMetronomePlaybackSync({
        metronomeEnabled: true,
        playbackSeg: null,
        songCal: tapCal(100, 0, 0),
        segmentCal: undefined,
        railLive: null,
      }),
    ).toEqual({});
  });

  it('prefers live rail for the current section', () => {
    const s = seg('x', 5);
    expect(
      resolveStanzaMetronomePlaybackSync({
        metronomeEnabled: true,
        playbackSeg: s,
        songCal: tapCal(90, 0, 0),
        segmentCal: tapCal(120, 6, 5),
        railLive: { segmentId: 'x', bpm: 140, anchorMediaTime: 5.5 },
      }),
    ).toEqual({ bpm: 140, anchor: 5.5 });
  });

  it('prefers live rail for whole song while playing any section', () => {
    const s = seg('x', 12);
    expect(
      resolveStanzaMetronomePlaybackSync({
        metronomeEnabled: true,
        playbackSeg: s,
        songCal: tapCal(90, 0, 0),
        segmentCal: tapCal(120, 13, 12),
        railLive: { segmentId: STANZA_SONG_METRONOME_LIVE_ID, bpm: 88, anchorMediaTime: 0.2 },
      }),
    ).toEqual({ bpm: 88, anchor: 0.2 });
  });

  it('ignores rail targeted at a different section', () => {
    const s = seg('x', 12);
    expect(
      resolveStanzaMetronomePlaybackSync({
        metronomeEnabled: true,
        playbackSeg: s,
        songCal: tapCal(90, 0, 0),
        segmentCal: tapCal(120, 13, 12),
        railLive: { segmentId: 'other', bpm: 200, anchorMediaTime: 1 },
      }),
    ).toEqual({ bpm: 120, anchor: 13 });
  });

  it('honors rail live for the rail focus segment even when playback is elsewhere', () => {
    const playback = seg('x', 12);
    expect(
      resolveStanzaMetronomePlaybackSync({
        metronomeEnabled: true,
        playbackSeg: playback,
        songCal: tapCal(90, 0, 0),
        segmentCal: tapCal(120, 13, 12),
        railLive: { segmentId: 'other', bpm: 200, anchorMediaTime: 1 },
        railFocusSegmentId: 'other',
      }),
    ).toEqual({ bpm: 200, anchor: 1 });
  });

  it('uses segment calibration over song when segment is set', () => {
    const s = seg('x', 10);
    expect(
      resolveStanzaMetronomePlaybackSync({
        metronomeEnabled: true,
        playbackSeg: s,
        songCal: tapCal(90, 0, 0),
        segmentCal: tapCal(120, 11, 10),
        railLive: null,
      }),
    ).toEqual({ bpm: 120, anchor: 11 });
  });

  it('inherits song calibration when section has none', () => {
    const s = seg('x', 10);
    expect(
      resolveStanzaMetronomePlaybackSync({
        metronomeEnabled: true,
        playbackSeg: s,
        songCal: tapCal(100, 0.5, 0),
        segmentCal: undefined,
        railLive: null,
      }),
    ).toEqual({ bpm: 100, anchor: 0.5 });
  });
});
