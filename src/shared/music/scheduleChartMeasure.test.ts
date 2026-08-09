import { describe, expect, it, vi } from 'vitest';
import { scheduleChartMeasure, CHART_MEASURE_LATE_SKIP_SEC } from './scheduleChartMeasure';
import type { AudioPlayer } from '../audio/audioPlayer';
import type { Instrument } from '../playback/instruments';

function mockInstrument(): Instrument & { playNote: ReturnType<typeof vi.fn>; stopAll: ReturnType<typeof vi.fn> } {
  return {
    playNote: vi.fn(),
    stopAll: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    getOutput: vi.fn(),
  } as unknown as Instrument & { playNote: ReturnType<typeof vi.fn>; stopAll: ReturnType<typeof vi.fn> };
}

function mockDrumPlayer(ctx: AudioContext): AudioPlayer & { playNowIfReady: ReturnType<typeof vi.fn> } {
  return {
    getAudioContext: () => ctx,
    playNowIfReady: vi.fn(),
  } as unknown as AudioPlayer & { playNowIfReady: ReturnType<typeof vi.fn> };
}

function makeCtx(currentTime: number): AudioContext {
  return { currentTime, state: 'running' } as unknown as AudioContext;
}

const BASE = {
  chordSymbol: 'C',
  chordStyleId: 'simple' as const,
  chordVelocity: 0.8,
  measureDurationSec: 2,
  timeSignature: { numerator: 4, denominator: 4 },
  drumPattern: 'D---T---K---T---',
  drumVolume: 0.8,
  tempo: 120,
};

