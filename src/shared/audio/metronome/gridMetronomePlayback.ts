import { CLICK_SAMPLE_URL } from '../drumSampleUrls';
import { loadClickSample, playClickSampleAt, type LoadedClickSample } from '../clickService';
import { ensureAudioContextRunning } from '../../playback/audioContextLifecycle';
import type { TimeSignature } from '../../rhythm/types';
import {
  getDefaultBeatGrouping,
  isCompoundTimeSignature,
} from '../../rhythm/timeSignatureUtils';
import { buildSubdivisionGrid, type SubdivGridEntry } from './gridBuilder';
import {
  resolveRhythmMetronomeClick,
  resolveRhythmMetronomeDrum,
  resolveRhythmMetronomeVoice,
  type RhythmMetronomeClickPrefs,
} from './rhythmMetronomeClick';
import {
  loadMetronomeDrumSamples,
  playMetronomeDrumSampleAt,
  type MetronomeDrumSound,
} from './metronomeDrumSamples';
import {
  eighthBaseSlotsPerEighth,
  slotsPerBeat,
  VOICE_SUBDIV_MIN_DUR,
  type SubdivisionLevel,
  type VoiceMode,
} from './types';
import { scheduleVoiceSampleOnContext } from './scheduleVoiceSample';
import { VoicePackLoader } from './voicePackLoader';
import type { MetronomeVisualDot, MetronomeDotTier } from './metronomeVisualDots';

export function gridSubdivDurationSec(
  bpm: number,
  timeSignature: TimeSignature,
  subdivisionLevel: SubdivisionLevel,
): number {
  const secsPerQuarter = 60 / bpm;

  if (timeSignature.denominator === 8) {
    const secsPerEighth = secsPerQuarter / 2;
    return secsPerEighth / eighthBaseSlotsPerEighth(subdivisionLevel);
  }

  if (subdivisionLevel === 'swing8') {
    return secsPerQuarter / 3;
  }

  return secsPerQuarter / slotsPerBeat(subdivisionLevel);
}

export type GridMetronomePlaybackPrefs = RhythmMetronomeClickPrefs & {
  subdivisionLevel: SubdivisionLevel;
  voiceMode: VoiceMode;
};

function tierForEntry(entry: SubdivGridEntry): MetronomeDotTier {
  if (entry.subdivision === 'accent') return 'downbeat';
  if (entry.subdivision === 'quarter') return 'beat';
  return 'subdivision';
}

function dotFromGridEntry(entry: SubdivGridEntry, slotInMeasure: number): MetronomeVisualDot {
  return {
    positionInSixteenths: slotInMeasure,
    tier: tierForEntry(entry),
    subdivision: entry.subdivision,
    sampleId: entry.sampleId,
    silent: entry.silent,
  };
}

function buildGrid(
  timeSignature: TimeSignature,
  prefs: GridMetronomePlaybackPrefs,
): SubdivGridEntry[] {
  return buildSubdivisionGrid({
    timeSignature,
    grouping: getDefaultBeatGrouping(timeSignature),
    voiceMode: prefs.voiceMode,
    subdivisionLevel: prefs.subdivisionLevel,
    compound: isCompoundTimeSignature(timeSignature),
  });
}

export class GridMetronomeScheduler {
  private lastGlobalSlot = -1;
  private voicePack = new VoicePackLoader();
  private voiceLoaded = false;
  private clickSample: LoadedClickSample | null = null;
  private clickLoading: Promise<LoadedClickSample | null> | null = null;
  private drumSamples = new Map<MetronomeDrumSound, AudioBuffer>();
  private drumLoading: Promise<Map<MetronomeDrumSound, AudioBuffer>> | null = null;
  private grid: SubdivGridEntry[] = [];
  private slotsPerMeasure = 1;
  private slotDurationSec = 0.5;
  private anchorSec = 0;
  private configuredKey = '';
  private pollInFlight = false;

