import { MetronomeEngine } from '../../metronome/MetronomeEngine';
import type { BeatCallback } from '../../metronome/types';
import type { TimeSignature } from '../../../rhythm/types';
import type { AudioClockSource } from '../clocks';
import { LookAheadAudioScheduler } from '../scheduling';
import { toMetronomeEngineConfig } from './toMetronomeEngineConfig';
import type { MetronomePreferences } from './preferences';
import { metronomeClickLevels } from './metronomeClickLevels';
import { CLICK_SAMPLE_URL } from '../../drumSampleUrls';
import { loadClickSample, playClickSampleAt } from '../../clickService';

/**
 * Coordinates metronome emission for slave-clock apps.
 * Uses MetronomeEngine when advanced prefs active; legacy click path when defaults.
 */
export class MetronomeRuntimeCoordinator {
  private engine: MetronomeEngine | null = null;
  private scheduler = new LookAheadAudioScheduler();
  private prefs: MetronomePreferences | null = null;
  private clock: AudioClockSource | null = null;
  private bpm = 120;
  private timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
  private enabled = false;
  private useLegacyClicks = true;
  private clickSample: Awaited<ReturnType<typeof loadClickSample>> = null;
  private clickCtx: AudioContext | null = null;
  private scheduledUpToBeat = -1;

  setPreferences(prefs: MetronomePreferences, baseline: MetronomePreferences): void {
    this.prefs = prefs;
    this.useLegacyClicks = JSON.stringify(prefs) === JSON.stringify(baseline) &&
      !prefs.sourceEnabled.voice &&
      !prefs.sourceEnabled.drum;
    if (this.engine && this.enabled) {
      void this.syncEngineConfig();
    }
  }

  attachClock(clock: AudioClockSource): void {
    this.clock = clock;
    this.bpm = clock.bpm;
    this.timeSignature = clock.timeSignature;
  }

  async start(onBeat?: BeatCallback): Promise<void> {
    this.enabled = true;
    if (this.useLegacyClicks && this.clock) {
      await this.startLegacyMediaClicks();
      return;
    }
    if (!this.engine) this.engine = new MetronomeEngine();
    if (onBeat) this.engine.onBeat(onBeat);
    await this.syncEngineConfig();
    await this.engine.start(
      toMetronomeEngineConfig(this.prefs!, this.bpm, this.timeSignature),
    );
  }

  stop(): void {
    this.enabled = false;
    this.scheduler.stop();
    this.engine?.stop();
    this.scheduledUpToBeat = -1;
  }

  private async syncEngineConfig(): Promise<void> {
    if (!this.engine || !this.prefs) return;
    const cfg = toMetronomeEngineConfig(this.prefs, this.bpm, this.timeSignature);
    this.engine.setTempo(cfg.bpm);
    this.engine.setTimeSignature(cfg.timeSignature);
    this.engine.setSubdivisionLevel(cfg.subdivisionLevel ?? 2);
    this.engine.setVoiceMode(cfg.voiceMode ?? 'counting');
    if (cfg.voiceGain !== undefined) this.engine.setVoiceGain(cfg.voiceGain);
    if (cfg.clickGain !== undefined) this.engine.setClickGain(cfg.clickGain);
    if (cfg.drumGain !== undefined) this.engine.setDrumGain(cfg.drumGain);
    this.engine.setSubdivisionVolumes(cfg.volumes);
  }

  /** Media-timeline legacy parity — look-ahead clicks matching Stanza levels. */
  async startLegacyMediaClicks(): Promise<void> {
    if (!this.clock || !this.prefs) return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!this.clickCtx) this.clickCtx = new Ctor();
    const ctx = this.clickCtx;
    if (!this.clickSample) {
      this.clickSample = await loadClickSample(ctx, CLICK_SAMPLE_URL);
    }

    this.scheduler.start(() => {
      if (!this.enabled || !this.clock || !this.prefs) return;
      // MediaTimelineClock polling handled externally; coordinator schedules ahead from beat map
    });
  }

  /** Schedule a single downbeat/offbeat click at audioTime (Stanza migration path). */
  scheduleLegacyClick(
    ctx: AudioContext,
    isDownbeat: boolean,
    userGain: number,
    audioTime: number,
  ): void {
    if (!this.prefs || !this.clickSample) return;
    const { volume, playbackRate } = metronomeClickLevels(
      isDownbeat,
      userGain * (this.prefs.masterVolume / 100) * (this.prefs.sourceEnabled.click ? this.prefs.clickGain : 0),
    );
    if (volume <= 0) return;
    playClickSampleAt(ctx, this.clickSample, audioTime, volume, playbackRate);
  }

  resync(): void {
    this.scheduledUpToBeat = -1;
  }

  getEngine(): MetronomeEngine | null {
    return this.engine;
  }
}
