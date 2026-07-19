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

  /**
   * Schedule a note at an absolute performance.now() timestamp on the audio
   * clock (look-ahead pattern). Falls back to "now" if the target is past.
   */
  scheduleMidiNoteAt(midi: number, velocity: number, targetPerfMs: number, durationSec: number): void {
    const ctx = this.ensureContext();
    const audioTime = ctx.currentTime + (targetPerfMs - performance.now()) / 1000;
    this.synth?.playNote({
      frequency: midiToFrequency(midi),
      startTime: Math.max(audioTime, ctx.currentTime),
      duration: Math.max(0.05, durationSec),
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
