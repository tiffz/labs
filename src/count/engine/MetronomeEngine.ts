import type { TimeSignature } from '../../shared/rhythm/types';
import {
  getDefaultBeatGrouping,
  parseBeatGrouping,
} from '../../shared/rhythm/timeSignatureUtils';
import { CLICK_SAMPLE_URL, DRUM_SAMPLE_URLS } from '../../shared/audio/drumSampleUrls';
import { loadClickSample } from '../../shared/audio/clickService';
import type { LoadedClickSample } from '../../shared/audio/clickService';
import { PreciseScheduler } from '../../shared/audio/preciseScheduler';
import { VoicePackLoader } from './voicePackLoader';
import type {
  MetronomeConfig,
  SubdivisionVolumes,
  SubdivisionType,
  SubdivisionLevel,
  BeatEvent,
  BeatCallback,
  QuietCountConfig,
  VoiceMode,
} from './types';
import { eighthBaseSlotsPerEighth, slotsPerBeat, VOICE_SUBDIV_MIN_DUR } from './types';
import { buildSubdivisionGrid, type SubdivGridEntry } from './gridBuilder';

const SCHEDULE_AHEAD_SEC = 0.25;

const DRUM_FOR_SUBDIVISION: Record<SubdivisionType, 'dum' | 'tak' | 'ka'> = {
  accent: 'dum',
  quarter: 'dum',
  eighth: 'tak',
  sixteenth: 'ka',
};

/**
 * Sample-accurate metronome engine using the Web Audio API look-ahead
 * scheduling pattern. Decoupled from React — communicates via callbacks.
 *
 * Supports three simultaneous sound sources: human voice samples, the
 * shared labs click.mp3, and drum sounds (dum/tak/ka), each with
 * independent gain control and per-channel muting.
 */
export class MetronomeEngine {
  private ctx: AudioContext | null = null;
  private scheduler = new PreciseScheduler();
  private voicePack = new VoicePackLoader();
  private clickSample: LoadedClickSample | null = null;
  private drumSamples = new Map<string, AudioBuffer>();
  private subdivGainNodes = new Map<string, GainNode>();
  private voiceMasterGain: GainNode | null = null;
  private clickMasterGain: GainNode | null = null;
  private drumMasterGain: GainNode | null = null;

  private startTime = 0;
  private playing = false;
  private bpm = 120;
  private timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
  private grouping: number[] = [1, 1, 1, 1];
  private volumes: SubdivisionVolumes = {
    accent: 1.0,
    quarter: 0.8,
    eighth: 0.0,
    sixteenth: 0.0,
  };
  private mutedChannels = new Set<string>();
  private voiceGain = 1.0;
  private clickGain = 0.5;
  private drumGain = 0;
  private channelVoiceMutes = new Set<string>();
  private channelClickMutes = new Set<string>();
  private channelDrumMutes = new Set<string>();
  private quietCount: QuietCountConfig | undefined;
  private perBeatVolumes: number[] = [];
  private voiceMode: VoiceMode = 'counting';
  private subdivisionLevel: SubdivisionLevel = 2;

  private nextSubdivIndex = 0;
  private beatCallback: BeatCallback | null = null;
  private scheduledUpToTime = 0;

  private subdivGrid: SubdivGridEntry[] = [];
  private subdivsPerMeasure = 0;
  private measuresPlayed = 0;

  private countInRemaining = 0;
  private countInTotalBeats = 0;
  private countInBeatCb: ((beatNumber: number, totalBeats: number) => void) | null = null;
  private countInCompleteCb: (() => void) | null = null;

  onBeat(cb: BeatCallback): void {
    this.beatCallback = cb;
  }

