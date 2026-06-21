import { PianoSynthesizer } from '../../shared/playback/instruments/pianoSynth';
import { midiToFrequency } from '../../shared/music/scoreTypes';

/** Low-latency MIDI monitor for scratchpad input. */
export class MidiMonitor {
  private ctx: AudioContext | null = null;
  private synth: PianoSynthesizer | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
      this.synth = new PianoSynthesizer(this.ctx);
      this.synth.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  playMidiNote(midi: number, velocity: number): void {
    const ctx = this.ensureContext();
    this.synth?.playNote({
      frequency: midiToFrequency(midi),
      startTime: ctx.currentTime,
      duration: 0.5,
      velocity: Math.max(0.05, Math.min(1, velocity)),
    });
  }

  stopMidiNote(): void {
    /* Piano synth uses timed release; no per-note stop needed for monitor. */
  }

  stopAll(): void {
    this.synth?.stopAll();
  }
}
