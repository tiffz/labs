import { createManagedAudioContext, ensureAudioContextRunning, primeAudioContext } from '../playback/audioContextLifecycle';
import { createInstrumentForSoundType } from '../playback/instrumentFactory';
import { SampledPiano, type Instrument } from '../playback/instruments';
import type { SoundType } from './soundOptions';
import {
  IDLE_SAMPLED_PIANO_LOAD_STATE,
  type SampledPianoLoadState,
} from './sampledPianoLoadState';

export type { SampledPianoLoadState };

const IDLE_SAMPLE_STATE: SampledPianoLoadState = IDLE_SAMPLED_PIANO_LOAD_STATE;

export class ChordInstrumentSession {
  private managed = createManagedAudioContext();
  private instrument: Instrument | null = null;
  private soundType: SoundType | null = null;
  private sampledPiano: SampledPiano | null = null;
  private onSampleLoadChange: ((state: SampledPianoLoadState) => void) | null = null;
  private disposed = false;

  /** Non-awaited resume attempt — call synchronously from a click handler. */
  primeAudioContext(): void {
    if (this.disposed) return;
    primeAudioContext(this.managed.context);
  }

  getAudioContext(): AudioContext | null {
    if (this.disposed) return null;
    return this.managed.context;
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  setSampleLoadListener(listener: ((state: SampledPianoLoadState) => void) | null): void {
    this.onSampleLoadChange = listener;
  }

  private emitSampleLoad(state: SampledPianoLoadState): void {
    this.onSampleLoadChange?.(state);
  }

  async ensureInstrument(soundType: SoundType): Promise<{ ctx: AudioContext; instrument: Instrument } | null> {
    if (this.disposed) return null;
    const ctx = this.managed.context;
    if (ctx.state === 'closed') return null;
    const running = await ensureAudioContextRunning(ctx);
    if (!running) return null;

    if (
      this.instrument &&
      this.soundType === soundType &&
      (soundType !== 'piano-sampled' || this.sampledPiano?.isReady())
    ) {
      return { ctx, instrument: this.instrument };
    }

    this.instrument?.stopAll(20);
    if (this.instrument && this.instrument !== this.sampledPiano) {
      this.instrument.disconnect();
    }

    if (soundType === 'piano-sampled') {
      if (!this.sampledPiano) {
        this.sampledPiano = new SampledPiano(ctx);
      }
      try {
        this.sampledPiano.disconnect();
      } catch {
        /* ignore */
      }
      this.sampledPiano.connect(ctx.destination);
      this.sampledPiano.setLoadingProgressCallback((loaded, total) => {
        this.emitSampleLoad({
          loading: loaded < total,
          loaded,
          total,
          ready: false,
        });
      });
      if (!this.sampledPiano.isReady()) {
        await this.sampledPiano.loadSamples();
      }
      this.emitSampleLoad({
        loading: false,
        loaded: 1,
        total: 1,
        ready: this.sampledPiano.isReady(),
      });
      this.instrument = this.sampledPiano;
      this.soundType = soundType;
      return { ctx, instrument: this.sampledPiano };
    }

    this.emitSampleLoad(IDLE_SAMPLE_STATE);
    const instrument = createInstrumentForSoundType({
      soundType,
      context: ctx,
      output: ctx.destination,
      sampledPiano: this.sampledPiano,
    });
    this.instrument = instrument;
    this.soundType = soundType;
    return { ctx, instrument };
  }

  stopAll(): void {
    this.instrument?.stopAll(0);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopAll();
    if (this.instrument && this.instrument !== this.sampledPiano) {
      this.instrument.disconnect();
    }
    if (this.sampledPiano) {
      this.sampledPiano.disconnect();
    }
    this.sampledPiano = null;
    this.instrument = null;
    this.soundType = null;
    this.managed.dispose();
    this.onSampleLoadChange = null;
  }
}