  async start(config: MetronomeConfig): Promise<void> {
    this.scheduler.stop();
    const session = this.scheduler.beginSession();

    this.bpm = config.bpm;
    this.timeSignature = config.timeSignature;
    this.volumes = { ...config.volumes };
    this.quietCount = config.quietCount;
    if (config.voiceGain !== undefined) this.voiceGain = config.voiceGain;
    if (config.clickGain !== undefined) this.clickGain = config.clickGain;
    if (config.drumGain !== undefined) this.drumGain = config.drumGain;
    if (config.mutedChannels) this.mutedChannels = new Set(config.mutedChannels);
    if (config.perBeatVolumes) this.perBeatVolumes = [...config.perBeatVolumes];
    if (config.voiceMode) this.voiceMode = config.voiceMode;
    if (config.subdivisionLevel) this.subdivisionLevel = config.subdivisionLevel;
    if (config.channelVoiceMutes) this.channelVoiceMutes = new Set(config.channelVoiceMutes);
    if (config.channelClickMutes) this.channelClickMutes = new Set(config.channelClickMutes);
    if (config.channelDrumMutes) this.channelDrumMutes = new Set(config.channelDrumMutes);

    this.parseGrouping(config.beatGrouping);
    this.buildSubdivGrid();

    this.countInRemaining = config.countInMeasures ?? 0;
    this.countInBeatCb = config.onCountInBeat ?? null;
    this.countInCompleteCb = config.onCountInComplete ?? null;
    this.countInTotalBeats = this.grouping.length;

    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.createGainNodes();
    await Promise.all([
      this.voicePack.load(this.ctx),
      this.loadClickSample(),
      this.loadDrumSamples(),
    ]);

    if (!this.scheduler.isSessionValid(session)) return;

    this.nextSubdivIndex = 0;
    this.measuresPlayed = 0;
    this.startTime = this.ctx.currentTime + 0.05;
    this.scheduledUpToTime = this.startTime;
    this.playing = true;

    this.scheduler.startLoop(this.tick);
  }

  stop(): void {
    this.playing = false;
    this.scheduler.stopLoop();
    this.scheduler.clearAllCallbacks();

    if (this.ctx) {
      const gains = [this.voiceMasterGain, this.clickMasterGain, this.drumMasterGain]
        .filter((g): g is GainNode => g !== null);
      this.scheduler.rampDown(this.ctx, gains);
    }

    const session = this.scheduler.beginSession();
    setTimeout(() => {
      if (this.scheduler.isSessionValid(session)) {
        this.scheduler.stopAllSources();
      }
    }, 30);
  }

  setTempo(bpm: number): void {
    if (!this.playing || !this.ctx) {
      this.bpm = bpm;
      return;
    }
    const elapsed = this.ctx.currentTime - this.startTime;
    const oldSubdivsElapsed = elapsed / this.subdivDuration(this.bpm);
    this.bpm = bpm;
    const newElapsed = oldSubdivsElapsed * this.subdivDuration(bpm);
    this.startTime = this.ctx.currentTime - newElapsed;
  }

  setTimeSignature(ts: TimeSignature, groupingStr?: string): void {
    this.timeSignature = ts;
    this.parseGrouping(groupingStr);
    this.buildSubdivGrid();
    this.nextSubdivIndex = 0;
    this.measuresPlayed = 0;
    if (this.playing && this.ctx) {
      this.startTime = this.ctx.currentTime + 0.05;
      this.scheduledUpToTime = this.startTime;
    }
  }

  setSubdivisionVolumes(v: SubdivisionVolumes): void {
    this.volumes = { ...v };
    this.applySubdivGainValues();
  }

  setMutedChannels(muted: Set<string>): void {
    this.mutedChannels = muted;
    this.applySubdivGainValues();
  }

  setVoiceGain(v: number): void {
    this.voiceGain = v;
    if (this.voiceMasterGain && this.ctx) {
      this.voiceMasterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
    }
  }

  setClickGain(v: number): void {
    this.clickGain = v;
    if (this.clickMasterGain && this.ctx) {
      this.clickMasterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
    }
  }

  setDrumGain(v: number): void {
    this.drumGain = v;
    if (this.drumMasterGain && this.ctx) {
      this.drumMasterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
    }
  }

  setChannelVoiceMutes(muted: Set<string>): void {
    this.channelVoiceMutes = muted;
  }

  setChannelClickMutes(muted: Set<string>): void {
    this.channelClickMutes = muted;
  }

  setChannelDrumMutes(muted: Set<string>): void {
    this.channelDrumMutes = muted;
  }

  setPerBeatVolumes(vols: number[]): void {
    this.perBeatVolumes = [...vols];
  }

  setVoiceMode(mode: VoiceMode): void {
    this.voiceMode = mode;
    this.buildSubdivGrid();
  }

  setSubdivisionLevel(level: SubdivisionLevel): void {
    this.subdivisionLevel = level;
    this.buildSubdivGrid();
    this.nextSubdivIndex = 0;
    this.measuresPlayed = 0;
    if (this.playing && this.ctx) {
      this.startTime = this.ctx.currentTime + 0.05;
      this.scheduledUpToTime = this.startTime;
    }
  }

  getScheduledBeatTimes(): number[] {
    return this._scheduledBeatTimes.slice();
  }

  getSubdivsPerMeasure(): number {
    return this.subdivsPerMeasure;
  }

