import { describe, expect, it } from 'vitest';
import { Transport } from './transport';

function makeContext() {
  return { currentTime: 0 } as AudioContext;
}

describe('Transport', () => {
  it('keeps loop position stable across long runtimes', () => {
    const ctx = makeContext();
    const transport = new Transport(ctx);
    transport.start(120, 16, { numerator: 4, denominator: 4 });

    // 10 minutes at 120 BPM = 1200 beats -> position should wrap cleanly.
    ctx.currentTime = 600;
    const position = transport.getPositionInBeats();
    expect(position).toBeCloseTo(0, 6);
    expect(transport.getLoopCount()).toBe(75);
  });

  it('preserves beat position when tempo changes at runtime', () => {
    const ctx = makeContext();
    const transport = new Transport(ctx);
    transport.start(120, 16, { numerator: 4, denominator: 4 });

    ctx.currentTime = 2.75; // 5.5 beats at 120 BPM.
    const before = transport.getPositionInBeats();
    transport.setTempo(90);
    const after = transport.getPositionInBeats();

    expect(after).toBeCloseTo(before, 4);
  });
});

