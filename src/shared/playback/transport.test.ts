import { describe, expect, it } from 'vitest';
import { Transport } from './transport';

function makeContext() {
  let now = 0;
  return {
    get currentTime() {
      return now;
    },
    setTime(value: number) {
      now = value;
    },
  } as AudioContext & { setTime: (value: number) => void };
}

describe('Transport', () => {
  it('keeps loop position stable across long runtimes', () => {
    const ctx = makeContext();
    const transport = new Transport(ctx);
    transport.start(120, 16, { numerator: 4, denominator: 4 });

    // 10 minutes at 120 BPM = 1200 beats -> position should wrap cleanly.
    ctx.setTime(600);
    const position = transport.getPositionInBeats();
    expect(position).toBeCloseTo(0, 6);
    expect(transport.getLoopCount()).toBe(75);
  });

  it('preserves beat position when tempo changes at runtime', () => {
    const ctx = makeContext();
    const transport = new Transport(ctx);
    transport.start(120, 16, { numerator: 4, denominator: 4 });

    ctx.setTime(2.75); // 5.5 beats at 120 BPM.
    const before = transport.getPositionInBeats();
    transport.setTempo(90);
    const after = transport.getPositionInBeats();

    expect(after).toBeCloseTo(before, 4);
  });
});