  private _scheduledBeatTimes: number[] = [];

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private async loadClickSample(): Promise<void> {
    if (!this.ctx) return;
    this.clickSample = await loadClickSample(this.ctx, CLICK_SAMPLE_URL);
  }

  private async loadDrumSamples(): Promise<void> {
    if (!this.ctx) return;
    const entries: Array<[string, string]> = [
      ['dum', DRUM_SAMPLE_URLS.dum],
      ['tak', DRUM_SAMPLE_URLS.tak],
      ['ka', DRUM_SAMPLE_URLS.ka],
    ];
    await Promise.all(entries.map(async ([name, url]) => {
      if (this.drumSamples.has(name)) return;
      try {
        const resp = await fetch(url);
        const buf = await resp.arrayBuffer();
        const decoded = await this.ctx!.decodeAudioData(buf);
        this.drumSamples.set(name, decoded);
      } catch {
        // Drum sample failed to load — drum source will be silent for this sound
      }
    }));
  }

  private parseGrouping(str?: string): void {
    if (str) {
      const parsed = parseBeatGrouping(str);
      if (parsed) {
        this.grouping = parsed;
        return;
      }
    }
    this.grouping = getDefaultBeatGrouping(this.timeSignature);
  }

  private buildSubdivGrid(): void {
    const grid = buildSubdivisionGrid({
      timeSignature: this.timeSignature,
      grouping: this.grouping,
      voiceMode: this.voiceMode,
      subdivisionLevel: this.subdivisionLevel,
      compound: false,
    });

    this.subdivGrid = grid;
    this.subdivsPerMeasure = grid.length;
  }

  /**
   * Duration for a single grid slot. Uniform for all levels including swing8
   * (triplet grid: each slot = 1/3 beat, with the middle slot silent).
   */
  private subdivDuration(bpm: number): number {
    const secsPerQuarter = 60 / bpm;

    if (this.timeSignature.denominator === 8) {
      const secsPerEighth = secsPerQuarter / 2;
      return secsPerEighth / eighthBaseSlotsPerEighth(this.subdivisionLevel);
    }

    if (this.subdivisionLevel === 'swing8') {
      return secsPerQuarter / 3;
    }

    return secsPerQuarter / slotsPerBeat(this.subdivisionLevel);
  }

  private createGainNodes(): void {
    if (!this.ctx) return;
    this.subdivGainNodes.clear();

    this.voiceMasterGain = this.ctx.createGain();
    this.voiceMasterGain.gain.value = this.voiceGain;
    this.voiceMasterGain.connect(this.ctx.destination);

    this.clickMasterGain = this.ctx.createGain();
    this.clickMasterGain.gain.value = this.clickGain;
    this.clickMasterGain.connect(this.ctx.destination);

    this.drumMasterGain = this.ctx.createGain();
    this.drumMasterGain.gain.value = this.drumGain;
    this.drumMasterGain.connect(this.ctx.destination);

    const channels: Array<keyof SubdivisionVolumes> = [
      'accent', 'quarter', 'eighth', 'sixteenth',
    ];
    for (const ch of channels) {
      const gain = this.ctx.createGain();
      const effective = this.mutedChannels.has(ch) ? 0 : this.volumes[ch];
      gain.gain.value = effective;
      gain.connect(this.voiceMasterGain);
      this.subdivGainNodes.set(ch, gain);
    }
  }

  private applySubdivGainValues(): void {
    for (const [ch, node] of this.subdivGainNodes) {
      const effective = this.mutedChannels.has(ch)
        ? 0
        : (this.volumes[ch as keyof SubdivisionVolumes] ?? 0);
      node.gain.setTargetAtTime(effective, this.ctx?.currentTime ?? 0, 0.01);
    }
  }

