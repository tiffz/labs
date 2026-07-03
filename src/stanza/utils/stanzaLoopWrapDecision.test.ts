import { describe, expect, it } from 'vitest';
import {
  decideStanzaLoopWrap,
  STANZA_LOOP_TRANSPORT_STALL_FRAME_THRESHOLD,
} from './stanzaLoopWrapDecision';
import { STANZA_LOOP_WRAP_TOLERANCE_SEC } from './stanzaPlaybackLoop';

describe('decideStanzaLoopWrap', () => {
  it('does not wrap while transport is still advancing near a short reported duration', () => {
    const end = 175;
    const near = end - STANZA_LOOP_WRAP_TOLERANCE_SEC * 0.5;
    const first = decideStanzaLoopWrap({
      transportTime: near,
      loopEnd: end,
      reportedDuration: end,
      previousTransportTime: near - 0.05,
      stalledFrames: 0,
    });
    expect(first.shouldWrap).toBe(false);
    expect(first.duration).toBe(end);

    const second = decideStanzaLoopWrap({
      transportTime: near + 0.02,
      loopEnd: end,
      reportedDuration: end,
      previousTransportTime: first.previousTransportTime,
      stalledFrames: first.stalledFrames,
    });
    expect(second.shouldWrap).toBe(false);
    expect(second.duration).toBeGreaterThan(end);
  });

  it('extends duration when transport runs past reported metadata and keeps playing', () => {
    const reported = 175;
    const t = 176.2;
    const decision = decideStanzaLoopWrap({
      transportTime: t,
      loopEnd: reported,
      reportedDuration: reported,
      previousTransportTime: 176.0,
      stalledFrames: 0,
    });
    expect(decision.shouldWrap).toBe(false);
    expect(decision.duration).toBe(t);
    expect(decision.loopEnd).toBe(t);
  });

  it('wraps after transport stalls near the (extended) loop end', () => {
    const reported = 180;
    const near = reported - STANZA_LOOP_WRAP_TOLERANCE_SEC * 0.25;
    let prev: number | null = 179.95;
    let stalled = 0;

    const approach = decideStanzaLoopWrap({
      transportTime: near,
      loopEnd: reported,
      reportedDuration: reported,
      previousTransportTime: prev,
      stalledFrames: stalled,
    });
    expect(approach.shouldWrap).toBe(false);
    prev = approach.previousTransportTime;
    stalled = approach.stalledFrames;

    let wrap = approach;
    for (let i = 0; i < STANZA_LOOP_TRANSPORT_STALL_FRAME_THRESHOLD; i++) {
      wrap = decideStanzaLoopWrap({
        transportTime: near,
        loopEnd: reported,
        reportedDuration: reported,
        previousTransportTime: prev,
        stalledFrames: stalled,
      });
      prev = wrap.previousTransportTime;
      stalled = wrap.stalledFrames;
    }
    expect(wrap.shouldWrap).toBe(true);
  });

  it('resets stall counting when the playhead leaves the wrap threshold', () => {
    const end = 120;
    const stalledNear = decideStanzaLoopWrap({
      transportTime: end - STANZA_LOOP_WRAP_TOLERANCE_SEC * 0.5,
      loopEnd: end,
      reportedDuration: end,
      previousTransportTime: end - STANZA_LOOP_WRAP_TOLERANCE_SEC * 0.5,
      stalledFrames: 1,
    });
    expect(stalledNear.stalledFrames).toBe(2);

    const mid = decideStanzaLoopWrap({
      transportTime: 60,
      loopEnd: end,
      reportedDuration: end,
      previousTransportTime: stalledNear.previousTransportTime,
      stalledFrames: stalledNear.stalledFrames,
    });
    expect(mid.stalledFrames).toBe(0);
    expect(mid.shouldWrap).toBe(false);
  });
});
