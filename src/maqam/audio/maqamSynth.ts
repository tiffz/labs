import {
  createManagedAudioContext,
  type ManagedAudioContext,
} from '../../shared/playback/audioContextLifecycle';
import type { DetuneMatrix } from '../data/maqamPresets';
import { renderPluckedString, renderRoomImpulse } from './pluckedString';

/** A4 = 440 Hz, MIDI note 69 — the anchor every other frequency is derived from. */
const A4_HZ = 440;
const A4_MIDI = 69;

/**
 * Oud-ish voicing. Gut and nylon strings lose energy faster than steel, and the
 * body is woody rather than bright, so sustain sits below a guitar's and the
 * tone control is well into the dark half.
 */
const PLUCK_SECONDS = 2.6;
const PLUCK_SUSTAIN = 0.9965;
const PLUCK_TONE = 0.62;

/**
 * An oud's strings are doubled — each "string" is a course of two, tuned a few
 * cents apart. Playing the same buffer twice with a slight pitch and timing
 * offset is the single biggest richness win available here, and it is what the
 * instrument actually does rather than a chorus effect bolted on.
 */
const COURSE_DETUNE_RATIO = 1.0022;
const COURSE_DELAY_SECONDS = 0.009;
const COURSE_GAIN = 0.62;

const RELEASE_SECONDS = 0.28;
const PEAK_GAIN = 0.5;
/** exponentialRampToValueAtTime cannot reach 0; this is the practical floor. */
const SILENCE = 0.0001;

/** How much of the signal goes to the room. Enough to sit in a space, not a cathedral. */
const REVERB_SEND = 0.26;

/**
 * Chrome caps simultaneous voices before it starts glitching, and a stuck MIDI
 * note-off (unplugged controller, dropped message) would otherwise leak voices
 * forever. Oldest voice wins the eviction.
 */
const MAX_VOICES = 16;

/**
 * Equal-tempered frequency for a MIDI note, bent by `cents`.
 *
 * Cents are folded into the exponent so the returned number is testable without
 * an AudioContext, and so the same maths backs both the tone and any frequency
 * readout. The plucked-string renderer takes this frequency directly, which is
 * why a quarter-tone is synthesised *at* 350 cents rather than resampled
 * towards it.
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

/** Cache key for a rendered pluck. Cents are rounded; nothing asks for fractions. */
function voiceKey(midiNote: number, cents: number): string {
  return `${midiNote}:${Math.round(cents)}`;
}

interface Voice {
  midiNote: number;
  sources: AudioBufferSourceNode[];
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
  private reverbSend: GainNode | null = null;
  private readonly voices = new Map<number, Voice>();
  /** Rendered plucks, keyed by note and bend. A pluck costs ~5ms to render. */
  private readonly buffers = new Map<string, AudioBuffer>();
  /** Sources queued by `scheduleNote`, so a stop can cancel a whole phrase. */
  private scheduled: AudioBufferSourceNode[] = [];
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
      const context = this.managed.context;
      this.master = context.createGain();
      this.master.gain.value = 1;
      this.master.connect(context.destination);