  private tick = (): void => {
    if (!this.playing || !this.ctx) return;

    const now = this.ctx.currentTime;
    const scheduleHorizon = now + SCHEDULE_AHEAD_SEC;

    const gap = now - this.scheduledUpToTime;
    if (gap > SCHEDULE_AHEAD_SEC * 2) {
      const subdivDur = this.subdivDuration(this.bpm);
      const missedSubdivs = Math.floor(gap / subdivDur);
      this.nextSubdivIndex += missedSubdivs;
      this.measuresPlayed += Math.floor(missedSubdivs / this.subdivsPerMeasure);
      this.scheduledUpToTime = now;
    }

    while (this.scheduledUpToTime < scheduleHorizon) {
      const subdivDur = this.subdivDuration(this.bpm);
      const audioTime = this.scheduledUpToTime;

      if (audioTime > scheduleHorizon) break;

      const measureIndex = this.nextSubdivIndex % this.subdivsPerMeasure;
      const entry = this.subdivGrid[measureIndex];

      const isCountIn = this.countInRemaining > 0;

      if (entry) {
        if (isCountIn) {
          if (entry.isGroupStart) {
            const sampleId = `beat-${entry.groupIndex + 1}`;
            this.scheduleCountInVoice(sampleId, audioTime, subdivDur);

            const beatNum = entry.groupIndex + 1;
            const delay = Math.max(0, (audioTime - now) * 1000);
            this.scheduler.scheduleCallback(delay, () => {
              this.countInBeatCb?.(beatNum, this.countInTotalBeats);
            });
          }
        } else {
          const isSilent = this.isInSilentBar() || !!entry.silent;
          const channelVolume = this.volumes[entry.subdivision];
          const channelMuted = this.mutedChannels.has(entry.subdivision);
          const perBeatVol = this.perBeatVolumes[measureIndex] ?? 1.0;

          if (!isSilent && channelVolume > 0 && !channelMuted && perBeatVol > 0) {
            const voiceMutedForChannel = this.channelVoiceMutes.has(entry.subdivision);
            const clickMutedForChannel = this.channelClickMutes.has(entry.subdivision);
            const drumMutedForChannel = this.channelDrumMutes.has(entry.subdivision);

            if (entry.sampleId && this.voiceGain > 0 && !voiceMutedForChannel) {
              const isBeatVoice = entry.subdivision === 'accent' || entry.subdivision === 'quarter';
              if (isBeatVoice || subdivDur >= VOICE_SUBDIV_MIN_DUR) {
                this.scheduleVoiceSample(entry.sampleId, audioTime, entry.subdivision, subdivDur, perBeatVol);
              }
            }
            if (this.clickGain > 0 && !clickMutedForChannel) {
              this.scheduleClick(audioTime, entry.subdivision, channelVolume * perBeatVol, subdivDur);
            }
            if (this.drumGain > 0 && !drumMutedForChannel) {
              this.scheduleDrum(audioTime, entry.subdivision, channelVolume * perBeatVol, subdivDur);
            }
          }

          if (entry.subdivision === 'accent' || entry.subdivision === 'quarter') {
            this._scheduledBeatTimes.push(audioTime);
            if (this._scheduledBeatTimes.length > 200) {
              this._scheduledBeatTimes = this._scheduledBeatTimes.slice(-100);
            }
          }

          if (this.beatCallback) {
            const measure = this.measuresPlayed;
            const isSilent = this.isInSilentBar() || !!entry.silent;
            const evt: BeatEvent = {
              beatIndex: entry.beatIndex,
              measureBeat: entry.measureBeat,
              measure,
              subdivision: entry.subdivision,
              isGroupStart: entry.isGroupStart,
              groupIndex: entry.groupIndex,
              audioTime,
              isSilent,
            };
            const delay = Math.max(0, (audioTime - now) * 1000);
            this.scheduler.scheduleCallback(delay, () => this.beatCallback?.(evt));
          }
        }
      }

      this.nextSubdivIndex++;
      this.scheduledUpToTime = audioTime + subdivDur;

      if (this.nextSubdivIndex % this.subdivsPerMeasure === 0) {
        this.measuresPlayed++;
        if (isCountIn) {
          this.countInRemaining--;
          if (this.countInRemaining === 0) {
            const delay = Math.max(0, (audioTime + subdivDur - now) * 1000);
            this.scheduler.scheduleCallback(delay, () => {
              this.countInCompleteCb?.();
            });
          }
        }
      }
    }
  };

  private isInSilentBar(): boolean {
    if (!this.quietCount) return false;
    const { playBars, silentBars } = this.quietCount;
    const cycleLength = playBars + silentBars;
    const barInCycle = this.measuresPlayed % cycleLength;
    return barInCycle >= playBars;
  }

  private scheduleVoiceSample(
    sampleId: string,
    audioTime: number,
    subdivision: SubdivisionType,
    subdivDur: number,
    perBeatVol: number,
  ): void {
    if (!this.ctx || !this.voiceMasterGain) return;
    if (subdivDur < 0.10) return;

    const buffer = this.voicePack.getSample(sampleId);
    const gainNode = this.subdivGainNodes.get(subdivision);
    if (!buffer || !gainNode) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const sampleDur = buffer.duration;
    const maxPlayDur = subdivDur * 0.92;
    if (sampleDur > maxPlayDur && maxPlayDur > 0.03) {
      source.playbackRate.value = Math.min(sampleDur / maxPlayDur, 2.0);
    }

    const rate = source.playbackRate.value;
    const rateCompensation = rate > 1.05 ? Math.min(Math.sqrt(rate), 1.5) : 1;
    const vol = perBeatVol * rateCompensation;

    const gain = this.ctx.createGain();
    const t = Math.max(audioTime, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, t);

    const effectiveDur = sampleDur / rate;
    if (effectiveDur > maxPlayDur) {
      const fadeStart = t + Math.max(0, maxPlayDur - 0.015);
      gain.gain.setValueAtTime(vol, fadeStart);
      gain.gain.linearRampToValueAtTime(0, t + maxPlayDur);
    }

    source.connect(gain);
    gain.connect(gainNode);

    this.scheduler.trackSource(source);
    source.start(t);
    if (effectiveDur > maxPlayDur) {
      source.stop(t + maxPlayDur);
    }
  }

