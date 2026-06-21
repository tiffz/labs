import { describe, it, expect } from 'vitest';
import { performanceNotesToMidiEvents } from './performanceNotesToMidiEvents';

describe('performanceNotesToMidiEvents', () => {
  it('maps ms offsets to ticks at 120 bpm', () => {
    const events = performanceNotesToMidiEvents(
      [{ midi: 60, startMs: 0, durationMs: 500, velocity: 0.8 }],
      120,
    );
    expect(events[0]!.startTick).toBe(0);
    expect(events[0]!.durationTicks).toBeGreaterThan(0);
    expect(events[0]!.velocity).toBeGreaterThan(0);
  });
});
