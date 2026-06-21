import type { RawMidiEvent } from '../types';

const MAX_BUFFER_MS = 120_000;

export class RollingMidiBuffer {
  private events: RawMidiEvent[] = [];
  private nextId = 0;

  append(
    type: RawMidiEvent['type'],
    midi: number,
    velocity: number,
    perfMs: number,
    deviceId: string,
  ): void {
    this.events.push({
      id: `e${this.nextId++}`,
      type,
      midi,
      velocity,
      perfMs,
      deviceId,
    });
    const cutoff = perfMs - MAX_BUFFER_MS;
    while (this.events.length > 0 && this.events[0]!.perfMs < cutoff) {
      this.events.shift();
    }
  }

  sliceLastBars(perfMs: number, barCount: number, msPerBar: number): RawMidiEvent[] {
    const start = perfMs - barCount * msPerBar;
    return this.events.filter((e) => e.perfMs >= start && e.perfMs <= perfMs);
  }

  getEventCount(): number {
    return this.events.length;
  }

  clear(): void {
    this.events = [];
  }
}
