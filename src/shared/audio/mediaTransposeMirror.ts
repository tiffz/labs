import { getCompensatedDetune } from './getCompensatedDetune';
import { createManagedAudioContext, type ManagedAudioContext } from '../playback/audioContextLifecycle';

/**
 * Plays a decoded local track through `AudioBufferSourceNode` (detune) while the `<audio>` / `<video>`
 * element stays the transport clock (often silent: `volume = 0`).
 */
export class MediaTransposeMirror {
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

  hasActiveSource(): boolean {
    return this.source != null;
  }

  setLinearGain(linearGain: number): void {
    if (this.gain) {
      this.gain.gain.value = Math.max(0, linearGain);
    }
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
