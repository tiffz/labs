import { describe, it, expect } from 'vitest';
import { RollingMidiBuffer } from './rollingMidiBuffer';

describe('RollingMidiBuffer', () => {
  it('prunes events older than max buffer window', () => {
    const buf = new RollingMidiBuffer();
    buf.append('noteon', 60, 0.8, 1000, 'dev');
    buf.append('noteon', 62, 0.8, 1000 + 130_000, 'dev');
    expect(buf.getEventCount()).toBe(1);
  });

  it('sliceLastBars returns events in window', () => {
    const buf = new RollingMidiBuffer();
    const msPerBar = 2000;
    buf.append('noteon', 60, 0.8, 5000, 'dev');
    buf.append('noteon', 62, 0.8, 7000, 'dev');
    buf.append('noteon', 64, 0.8, 9000, 'dev');
    const slice = buf.sliceLastBars(9000, 2, msPerBar);
    expect(slice.length).toBe(3);
    expect(slice.map((e) => e.midi)).toEqual([60, 62, 64]);
  });
});
