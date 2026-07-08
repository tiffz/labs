import { describe, expect, it } from 'vitest';
import type { DerivedSegment } from './segments';
import { STANZA_LOOP_WRAP_TOLERANCE_SEC } from './stanzaPlaybackLoop';
import { createStanzaLoopWrapGuard } from './stanzaLoopWrapGuard';
import {
  evaluateStanzaTransportLoopTick,
  resolveStanzaLoopPlaybackWindow,
} from './stanzaTransportLoop';

function seg(index: number, start: number, end: number): DerivedSegment {
  return { id: `seg-${index}`, index, start, end, label: `s${index}` };
}

const segments: DerivedSegment[] = [
  seg(0, 0, 10),
  seg(1, 10, 20),
  seg(2, 20, 30),
  seg(3, 30, 40),
  seg(4, 40, 50),
];

describe('resolveStanzaLoopPlaybackWindow', () => {
  it('uses playable anchors for loopSelection when the tail is skipped', () => {
    const window = resolveStanzaLoopPlaybackWindow({
      loopMode: 'loopSelection',
      duration: 50,
      selectionSpan: { start: 20, end: 50 },
      segments,
      skipped: { 'seg-3': true, 'seg-4': true },
    });
    expect(window?.loopWrapEnd).toBeCloseTo(30 - 0.02);
    expect(window?.windowEnd).toBe(50);
  });
});

describe('evaluateStanzaTransportLoopTick', () => {
  it('pauses instead of infinite seek when every section in a loop window is skipped', () => {
    const result = evaluateStanzaTransportLoopTick({
      transportTime: 22,
      duration: 50,
      loopMode: 'loopSelection',
      segments,
      skipped: { 'seg-2': true, 'seg-3': true },
      selectionSpan: { start: 20, end: 40 },
      previousTransportTime: 21.9,
      stalledFrames: 0,
      userEnteredSectionId: null,
    });
    expect(result.skipSeekTarget).toBeNull();
    expect(result.skipExhaustedPause).toBe(true);
    expect(result.wrapSeekTarget).toBeNull();
  });

  it('does not wrap loopAll while transport is still advancing past a short duration', () => {
    const reported = 175;
    const near = reported - STANZA_LOOP_WRAP_TOLERANCE_SEC * 0.5;
    const first = evaluateStanzaTransportLoopTick({
      transportTime: near,
      duration: reported,
      loopMode: 'loopAll',
      segments: [seg(0, 0, reported)],
      skipped: undefined,
      selectionSpan: null,
      previousTransportTime: near - 0.05,
      stalledFrames: 0,
      userEnteredSectionId: null,
    });
    expect(first.wrapSeekTarget).toBeNull();

    const second = evaluateStanzaTransportLoopTick({
      transportTime: near + 0.02,
      duration: reported,
      loopMode: 'loopAll',
      segments: [seg(0, 0, reported)],
      skipped: undefined,
      selectionSpan: null,
      previousTransportTime: first.nextPreviousTransportTime,
      stalledFrames: first.nextStalledFrames,
      userEnteredSectionId: null,
    });
    expect(second.wrapSeekTarget).toBeNull();
    expect(second.grownDuration).toBeGreaterThan(reported);
  });

  it('wraps loopSelection immediately when transport passes the playable end (even while advancing)', () => {
    const result = evaluateStanzaTransportLoopTick({
      transportTime: 29.99,
      duration: 50,
      loopMode: 'loopSelection',
      segments,
      skipped: undefined,
      selectionSpan: { start: 20, end: 30 },
      previousTransportTime: 29.96,
      stalledFrames: 0,
      userEnteredSectionId: null,
    });
    expect(result.wrapSeekTarget).toBe(20);
  });

  it('wraps loopSelection at the playable end, not the skipped marker span end', () => {
    const playableEnd = 30 - 0.02;
    const result = evaluateStanzaTransportLoopTick({
      transportTime: playableEnd - STANZA_LOOP_WRAP_TOLERANCE_SEC * 0.25,
      duration: 50,
      loopMode: 'loopSelection',
      segments,
      skipped: { 'seg-3': true, 'seg-4': true },
      selectionSpan: { start: 20, end: 50 },
      previousTransportTime: playableEnd - 0.1,
      stalledFrames: 0,
      userEnteredSectionId: null,
    });
    expect(result.wrapSeekTarget).toBe(20);
  });
});

describe('loop wrap coalescing (characterization)', () => {
  it('documents that duplicate wrap entry points must share a guard', () => {
    const guard = createStanzaLoopWrapGuard(100);
    const rafWrap = guard.tryPerform(500);
    const endedWrap = guard.tryPerform(520);
    expect(rafWrap).toBe(true);
    expect(endedWrap).toBe(false);
  });
});
