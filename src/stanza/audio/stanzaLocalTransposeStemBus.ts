import { getCompensatedDetune } from '../../shared/audio/getCompensatedDetune';
import { createManagedAudioContext, type ManagedAudioContext } from '../../shared/playback/audioContextLifecycle';
import type { StanzaStemTrack } from '../db/stanzaDb';
import { stanzaSanitizeLinearBusGain, stemPlaybackMuted } from '../utils/stanzaPlaybackMute';

type ActiveTrack = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

/**
 * Pitch-shifted playback for **main + stems** using decoded `AudioBuffer`s while `<audio>` / `<video>`
 * elements stay the transport clock (typically silent: `volume = 0`). Used when stems are attached
 * and `localTransposeSemitones !== 0` (Web Audio `MediaElementSourceNode` has no detune).
 */
export class StanzaLocalTransposeStemBus {
  private managed: ManagedAudioContext | null = null;
  private mainBuffer: AudioBuffer | null = null;
  private stemBuffers = new Map<string, AudioBuffer>();
  private mainTrack: ActiveTrack | null = null;
  private stemTracks = new Map<string, ActiveTrack>();

  setBuffers(main: AudioBuffer | null, stems: Map<string, AudioBuffer>): void {
    this.mainBuffer = main;
    this.stemBuffers = new Map(stems);
    if (!main) this.stop();
  }

  getMainBuffer(): AudioBuffer | null {
    return this.mainBuffer;
  }

  hasActiveSources(): boolean {
    return this.mainTrack != null;
  }

  stop(): void {
    const release = (track: ActiveTrack) => {
      try {
        track.source.stop();
      } catch {
        /* already stopped */
      }
      try {
        track.source.disconnect();
      } catch {
        /* ignore */
      }
      try {
        track.gain.disconnect();
      } catch {
        /* ignore */
      }
    };
    if (this.mainTrack) release(this.mainTrack);
    for (const track of this.stemTracks.values()) release(track);
    this.mainTrack = null;
    this.stemTracks.clear();
  }

  dispose(): void {
    this.stop();
    this.managed?.dispose();
    this.managed = null;
    this.mainBuffer = null;
    this.stemBuffers.clear();
  }

  /**
   * Adjust per-bus gain while buffer sources keep playing (Mix slider drag).
   */
  updateMix(primaryMuted: boolean, primaryGain: number | undefined, stemRows: StanzaStemTrack[]): void {
    if (this.mainTrack) {
      this.mainTrack.gain.gain.value = primaryMuted
        ? 0
        : stanzaSanitizeLinearBusGain(primaryGain, 1);
    }
    for (const row of stemRows) {
      const track = this.stemTracks.get(row.id);
      if (!track) continue;
      track.gain.gain.value = stemPlaybackMuted(row)
        ? 0
        : stanzaSanitizeLinearBusGain(row.gain ?? 1, 1);
    }
  }

  /**
   * Restart summed buffer playback at `offsetSec` with the same `playbackRate` as the main element.
   */
  startOrRestart(
    offsetSec: number,
    playbackRate: number,
    transposeSemitones: number,
    primaryMuted: boolean,
    primaryGain: number | undefined,
    stemRows: StanzaStemTrack[],
  ): void {
    this.stop();
    const main = this.mainBuffer;
    if (!main) return;

    const linearMain = primaryMuted ? 0 : stanzaSanitizeLinearBusGain(primaryGain, 1);
    let anyAudible = linearMain > 0;
    for (const row of stemRows) {
      const b = this.stemBuffers.get(row.id);
      if (!b) continue;
      const lg = stemPlaybackMuted(row) ? 0 : stanzaSanitizeLinearBusGain(row.gain ?? 1, 1);
      if (lg > 0) anyAudible = true;
    }
    if (!anyAudible) return;

    if (!this.managed) {
      this.managed = createManagedAudioContext({ latencyHint: 'interactive' });
    }
    const ctx = this.managed.context;
    const detune = getCompensatedDetune(transposeSemitones, playbackRate);

    const pushSource = (buf: AudioBuffer, linear: number): ActiveTrack | null => {
      if (linear <= 0) return null;
      const g = ctx.createGain();
      g.gain.value = linear;
      g.connect(ctx.destination);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = playbackRate;
      src.detune.value = detune;
      src.connect(g);
      const dur = buf.duration;
      const off = Math.max(0, Math.min(offsetSec, Math.max(0, dur - 0.001)));
      src.start(0, off);
      return { source: src, gain: g };
    };

    this.mainTrack = pushSource(main, linearMain);
    for (const row of stemRows) {
      const buf = this.stemBuffers.get(row.id);
      if (!buf) continue;
      const lg = stemPlaybackMuted(row) ? 0 : stanzaSanitizeLinearBusGain(row.gain ?? 1, 1);
      const track = pushSource(buf, lg);
      if (track) this.stemTracks.set(row.id, track);
    }
    void ctx.resume();
  }
}
