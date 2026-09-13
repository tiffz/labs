// @vitest-environment node
/**
 * The owner, practising in Stanza: "the looping of section lengths is very inconsistent, with some
 * loops going multiple bars past where I think the section is supposed to end."
 *
 * Multiple bars is seconds, so this is not the ~220 ms clock-quantisation error. Her prod crash log
 * shows `TypeError: e.getPlayerState is not a function` in the YouTube player chunk — the
 * controller degrades in real use. When it does:
 *
 *   - `getCurrentTime` answered **0**, a finite number every consumer accepted as a position;
 *   - section looping compared that against the section end, never crossed it, and never wrapped;
 *   - and it had no stall tracking at all (`nextStalledFrames: 0`, every tick, unconditionally),
 *     unlike whole-song looping, which has tracked advance since `decideStanzaLoopWrap`.
 *
 * Section looping is the mode she actually practises in, and it was the one flying blind.
 */
import { describe, expect, it } from 'vitest';
import { evaluateStanzaTransportLoopTick } from './stanzaTransportLoop';

const SPAN = { start: 10, end: 20 };

const tick = (over: {
  transportTime: number;
  previousTransportTime: number | null;
  stalledFrames?: number;
}) =>
  evaluateStanzaTransportLoopTick({
    transportTime: over.transportTime,
    duration: 300,
    loopMode: 'loopSelection',
    segments: [],
    skipped: {},
    selectionSpan: SPAN,
    previousTransportTime: over.previousTransportTime,
    stalledFrames: over.stalledFrames ?? 0,
    userEnteredSectionId: null,
  });

describe('section looping notices when the transport clock dies', () => {
  it('still wraps at the section end during healthy playback', () => {
    const r = tick({ transportTime: 20.0, previousTransportTime: 19.98 });
    expect(r.wrapSeekTarget).toBe(SPAN.start);
  });

  it('still pre-rolls forward when the playhead is genuinely before the loop start', () => {
    const r = tick({ transportTime: 4, previousTransportTime: 3.98 });
    expect(r.seekBeforeLoopStart).toBe(SPAN.start);
  });

  it('reports no stall while the clock is advancing', () => {
    const r = tick({ transportTime: 15.5, previousTransportTime: 15.48 });
    expect(r.transportClockStalled).toBe(false);
    expect(r.nextStalledFrames).toBe(0);
  });

  it('detects a frozen clock — the multiple-bars case', () => {
    // The controller degraded mid-section; the reading stops moving while audio keeps playing.
    let stalled = 0;
    let result = tick({ transportTime: 15.5, previousTransportTime: 15.5 });
    stalled = result.nextStalledFrames;
    expect(stalled).toBe(1);

    result = tick({ transportTime: 15.5, previousTransportTime: 15.5, stalledFrames: stalled });
    // Old code hard-set nextStalledFrames: 0 every tick, so this could never accumulate.
    expect(result.nextStalledFrames).toBeGreaterThanOrEqual(2);
    expect(result.transportClockStalled).toBe(true);
  });

  it('does not chase a bogus 0 back to the section start', () => {
    // A dead controller used to answer 0. The old pre-roll branch read that as "before the loop"
    // and seeked — an unexplained jump in the middle of practice.
    const r = tick({ transportTime: 0, previousTransportTime: 15.5 });
    expect(r.seekBeforeLoopStart).toBeNull();
    expect(r.transportClockStalled).toBe(true);
  });

  it('does not adopt the bogus reading as the new baseline', () => {
    // Otherwise the next tick compares against 0 and concludes the clock resumed advancing.
    const r = tick({ transportTime: 0, previousTransportTime: 15.5 });
    expect(r.nextPreviousTransportTime).toBe(15.5);
  });

  it('tolerates ordinary jitter from a coarse YouTube clock', () => {
    // ~250ms granularity means a repeated sample is normal; it must not read as a broken clock on
    // the first frame, only as a sustained stall.
    const r = tick({ transportTime: 15.5, previousTransportTime: 15.5 });
    expect(r.transportClockStalled).toBe(false);
  });
});
