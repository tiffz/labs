/**
 * Instrument Interface
 *
 * Abstract interface for all sound generators. This allows the scheduler
 * to be completely decoupled from how sounds are actually produced.
 */

export interface PlayNoteParams {
  frequency: number; // Hz
  startTime: number; // Absolute AudioContext.currentTime
  duration: number; // Seconds
  velocity?: number; // 0-1, default 0.8
}

export interface Instrument {
  /**
   * Play a note at an exact time
   * All timing is absolute AudioContext time, ensuring sample-accurate scheduling
   */
  playNote(params: PlayNoteParams): void;

  /**
   * Gracefully stop all playing/scheduled notes
   * @param fadeTimeMs - Fade out duration in milliseconds (default 50ms)
   */
  stopAll(fadeTimeMs?: number): void;

  /**
   * Connect instrument output to a destination node
   */
  connect(destination: AudioNode): void;

  /**
   * Disconnect instrument from current destination
   */
  disconnect(): void;

  /**
   * Get the instrument's output node for routing
   */
  getOutput(): GainNode;

  /**
   * Optional cleanup for instruments that need it
   */
  dispose?(): void;
}

type TrackedVoice = {
  stop: () => void;
};

/**
 * Base class providing common functionality for instruments.
 *
 * Voices must be registered via {@link trackVoice} so {@link stopAll} can hard-stop
 * them. Muting the bus alone leaks AudioNodes across long section loops and can
 * crash the tab (Aw Snap) after enough wraps.
 */
export abstract class BaseInstrument implements Instrument {
  protected audioContext: AudioContext;
  protected output: GainNode;
  protected connectedDestination: AudioNode | null = null;
  protected disposed: boolean = false;
  private activeVoices = new Set<TrackedVoice>();

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.output = audioContext.createGain();
    this.output.gain.value = 1.0;
  }

  abstract playNote(params: PlayNoteParams): void;

  /**
   * Register a voice so {@link stopAll} can stop it. Call `release` from the
   * voice's `onended` (or equivalent) so completed notes leave the set.
   */
  protected trackVoice(stop: () => void): () => void {
    const voice: TrackedVoice = { stop };
    this.activeVoices.add(voice);
    return () => {
      this.activeVoices.delete(voice);
    };
  }

  /** Test / diagnostics — live tracked voices (scheduled or ringing). */
  get activeVoiceCount(): number {
    return this.activeVoices.size;
  }

  stopAll(fadeTimeMs: number = 50): void {
    if (this.disposed) return;

    const now = this.audioContext.currentTime;
    const fadeTime = Math.max(0, fadeTimeMs) / 1000;

    // Hard-stop every tracked oscillator / buffer source. Leaving them on a muted
    // bus across loop wraps was the long-session OOM path.
    for (const voice of this.activeVoices) {
      try {
        voice.stop();
      } catch {
        /* already stopped */
      }
    }
    this.activeVoices.clear();

    const oldOutput = this.output;
    oldOutput.gain.cancelScheduledValues(now);
    oldOutput.gain.setValueAtTime(oldOutput.gain.value, now);
    if (fadeTime > 0) {
      oldOutput.gain.linearRampToValueAtTime(0, now + fadeTime);
    } else {
      oldOutput.gain.setValueAtTime(0, now);
    }

    this.output = this.audioContext.createGain();
    this.output.gain.value = 1;
    if (this.connectedDestination) {
      this.output.connect(this.connectedDestination);
    }

    if (fadeTime <= 0) {
      try {
        oldOutput.disconnect();
      } catch {
        /* ignore */
      }
      return;
    }

    window.setTimeout(() => {
      try {
        oldOutput.disconnect();
      } catch {
        /* ignore */
      }
    }, fadeTimeMs + 20);
  }

  connect(destination: AudioNode): void {
    this.connectedDestination = destination;
    this.output.connect(destination);
  }

  disconnect(): void {
    this.output.disconnect();
    this.connectedDestination = null;
  }

  getOutput(): GainNode {
    return this.output;
  }

  dispose(): void {
    this.disposed = true;
    this.stopAll(10);
    this.disconnect();
  }
}
