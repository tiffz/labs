import {
  createManagedAudioContext,
  type ManagedAudioContext,
} from '../../shared/playback/audioContextLifecycle';
import type { DetuneMatrix } from '../data/maqamPresets';

/** A4 = 440 Hz, MIDI note 69 — the anchor every other frequency is derived from. */
const A4_HZ = 440;
const A4_MIDI = 69;

/** Voiced like a plucked oud: quick attack, long decay, no sustain. */
const ATTACK_SECONDS = 0.02;
const RELEASE_SECONDS = 0.35;
const MAX_TAIL_SECONDS = 1.2;
const PEAK_GAIN = 0.22;
/** exponentialRampToValueAtTime cannot reach 0; this is the practical floor. */
const SILENCE = 0.0001;

/**
 * Chrome caps simultaneous voices before it starts glitching, and a stuck MIDI
 * note-off (unplugged controller, dropped message) would otherwise leak voices
 * forever. Oldest voice wins the eviction.
 */
const MAX_VOICES = 16;

/**
 * Equal-tempered frequency for a MIDI note, bent by `cents`.
 *
 * Cents are folded into the exponent rather than applied via `OscillatorNode.detune`
 * so the returned number is testable without an AudioContext, and so the same
 * maths backs both the tone and the frequency readout the UI shows. Applying the
 * bend twice — once here and once on `detune` — would double it, which is why
 * `startVoice` sets frequency only.
 */
export function midiNoteToFrequency(midiNote: number, cents = 0): number {
  return A4_HZ * Math.pow(2, (midiNote - A4_MIDI + cents / 100) / 12);
}

/** Cents this matrix bends the given MIDI note by. Out-of-range notes bend by 0. */
export function detuneForMidiNote(midiNote: number, matrix: DetuneMatrix): number {
  if (!Number.isFinite(midiNote)) return 0;
  const pitchClass = ((Math.round(midiNote) % 12) + 12) % 12;
  return matrix[pitchClass] ?? 0;
}

interface Voice {
  midiNote: number;
  oscillator: OscillatorNode;
  gain: GainNode;
  startedAt: number;
}

/**
 * The playground's voice pool.
 *
 * Owns one AudioContext for the app's lifetime — `dispose()` closes it, which
 * `audioContextsAreClosed.test.ts` requires and which matters because Chrome
 * caps contexts per document at six and *throws* from the constructor past the
 * cap, crashing the app rather than degrading it.
 */
export class MaqamSynth {
  private managed: ManagedAudioContext | null = null;
  private master: GainNode | null = null;
  private readonly voices = new Map<number, Voice>();
  private disposed = false;

  /**
   * Create the context on the first note, not at construction: a context built
   * before a user gesture starts suspended and, on iOS Safari, stays that way.
   */
  private ensureContext(): { context: AudioContext; master: GainNode } | null {
    if (this.disposed) return null;
    if (!this.managed || !this.master) {
      try {
        this.managed = createManagedAudioContext();
      } catch {
        // Past Chrome's per-document context cap, or Web Audio unavailable.
        // Silence is the honest outcome; the app stays usable without sound.
        this.managed = null;
        return null;
      }
      this.master = this.managed.context.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.managed.context.destination);
    }
    return { context: this.managed.context, master: this.master };
  }

  /** Resume the context. Call from a user gesture before the first note. */
  async resume(): Promise<boolean> {
    const ctx = this.ensureContext();
    if (!ctx || !this.managed) return false;
    return this.managed.ensureRunning();
  }

  /** `'uninitialized'` until the first note creates the context. */
  getState(): AudioContextState | 'uninitialized' {
    return this.managed?.context.state ?? 'uninitialized';
  }

  /**
   * Sound a note, bent by `cents`. Retriggering a note that is already sounding
   * releases the old voice first, so a MIDI controller's key repeat cannot
   * strand one.
   */
  noteOn(midiNote: number, cents = 0, velocity = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const { context, master } = ctx;
    if (context.state === 'closed') return;

    this.noteOff(midiNote);
    this.evictOldestIfFull();

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    // Triangle reads warm and reedy without the harmonic bite of a saw — close
    // enough to a ney to keep quarter-tones audible rather than buzzy.
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(midiNoteToFrequency(midiNote, cents), now);

    const peak = PEAK_GAIN * Math.max(0, Math.min(1, velocity));
    gain.gain.setValueAtTime(SILENCE, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, SILENCE), now + ATTACK_SECONDS);
    // A held note decays rather than sustaining, so a forgotten finger fades out.
    gain.gain.exponentialRampToValueAtTime(SILENCE, now + MAX_TAIL_SECONDS);

    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + MAX_TAIL_SECONDS);

    const voice: Voice = { midiNote, oscillator, gain, startedAt: now };
    oscillator.onended = () => {
      // Only clear the slot if this exact voice still owns it; a retrigger may
      // have replaced it already.
      if (this.voices.get(midiNote) === voice) this.voices.delete(midiNote);
    };
    this.voices.set(midiNote, voice);
  }

  /** Release a note. Silent no-op when the note is not sounding. */
  noteOff(midiNote: number): void {
    const voice = this.voices.get(midiNote);
    if (!voice || !this.managed) return;
    this.voices.delete(midiNote);
    this.releaseVoice(voice, this.managed.context);
  }

  /** Release everything — panic button, preset change, unmount. */
  allNotesOff(): void {
    if (!this.managed) return;
    const context = this.managed.context;
    for (const voice of [...this.voices.values()]) this.releaseVoice(voice, context);
    this.voices.clear();
  }

  private releaseVoice(voice: Voice, context: AudioContext): void {
    if (context.state === 'closed') return;
    const now = context.currentTime;
    try {
      voice.gain.gain.cancelScheduledValues(now);
      // Re-anchor at the current value before ramping, or the ramp starts from
      // whatever the last *scheduled* value was and the note jumps in volume.
      voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, SILENCE), now);
      voice.gain.gain.exponentialRampToValueAtTime(SILENCE, now + RELEASE_SECONDS);
      voice.oscillator.stop(now + RELEASE_SECONDS);
    } catch {
      // Already stopped: the scheduled MAX_TAIL_SECONDS stop beat us to it.
    }
  }

  private evictOldestIfFull(): void {
    if (this.voices.size < MAX_VOICES || !this.managed) return;
    let oldest: Voice | null = null;
    for (const voice of this.voices.values()) {
      if (!oldest || voice.startedAt < oldest.startedAt) oldest = voice;
    }
    if (oldest) {
      this.voices.delete(oldest.midiNote);
      this.releaseVoice(oldest, this.managed.context);
    }
  }

  /** Which notes are sounding, for the keyboard highlight. */
  activeNotes(): number[] {
    return [...this.voices.keys()];
  }

  /** Close the context and drop every voice. Call from unmount. */
  dispose(): void {
    this.disposed = true;
    this.allNotesOff();
    this.voices.clear();
    this.managed?.dispose();
    this.managed = null;
    this.master = null;
  }
}