      // A generated room. Without it the instrument sounds like it is in a
      // vacuum, which is most of what makes a web synth feel cheap.
      try {
        const [left, right] = renderRoomImpulse(context.sampleRate);
        const impulse = context.createBuffer(2, left.length, context.sampleRate);
        impulse.copyToChannel(left, 0);
        impulse.copyToChannel(right, 1);
        const convolver = context.createConvolver();
        convolver.buffer = impulse;
        this.reverbSend = context.createGain();
        this.reverbSend.gain.value = REVERB_SEND;
        this.reverbSend.connect(convolver);
        convolver.connect(this.master);
      } catch {
        // No reverb is a fine degradation; a dead app is not.
        this.reverbSend = null;
      }
    }
    return { context: this.managed.context, master: this.master };
  }

  /** Render (or reuse) the plucked string for one pitch. */
  private bufferFor(context: AudioContext, midiNote: number, cents: number): AudioBuffer | null {
    const key = voiceKey(midiNote, cents);
    const cached = this.buffers.get(key);
    if (cached) return cached;

    const frequency = midiNoteToFrequency(midiNote, cents);
    const samples = renderPluckedString({
      sampleRate: context.sampleRate,
      frequency,
      seconds: PLUCK_SECONDS,
      sustain: PLUCK_SUSTAIN,
      tone: PLUCK_TONE,
      // Seeded from the pitch so a given note always sounds identical, and two
      // different notes do not share the same excitation noise.
      seed: Math.round(frequency * 100) || 1,
    });

    try {
      const buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.copyToChannel(samples, 0);
      this.buffers.set(key, buffer);
      return buffer;
    } catch {
      return null;
    }
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

    const buffer = this.bufferFor(context, midiNote, cents);
    if (!buffer) return;

    this.noteOff(midiNote);
    this.evictOldestIfFull();

    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.value = PEAK_GAIN * Math.max(0, Math.min(1, velocity));
    gain.connect(master);
    if (this.reverbSend) gain.connect(this.reverbSend);

    // The doubled course: two strings, a few cents and a few milliseconds
    // apart. `playbackRate` shifts pitch and duration together, which is what a
    // real second string does anyway.
    const sources: AudioBufferSourceNode[] = [];
    for (const [rate, when, level] of [
      [1, 0, 1],
      [COURSE_DETUNE_RATIO, COURSE_DELAY_SECONDS, COURSE_GAIN],
    ] as const) {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      if (level === 1) {
        source.connect(gain);
      } else {
        const trim = context.createGain();
        trim.gain.value = level;
        source.connect(trim);
        trim.connect(gain);
      }
      source.start(now + when);
      sources.push(source);
    }

    const voice: Voice = { midiNote, sources, gain, startedAt: now };
    sources[0].onended = () => {
      if (this.voices.get(midiNote) === voice) this.voices.delete(midiNote);
    };
    this.voices.set(midiNote, voice);
  }

  /**
   * Release a note.
   *
   * A plucked string does not stop when you lift your finger — it rings on. So
   * this fades over `RELEASE_SECONDS` rather than cutting, which is both truer
   * to the instrument and the difference between music and a stab.
   */
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
      for (const source of voice.sources) source.stop(now + RELEASE_SECONDS);
    } catch {
      // Already stopped: the buffer ran out before the key came up.
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

  /** Audio-clock time, for lining a melody up against the visual highlight. */
  currentTime(): number | null {
    return this.managed?.context.currentTime ?? null;
  }

  /**
   * Schedule one note of a melody at an absolute audio-clock time.
   *
   * Separate from `noteOn` and its voice map on purpose. A melody is a known,
   * finite sequence, so the whole phrase is scheduled up front on the audio
   * clock — sample-accurate, immune to a blocked main thread, and not the
   * `setTimeout` note clock that `audioPatternRegistry` forbids. The interactive
   * voice map is for keys being held, which is a different lifecycle.
   *
   * A plucked string rings on after the finger lifts, so `holdSeconds` fades
   * rather than cuts.
   */
  scheduleNote(midiNote: number, cents: number, when: number, holdSeconds: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const { context, master } = ctx;
    if (context.state === 'closed') return;

    const buffer = this.bufferFor(context, midiNote, cents);
    if (!buffer) return;

    const gain = context.createGain();
    gain.gain.setValueAtTime(PEAK_GAIN, when);
    gain.gain.setValueAtTime(PEAK_GAIN, when + holdSeconds);
    gain.gain.exponentialRampToValueAtTime(SILENCE, when + holdSeconds + RELEASE_SECONDS);
    gain.connect(master);
    if (this.reverbSend) gain.connect(this.reverbSend);

    for (const [rate, delay, level] of [
      [1, 0, 1],
      [COURSE_DETUNE_RATIO, COURSE_DELAY_SECONDS, COURSE_GAIN],
    ] as const) {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      if (level === 1) {
        source.connect(gain);
      } else {
        const trim = context.createGain();
        trim.gain.value = level;
        source.connect(trim);
        trim.connect(gain);
      }
      source.start(when + delay);
      source.stop(when + holdSeconds + RELEASE_SECONDS);
      this.scheduled.push(source);
    }
  }

  /** Cancel everything a melody has queued. Stop button, or a new selection. */
  cancelScheduled(): void {
    for (const source of this.scheduled) {
      try {
        source.stop();
      } catch {
        // Already finished; nothing to stop.
      }
    }
    this.scheduled = [];
  }

  /** Which notes are sounding, for the keyboard highlight. */
  activeNotes(): number[] {
    return [...this.voices.keys()];
  }

  /** Close the context and drop every voice. Call from unmount. */
  dispose(): void {
    this.disposed = true;
    this.cancelScheduled();
    this.allNotesOff();
    this.voices.clear();
    this.buffers.clear();
    this.managed?.dispose();
    this.managed = null;
    this.master = null;
    this.reverbSend = null;
  }
}
