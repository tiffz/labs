import {
  createManagedAudioContext,
  ensureAudioContextRunning,
  type ManagedAudioContext,
} from '../../shared/playback/audioContextLifecycle';
import { stanzaSanitizeLinearBusGain } from '../utils/stanzaPlaybackMute';

type StemNodes = {
  source: MediaElementAudioSourceNode;
  gain: GainNode;
};

/**
 * Routes the primary local `<video>` / `<audio>` and each stem `<audio>` through one `AudioContext`,
 * with per-bus `GainNode` mix (ADR 0004).
 *
 * Keep media elements at **`volume = 1`**: Chromium feeds `MediaElementAudioSourceNode` from the
 * element’s gain stage, so `volume === 0` silences the graph (muted stems + “audible” main still
 * produced nothing). Loudness and stem muting are handled only by `GainNode`s; the element’s
 * default output is replaced by routing into this graph.
 */
export class StanzaLocalStemMixer {
  private managed: ManagedAudioContext | null = null;
  private mainSource: MediaElementAudioSourceNode | null = null;
  private mainGain: GainNode | null = null;
  private stemNodes = new Map<string, StemNodes>();
  /** Elements last wired for Web Audio teardown volume restore. */
  private wiredMain: HTMLMediaElement | null = null;
  private wiredStems: HTMLAudioElement[] = [];

  static busGain(muted: boolean, linear: number): number {
    if (muted) return 0;
    return stanzaSanitizeLinearBusGain(linear, 1);
  }

  isActive(): boolean {
    return this.managed != null;
  }

  /**
   * Tear down the Web Audio graph. When `restoreElementVolumes` is true, reset last-wired media
   * elements so they are not stuck silent (`volume === 0`) with no graph (e.g. hook dispose).
   */
  private releaseGraph(opts: { restoreElementVolumes: boolean }): void {
    const mainEl = this.wiredMain;
    const stemEls = this.wiredStems;
    this.wiredMain = null;
    this.wiredStems = [];

    for (const { source, gain } of this.stemNodes.values()) {
      try {
        source.disconnect();
      } catch {
        /* ignore */
      }
      try {
        gain.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.stemNodes.clear();
    try {
      this.mainSource?.disconnect();
    } catch {
      /* ignore */
    }
    this.mainSource = null;
    try {
      this.mainGain?.disconnect();
    } catch {
      /* ignore */
    }
    this.mainGain = null;
    this.managed?.dispose();
    this.managed = null;

    if (opts.restoreElementVolumes) {
      if (mainEl) {
        mainEl.volume = 1;
        mainEl.muted = false;
      }
      for (const el of stemEls) {
        el.volume = 1;
        el.muted = false;
      }
    }
  }

  dispose(): void {
    this.releaseGraph({ restoreElementVolumes: true });
  }

  /**
   * (Re)build the graph for the current main element and stem map. Call after stem URLs / layout
   * so every `<audio>` has a `src`. Disposes any previous graph first.
   *
   * Does **not** resume the `AudioContext` (browsers require that inside a user gesture). Call
   * `ensureRunning()` from the same synchronous chain as `HTMLMediaElement.play()` after rebuild.
   */
  rebuild(main: HTMLMediaElement, stems: Map<string, HTMLAudioElement>): void {
    this.releaseGraph({ restoreElementVolumes: false });
    try {
      this.managed = createManagedAudioContext({ latencyHint: 'interactive' });
      const ctx = this.managed.context;

      main.volume = 1;
      main.muted = false;
      this.wiredMain = main;
      this.wiredStems = [];
      const mainGain = ctx.createGain();
      const mainSource = ctx.createMediaElementSource(main);
      mainSource.connect(mainGain);
      mainGain.connect(ctx.destination);
      this.mainGain = mainGain;
      this.mainSource = mainSource;

      for (const [id, el] of stems) {
        el.volume = 1;
        el.muted = false;
        this.wiredStems.push(el);
        const gain = ctx.createGain();
        const source = ctx.createMediaElementSource(el);
        source.connect(gain);
        gain.connect(ctx.destination);
        this.stemNodes.set(id, { source, gain });
      }
    } catch {
      this.releaseGraph({ restoreElementVolumes: true });
      throw new Error('StanzaLocalStemMixer.rebuild failed');
    }
  }

  /**
   * Nudge `AudioContext.resume()` without awaiting — use in the **same synchronous turn** as
   * `HTMLMediaElement.play()` so user activation is still valid; then call `ensureRunning()` for a
   * full wait if needed.
   */
  kickResumeSync(): void {
    const ctx = this.managed?.context;
    if (!ctx || ctx.state === 'closed') return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
  }

  async ensureRunning(): Promise<boolean> {
    if (!this.managed) return false;
    return ensureAudioContextRunning(this.managed.context);
  }

  setPrimaryMix(muted: boolean, linearGain: number): void {
    if (!this.mainGain) return;
    this.mainGain.gain.value = StanzaLocalStemMixer.busGain(muted, linearGain);
  }

  setStemMix(id: string, muted: boolean, linearGain: number): void {
    const nodes = this.stemNodes.get(id);
    if (!nodes) return;
    nodes.gain.gain.value = StanzaLocalStemMixer.busGain(muted, linearGain ?? 1);
  }
}
