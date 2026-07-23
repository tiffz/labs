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
  /** Stop this voice's source. `when` (AudioContext time) lets stopAll defer the
   *  hard stop until the bus fade has reached silence, so sources are never cut
   *  mid-waveform (that abrupt cut is the audible click on pause/restart). */
  stop: (when?: number) => void;
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
  /** Pending deferred disconnect of a faded-out bus; cleared on re-stop/dispose. */
  private busTeardownTimer: number | null = null;

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
  protected trackVoice(stop: (when?: number) => void): () => void {
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
    // Always fade at least a few ms before cutting sources. Stopping an
    // oscillator/sample mid-waveform at an arbitrary point clicks; ramping the
    // bus to silence first and stopping AT the ramp end removes the pop. 12ms is
    // inaudible as latency. (Callers that pass 0 still get the anti-click fade.)
    const fadeMs = Math.max(12, Math.max(0, fadeTimeMs));
    const fadeTime = fadeMs / 1000;
    const stopAt = now + fadeTime;

    const oldOutput = this.output;
    oldOutput.gain.cancelScheduledValues(now);
    oldOutput.gain.setValueAtTime(oldOutput.gain.value, now);
    oldOutput.gain.linearRampToValueAtTime(0, stopAt);

    // Hard-stop every tracked source AT the ramp end (bus is already silent, so
    // no click), then drop them so they cannot leak across loop wraps.
    for (const voice of this.activeVoices) {
      try {
        voice.stop(stopAt);
      } catch {
        /* already stopped */
      }
    }
    this.activeVoices.clear();

    // Route subsequent notes to a fresh bus at full gain.
    this.output = this.audioContext.createGain();
    this.output.gain.value = 1;
    if (this.connectedDestination) {
      this.output.connect(this.connectedDestination);
    }

    // Disconnect the faded bus after the ramp + stop settle.
    if (this.busTeardownTimer !== null) {
      window.clearTimeout(this.busTeardownTimer);
    }
    this.busTeardownTimer = window.setTimeout(() => {
      this.busTeardownTimer = null;
      try {
        oldOutput.disconnect();
      } catch {
        /* ignore */
      }
    }, fadeMs + 20);
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
    // Cancel any pending deferred bus disconnect so it cannot fire post-dispose.
    if (this.busTeardownTimer !== null) {
      window.clearTimeout(this.busTeardownTimer);
      this.busTeardownTimer = null;
    }
    this.disconnect();
  }
}
