import { getCompensatedDetune } from '../../shared/audio/getCompensatedDetune';
import { createManagedAudioContext, type ManagedAudioContext } from '../../shared/playback/audioContextLifecycle';

/**
 * Plays a decoded local track through `AudioBufferSourceNode` (detune) while the `<audio>` / `<video>`
 * element stays the transport clock (often silent: `volume = 0`). Used for uploads **without** stem
 * layers; when stems are present, {@link StanzaLocalTransposeStemBus} handles the same idea for all buses.
 */
export class StanzaLocalTransposeMirror {
  private managed: ManagedAudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;

  setBuffer(buffer: AudioBuffer | null): void {
    this.buffer = buffer;
    if (!buffer) this.stop();
  }

  getBuffer(): AudioBuffer | null {
    return this.buffer;
  }

  isReady(): boolean {
    return this.buffer != null && this.buffer.duration > 0;
  }

  stop(): void {
    try {
      this.source?.stop();
    } catch {
      /* already stopped */
    }
    try {
      this.source?.disconnect();
    } catch {
      /* ignore */
    }
    this.source = null;
  }

  dispose(): void {
    this.stop();
    try {
      this.gain?.disconnect();
    } catch {
      /* ignore */
    }
    this.gain = null;
    this.managed?.dispose();
    this.managed = null;
    this.buffer = null;
  }

  /**
   * Start or restart mirrored output at `offsetSec` (media seconds), with the same playbackRate as the element.
   */
  startOrRestart(offsetSec: number, playbackRate: number, transposeSemitones: number, linearGain: number): void {
    if (!this.buffer) return;
    this.stop();
    if (linearGain <= 0) return;

    if (!this.managed) {
      this.managed = createManagedAudioContext({ latencyHint: 'interactive' });
      const ctx = this.managed.context;
      this.gain = ctx.createGain();
      this.gain.connect(ctx.destination);
    }

    const ctx = this.managed!.context;
    const gain = this.gain!;
    const buf = this.buffer;
    const startOffset = Math.max(0, Math.min(offsetSec, Math.max(0, buf.duration - 0.001)));

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = playbackRate;
    src.detune.value = getCompensatedDetune(transposeSemitones, playbackRate);
    src.connect(gain);
    gain.gain.value = linearGain;
    src.start(0, startOffset);
    this.source = src;
    void ctx.resume();
  }
}