describe('scheduleChartMeasure — single late gate (ADR 0025 step 2)', () => {
  it('schedules chord AND drum at the exact measure start when on time (no clamp)', () => {
    const ctx = makeCtx(100);
    const instrument = mockInstrument();
    const drumPlayer = mockDrumPlayer(ctx);
    const measureStartTime = 100.5;

    const result = scheduleChartMeasure({
      ...BASE,
      ctx,
      measureStartTime,
      instrument,
      drumPlayer,
    });

    expect(result).toBe('scheduled');
    expect(instrument.playNote).toHaveBeenCalled();
    // Chord beat 0 is scheduled at the true measure start, never clamped to currentTime.
    const firstChordStart = instrument.playNote.mock.calls[0]?.[0].startTime as number;
    expect(firstChordStart).toBeCloseTo(measureStartTime, 5);
    expect(drumPlayer.playNowIfReady).toHaveBeenCalled();
    const firstDrumStart = drumPlayer.playNowIfReady.mock.calls[0]?.[3] as number;
    expect(firstDrumStart).toBeCloseTo(measureStartTime, 5);
  });

  it('SKIPS an overdue measure — schedules neither chord nor drum (no clamp-to-now)', () => {
    const ctx = makeCtx(100);
    const instrument = mockInstrument();
    const drumPlayer = mockDrumPlayer(ctx);

    const result = scheduleChartMeasure({
      ...BASE,
      ctx,
      measureStartTime: 50, // whole measure is seconds in the past
      instrument,
      drumPlayer,
    });

    expect(result).toBe('skipped-late');
    expect(instrument.playNote).not.toHaveBeenCalled();
    expect(drumPlayer.playNowIfReady).not.toHaveBeenCalled();
  });

  it('drops a whole batch of overdue measures — none fire at currentTime en masse (no blast)', () => {
    // Simulates a suspended/backlogged clock: audio time (100) is far behind the
    // wall-clock-derived measure starts that are now all in the past.
    const ctx = makeCtx(100);
    const instrument = mockInstrument();
    const drumPlayer = mockDrumPlayer(ctx);

    const results: string[] = [];
    for (let i = 0; i < 32; i += 1) {
      results.push(
        scheduleChartMeasure({
          ...BASE,
          ctx,
          measureStartTime: 10 + i * 2, // 10, 12, ... 72 — all < currentTime 100
          instrument,
          drumPlayer,
        }),
      );
    }

    expect(results.every((r) => r === 'skipped-late')).toBe(true);
    expect(instrument.playNote).not.toHaveBeenCalled();
    expect(drumPlayer.playNowIfReady).not.toHaveBeenCalled();
  });

  it('resume after a ~90s suspend skips the frozen backlog — no louder-on-resume blast', () => {
    // Field repro: the AudioContext suspended mid-playback (clock froze at 5s) while
    // the wall clock ran ~90s past. On resume the scheduler would re-derive every
    // measure that came due during the freeze — all with starts far behind the frozen
    // currentTime. The old clamp-to-now path fired them together, LOUDER on resume.
    // The single late gate must SKIP the whole backlog: zero notes, bounded voices.
    const ctx = makeCtx(5); // clock froze at 5s and only just resumed
    const instrument = mockInstrument();
    const drumPlayer = mockDrumPlayer(ctx);

    const MEASURE_SEC = 2;
    const FROZEN_SECONDS = 90;
    const backlogCount = FROZEN_SECONDS / MEASURE_SEC; // 45 overdue measures

    let scheduledCount = 0;
    for (let i = 0; i < backlogCount; i += 1) {
      // Their intended audio starts (~5s .. 95s of the wall timeline) all resolve to
      // the past relative to the frozen currentTime of 5s once the clock re-anchors.
      const measureStartTime = 5 - FROZEN_SECONDS + i * MEASURE_SEC; // -85, -83, ... 3
      const result = scheduleChartMeasure({
        ...BASE,
        ctx,
        measureStartTime,
        instrument,
        drumPlayer,
      });
      if (result === 'scheduled') scheduledCount += 1;
    }

    // Every overdue measure dropped: not one note or drum hit fired on resume.
    expect(scheduledCount).toBe(0);
    expect(instrument.playNote).not.toHaveBeenCalled();
    expect(drumPlayer.playNowIfReady).not.toHaveBeenCalled();

    // Playback then resumes cleanly from the re-anchored position (start >= now):
    // a single bounded measure, not a pile of 45.
    const resumeResult = scheduleChartMeasure({
      ...BASE,
      ctx,
      measureStartTime: 5.1,
      instrument,
      drumPlayer,
    });
    expect(resumeResult).toBe('scheduled');
    const chordVoicesForOneMeasure = instrument.playNote.mock.calls.length;
    expect(chordVoicesForOneMeasure).toBeGreaterThan(0);
    // One measure of a plain style is a handful of hits — nowhere near 45 measures'
    // worth. Guards against any accidental backlog leaking through as a blast.
    expect(chordVoicesForOneMeasure).toBeLessThan(backlogCount);
  });

  it('tolerates a sub-threshold late start (a few ms) rather than skipping', () => {
    const ctx = makeCtx(100);
    const instrument = mockInstrument();
    const drumPlayer = mockDrumPlayer(ctx);

    const result = scheduleChartMeasure({
      ...BASE,
      ctx,
      measureStartTime: 100 - CHART_MEASURE_LATE_SKIP_SEC / 2,
      instrument,
      drumPlayer,
    });

    expect(result).toBe('scheduled');
    expect(instrument.playNote).toHaveBeenCalled();
  });

  it('cuts the chord and drops the drum when a stop lands mid-measure', () => {
    const ctx = makeCtx(100);
    const instrument = mockInstrument();
    const drumPlayer = mockDrumPlayer(ctx);

    const result = scheduleChartMeasure({
      ...BASE,
      ctx,
      measureStartTime: 100.5,
      instrument,
      drumPlayer,
      shouldContinue: () => false,
    });

    expect(result).toBe('scheduled');
    expect(instrument.stopAll).toHaveBeenCalledWith(0);
    expect(drumPlayer.playNowIfReady).not.toHaveBeenCalled();
  });
});