  configure(
    bpm: number,
    timeSignature: TimeSignature,
    prefs: GridMetronomePlaybackPrefs,
    anchorSec = 0,
  ): void {
    const grid = buildGrid(timeSignature, prefs);
    const slotsPerMeasure = Math.max(1, grid.length);
    const slotDurationSec = gridSubdivDurationSec(bpm, timeSignature, prefs.subdivisionLevel);
    const configuredKey = JSON.stringify({
      bpm,
      timeSignature,
      subdivisionLevel: prefs.subdivisionLevel,
      voiceMode: prefs.voiceMode,
      anchorSec,
      slotsPerMeasure,
      slotDurationSec,
    });

    if (configuredKey !== this.configuredKey) {
      this.configuredKey = configuredKey;
      this.lastGlobalSlot = -1;
    }

    this.grid = grid;
    this.slotsPerMeasure = slotsPerMeasure;
    this.slotDurationSec = slotDurationSec;
    this.anchorSec = anchorSec;
  }

  reset(): void {
    this.lastGlobalSlot = -1;
  }

  private async ensureAudio(ctx: AudioContext, prefs: GridMetronomePlaybackPrefs): Promise<void> {
    await ensureAudioContextRunning(ctx);
    if (prefs.sourceEnabled.voice && !this.voiceLoaded) {
      await this.voicePack.load(ctx);
      this.voiceLoaded = true;
    }
    if (!this.clickSample) {
      if (!this.clickLoading) {
        this.clickLoading = loadClickSample(ctx, CLICK_SAMPLE_URL).then((s) => {
          this.clickSample = s;
          return s;
        });
      }
      await this.clickLoading;
    }
    if (prefs.sourceEnabled.drum && this.drumSamples.size === 0) {
      if (!this.drumLoading) {
        this.drumLoading = loadMetronomeDrumSamples(ctx).then((samples) => {
          this.drumSamples = samples;
          return samples;
        });
      }
      await this.drumLoading;
    }
  }

  /** Schedule clicks/voice for grid slots crossed since the last poll. */
  async pollTimeline(
    ctx: AudioContext,
    timelineSec: number,
    prefs: GridMetronomePlaybackPrefs,
    legacyMetVolume: number,
    audioLeadSec: number,
  ): Promise<void> {
    if (this.pollInFlight) return;
    if (this.slotsPerMeasure <= 0 || this.slotDurationSec <= 0) return;

    this.pollInFlight = true;
    try {
      const adjusted = timelineSec - this.anchorSec;
      const globalSlot = Math.floor(adjusted / this.slotDurationSec + 1e-9);
      if (globalSlot < 0) return;

      if (this.lastGlobalSlot < 0) {
        this.lastGlobalSlot = globalSlot - 1;
      }

      if (globalSlot < this.lastGlobalSlot) {
        this.lastGlobalSlot = globalSlot;
        return;
      }

      if (globalSlot === this.lastGlobalSlot) return;

      await this.ensureAudio(ctx, prefs);

      for (let slot = this.lastGlobalSlot + 1; slot <= globalSlot; slot++) {
        const entry = this.grid[slot % this.slotsPerMeasure];
        if (!entry) continue;

        const slotTimelineSec = this.anchorSec + slot * this.slotDurationSec;
        const audioTime = ctx.currentTime + audioLeadSec + (slotTimelineSec - timelineSec);
        if (audioTime < ctx.currentTime - 0.05) continue;

        const dot = dotFromGridEntry(entry, slot % this.slotsPerMeasure);

        const click = resolveRhythmMetronomeClick(dot, prefs, legacyMetVolume);
        if (click && this.clickSample) {
          playClickSampleAt(ctx, this.clickSample, audioTime, click.volume, click.playbackRate);
        }

        const voice = resolveRhythmMetronomeVoice(
          dot,
          prefs,
          legacyMetVolume,
          this.slotDurationSec,
          VOICE_SUBDIV_MIN_DUR,
        );
        if (voice?.sampleId) {
          scheduleVoiceSampleOnContext(
            ctx,
            this.voicePack,
            voice.sampleId,
            audioTime,
            voice.volume,
            this.slotDurationSec,
          );
        }

        const drum = resolveRhythmMetronomeDrum(dot, prefs, legacyMetVolume);
        if (drum && this.drumSamples.size > 0) {
          playMetronomeDrumSampleAt(
            ctx,
            this.drumSamples,
            drum.sound,
            audioTime,
            drum.volume,
            this.slotDurationSec,
          );
        }
      }

      this.lastGlobalSlot = globalSlot;
    } finally {
      this.pollInFlight = false;
    }
  }
}
