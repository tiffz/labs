/**
 * Instrument Interface
 *
 * Abstract interface for all sound generators. This allows the scheduler
 * to be completely decoupled from how sounds are actually produced.
 */

import { registerDiagnosticInstrument } from '../audioDiagnostics';

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
  /**
   * Pending deferred disconnects of faded-out buses. A Set (not a single slot) so two
   * `stopAll`s within one fade window — rapid Play/Stop, fast section switches, tab
   * visibility flips — each disconnect their own old bus. A single slot let the second
   * call clear the first timer and orphan its bus `GainNode`, wired to `destination`
   * forever: one leaked node per rapid re-stop, unbounded over a long session.
   */
  private busTeardowns = new Set<{ timer: number; node: GainNode }>();

  /** Remove this instrument from the live-diagnostics registry on dispose. */
  private unregisterDiagnostics: () => void;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.output = audioContext.createGain();
    this.output.gain.value = 1.0;
    this.unregisterDiagnostics = registerDiagnosticInstrument(this);
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

    // Disconnect the faded bus after the ramp + stop settle. Each stopAll tracks its
    // OWN teardown (see busTeardowns) so a rapid second stop cannot orphan this bus.
    const entry: { timer: number; node: GainNode } = { timer: 0, node: oldOutput };
    entry.timer = window.setTimeout(() => {
      this.busTeardowns.delete(entry);
      try {
        oldOutput.disconnect();
      } catch {
        /* ignore */
      }
    }, fadeMs + 20);
    this.busTeardowns.add(entry);
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
    // Cancel pending deferred disconnects and disconnect their buses now, so no faded
    // bus is left wired to `destination` after dispose (and no timer fires post-dispose).
    for (const entry of this.busTeardowns) {
      window.clearTimeout(entry.timer);
      try {
        entry.node.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.busTeardowns.clear();
    this.unregisterDiagnostics();
    this.disconnect();
  }

  /** Test / diagnostics — buses awaiting deferred disconnect (should stay bounded). */
  get pendingBusTeardownCount(): number {
    return this.busTeardowns.size;
  }
}