  private scheduleClick(
    audioTime: number,
    subdivision: SubdivisionType,
    volume: number,
    subdivDur: number,
  ): void {
    if (!this.ctx || !this.clickMasterGain || !this.clickSample) return;

    const isStrong = subdivision === 'accent' || subdivision === 'quarter';
    const rate = isStrong ? 1.0 : 1.5;
    const vol = isStrong ? volume : volume * 0.8;

    const source = this.ctx.createBufferSource();
    source.buffer = this.clickSample.buffer;
    source.playbackRate.value = rate;

    const gain = this.ctx.createGain();
    const t = Math.max(audioTime, this.ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), t);

    const effectiveDur = this.clickSample.buffer.duration / rate;
    const maxPlayDur = subdivDur * 0.92;
    if (effectiveDur > maxPlayDur) {
      const fadeStart = t + Math.max(0, maxPlayDur - 0.015);
      gain.gain.setValueAtTime(vol, fadeStart);
      gain.gain.linearRampToValueAtTime(0, t + maxPlayDur);
    }

    source.connect(gain);
    gain.connect(this.clickMasterGain);
    this.scheduler.trackSource(source);
    source.start(t);
    if (effectiveDur > maxPlayDur) {
      source.stop(t + maxPlayDur);
    }
  }

  private scheduleDrum(
    audioTime: number,
    subdivision: SubdivisionType,
    volume: number,
    subdivDur: number,
  ): void {
    if (!this.ctx || !this.drumMasterGain) return;

    const drumName = DRUM_FOR_SUBDIVISION[subdivision];
    const buffer = this.drumSamples.get(drumName);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    const t = Math.max(audioTime, this.ctx.currentTime);
    const vol = Math.max(0, Math.min(1, volume));
    gain.gain.setValueAtTime(vol, t);

    const maxPlayDur = subdivDur * 0.92;
    if (buffer.duration > maxPlayDur) {
      const fadeStart = t + Math.max(0, maxPlayDur - 0.015);
      gain.gain.setValueAtTime(vol, fadeStart);
      gain.gain.linearRampToValueAtTime(0, t + maxPlayDur);
    }

    source.connect(gain);
    gain.connect(this.drumMasterGain);
    this.scheduler.trackSource(source);
    source.start(t);
    if (buffer.duration > maxPlayDur) {
      source.stop(t + maxPlayDur);
    }
  }

  /**
   * Schedule a voice sample for the count-in, connected directly to
   * the audio destination so it plays regardless of user gain settings.
   */
  private scheduleCountInVoice(sampleId: string, audioTime: number, subdivDur: number): void {
    if (!this.ctx) return;
    const buffer = this.voicePack.getSample(sampleId);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const maxPlayDur = subdivDur * 0.92;
    if (buffer.duration > maxPlayDur && maxPlayDur > 0.03) {
      source.playbackRate.value = Math.min(buffer.duration / maxPlayDur, 2.0);
    }

    const rate = source.playbackRate.value;
    const rateCompensation = rate > 1.05 ? Math.min(Math.sqrt(rate), 1.5) : 1;

    const gain = this.ctx.createGain();
    const t = Math.max(audioTime, this.ctx.currentTime);
    gain.gain.setValueAtTime(rateCompensation, t);

    const effectiveDur = buffer.duration / rate;
    if (effectiveDur > maxPlayDur) {
      const fadeStart = t + Math.max(0, maxPlayDur - 0.015);
      gain.gain.setValueAtTime(rateCompensation, fadeStart);
      gain.gain.linearRampToValueAtTime(0, t + maxPlayDur);
    }

    source.connect(gain);
    gain.connect(this.ctx.destination);
    this.scheduler.trackSource(source);
    source.start(t);
    if (effectiveDur > maxPlayDur) {
      source.stop(t + maxPlayDur);
    }
  }
}
