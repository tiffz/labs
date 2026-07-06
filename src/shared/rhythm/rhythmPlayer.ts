import type { ParsedRhythm, PlaybackSettings, DrumSound, TimeSignature } from './types';
import { audioPlayer } from './drumAudioPlayer';
import {
  getDefaultBeatGrouping,
  getBeatGroupInfo,
  getSixteenthsPerMeasure,
  getBeatGroupingInSixteenths,
} from './timeSignatureUtils';
import { PlaybackScheduler } from '../playback/scheduler';
import { PreciseScheduler } from '../audio/preciseScheduler';
import {
  getMetronomeVisualDots,
  shouldClickAtVisualDot,
} from '../audio/metronome/metronomeVisualDots';
import {
  resolveRhythmMetronomeClick,
  resolveRhythmMetronomeDrum,
  resolveRhythmMetronomeVoice,
  type RhythmMetronomeClickPrefs,
} from '../audio/metronome/rhythmMetronomeClick';
import { gridSubdivDurationSec } from '../audio/metronome/gridMetronomePlayback';
import type { SubdivisionLevel } from '../audio/metronome/types';
import { VOICE_SUBDIV_MIN_DUR } from '../audio/metronome/types';
import { VoicePackLoader } from '../audio/metronome/voicePackLoader';
import { scheduleVoiceSampleOnContext } from '../audio/metronome/scheduleVoiceSample';

export type RhythmMetronomePlaybackPrefs = RhythmMetronomeClickPrefs & {
  subdivisionLevel: SubdivisionLevel;
};

/**
 * Callback for when a note starts playing
 * Parameters: measureIndex, noteIndex within that measure
 */
export type NoteHighlightCallback = (
  measureIndex: number,
  noteIndex: number,
  repeatIteration?: number, // Current iteration (1-based)
  maxRepeats?: number      // Total number of repeats
) => void;

/**
 * Callback for when a metronome beat occurs
 * Parameters: measureIndex, noteIndex, isDownbeat (true for first beat of measure)
 */
export type MetronomeCallback = (measureIndex: number, positionInSixteenths: number, isDownbeat: boolean) => void;

interface ScheduledNoteEvent {
  timeSec: number;
  sound: DrumSound;
  volume: number;
  fadeDuration?: number;
  isTiedFrom: boolean;
  measureIndex: number;
  noteIndex: number;
  repeatIteration?: number;
  repeatCount?: number;
}

interface ScheduledMetronomeEvent {
  timeSec: number;
  measureIndex: number;
  positionInMeasure: number;
  isDownbeat: boolean;
  shouldClick: boolean;
  clickVolume: number;
  clickPlaybackRate: number;
  shouldVoice: boolean;
  voiceSampleId?: string;
  voiceVolume: number;
  shouldDrum: boolean;
  drumSound?: 'dum' | 'tak' | 'ka';
  drumVolume: number;
  subdivDurationSec: number;
}

function unrollMeasures(rhythm: ParsedRhythm) {
  const result: Array<{
    measure: (typeof rhythm.measures)[0];
    originalIndex: number;
    repeatIteration?: number;
    repeatCount?: number;
  }> = [];

  let i = 0;
  while (i < rhythm.measures.length) {
    result.push({ measure: rhythm.measures[i], originalIndex: i });

    const sectionRepeat = rhythm.repeats?.find(r =>
      r.type === 'section' && r.endMeasure === i
    ) as ({ type: 'section'; startMeasure: number; endMeasure: number; repeatCount: number } | undefined);

    if (sectionRepeat && sectionRepeat.repeatCount > 1) {
      for (let j = result.length - 1; j >= 0; j--) {
        const m = result[j];
        if (m.originalIndex >= sectionRepeat.startMeasure && m.originalIndex <= sectionRepeat.endMeasure) {
          m.repeatIteration = 1;
          m.repeatCount = sectionRepeat.repeatCount;
        } else if (m.originalIndex < sectionRepeat.startMeasure && m.repeatIteration === undefined) {
          break;
        }
      }

      for (let r = 2; r <= sectionRepeat.repeatCount; r++) {
        for (let k = sectionRepeat.startMeasure; k <= sectionRepeat.endMeasure; k++) {
          if (k >= 0 && k < rhythm.measures.length) {
            result.push({
              measure: rhythm.measures[k],
              originalIndex: k,
              repeatIteration: r,
              repeatCount: sectionRepeat.repeatCount,
            });
          }
        }
      }
    }
    i++;
  }

  return result;
}

/**
 * Rhythm player that schedules and plays notes based on BPM.
 *
 * Uses a requestAnimationFrame look-ahead loop combined with
 * AudioContext-based scheduling for sample-accurate timing.
 * UI callbacks (note highlighting, metronome beat) are still delivered
 * via setTimeout but tracked for reliable cleanup on stop.
 *
 * RELIABILITY FEATURES:
 * - PreciseScheduler handles source tracking, timeout cleanup, and rAF loop
 * - Generation counter protects against async start/stop races
 * - Health checks detect AudioContext issues
 * - Visibility change handling for tab backgrounding
 */
class RhythmPlayer {
  private scheduler = new PreciseScheduler();
  private isPlaying = false;
  private isLooping = false;
  private currentRhythm: ParsedRhythm | null = null;
  private currentBpm = 120;
  private onNotePlay: NoteHighlightCallback | null = null;
  private onPlaybackEnd: (() => void) | null = null;
  private onMetronomeBeat: MetronomeCallback | null = null;
  private metronomeEnabled = false;
  private settings: PlaybackSettings | null = null;
  private pendingBpm: number | null = null;
  private visibilityHandler: (() => void) | null = null;
  private healthCheckScheduler: PlaybackScheduler | null = null;
  private tickRange: { startTick: number; endTick: number } | null = null;
  private metronomeResolution: 'sixteenth' | 'beat' = 'sixteenth';
  private metronomePlaybackPrefs: RhythmMetronomePlaybackPrefs | null = null;
  private voicePack = new VoicePackLoader();
  private voiceSources: AudioBufferSourceNode[] = [];

  private scheduledUpToSec = 0;
  /** Absolute AudioContext time where the current loop iteration begins (event times are relative to this). */
  private audioStartTimeSec = 0;
  private noteEvents: ScheduledNoteEvent[] = [];
  private metronomeEvents: ScheduledMetronomeEvent[] = [];
  private noteEventIndex = 0;
  private metronomeEventIndex = 0;
  private loopDurationSec = 0;

  private static readonly LOOK_AHEAD_SEC = 0.25;
  /** Background tabs throttle rAF; schedule farther ahead so clicks still fire on time. */
  private static readonly LOOK_AHEAD_HIDDEN_SEC = 3.5;

  private getLookAheadSec(): number {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden'
      ? RhythmPlayer.LOOK_AHEAD_HIDDEN_SEC
      : RhythmPlayer.LOOK_AHEAD_SEC;
  }

  async play(
    rhythm: ParsedRhythm,
    bpm: number,
    onNotePlay?: NoteHighlightCallback,
    onPlaybackEnd?: () => void,
    metronomeEnabled?: boolean,
    onMetronomeBeat?: MetronomeCallback,
    settings?: PlaybackSettings,
    tickRange?: { startTick: number; endTick: number },
    metronomeResolution: 'sixteenth' | 'beat' = 'sixteenth',
    metronomePlaybackPrefs?: RhythmMetronomePlaybackPrefs,
  ): Promise<void> {
    this.stop();

    const session = this.scheduler.beginSession();

    const isAudioReady = await audioPlayer.ensureResumed();
    if (!isAudioReady) {
      console.error('Failed to initialize audio - cannot start playback');
      if (onPlaybackEnd) onPlaybackEnd();
      return;
    }

    const ctx = audioPlayer.getAudioContext();
    if (metronomePlaybackPrefs?.sourceEnabled.voice && ctx) {
      await this.voicePack.load(ctx);
    }

    if (!this.scheduler.isSessionValid(session)) return;

    this.isPlaying = true;
    this.isLooping = true;
    this.currentRhythm = rhythm;
    this.currentBpm = bpm;
    this.onNotePlay = onNotePlay || null;
    this.onPlaybackEnd = onPlaybackEnd || null;
    this.metronomeEnabled = metronomeEnabled || false;
    this.onMetronomeBeat = onMetronomeBeat || null;
    this.settings = settings || null;
    this.tickRange = tickRange || null;
    this.metronomeResolution = metronomeResolution;
    this.metronomePlaybackPrefs = metronomePlaybackPrefs ?? null;

    if (settings) {
      audioPlayer.setReverbStrength(settings.reverbStrength);
    }

    this.setupVisibilityHandler();
    this.startHealthCheck();

    this.buildEventList();

    if (!ctx) return;

    this.audioStartTimeSec = ctx.currentTime + 0.05;
    this.scheduledUpToSec = this.audioStartTimeSec;
    this.noteEventIndex = 0;
    this.metronomeEventIndex = 0;

    this.scheduler.startLoop(this.tick);
  }

  private setupVisibilityHandler(): void {
    this.removeVisibilityHandler();
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.isPlaying) {
        audioPlayer.ensureResumed().catch(err => {
          console.warn('Failed to resume audio on visibility change:', err);
        });
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private removeVisibilityHandler(): void {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  private startHealthCheck(): void {
    this.stopHealthCheck();
    this.healthCheckScheduler = new PlaybackScheduler(() => {
      if (!this.isPlaying) { this.stopHealthCheck(); return; }
      if (!audioPlayer.isHealthy()) {
        audioPlayer.ensureResumed().catch(err => {
          console.warn('Health check: failed to resume audio:', err);
        });
      }
    }, { intervalMs: 2000 });
    this.healthCheckScheduler.start();
  }

  private stopHealthCheck(): void {
    this.healthCheckScheduler?.stop();
    this.healthCheckScheduler = null;
  }

  /**
   * Pre-compute the flat list of note and metronome events for one loop
   * iteration. Times are in seconds relative to the loop start.
   */
  private buildEventList(): void {
    if (!this.currentRhythm) return;

    const rhythm = this.currentRhythm;
    const bpm = this.currentBpm;
    const secPerSixteenth = 60 / bpm / 4;

    const unrolledMeasures = unrollMeasures(rhythm);

    let totalTicks = 0;
    unrolledMeasures.forEach(({ measure }) => {
      measure.notes.forEach(note => { totalTicks += note.durationInSixteenths; });
    });

    const effectiveStartTick = this.tickRange ? this.tickRange.startTick : 0;
    const effectiveEndTick = this.tickRange ? Math.min(this.tickRange.endTick, totalTicks) : totalTicks;
    this.loopDurationSec = (effectiveEndTick - effectiveStartTick) * secPerSixteenth;

    const beatGrouping = getDefaultBeatGrouping(rhythm.timeSignature);
    const beatGroupingInSixteenths = getBeatGroupingInSixteenths(beatGrouping, rhythm.timeSignature);

    this.buildMetronomeEvents({
      secPerSixteenth,
      effectiveStartTick,
      effectiveEndTick,
    });

    // --- Note events ---
    this.noteEvents = [];
    let currentTick = 0;
    const isSimpleRhythm = rhythm.timeSignature.denominator === 4;

    unrolledMeasures.forEach(({ measure, originalIndex: measureIndex, repeatIteration, repeatCount }) => {
      let positionInMeasure = 0;

      measure.notes.forEach((note, noteIndex) => {
        const noteTick = currentTick;
        const isInRange = !this.tickRange || (noteTick >= effectiveStartTick && noteTick < effectiveEndTick);

        if (isInRange) {
          const timeSec = (noteTick - effectiveStartTick) * secPerSixteenth;
          const noteDurationSec = note.durationInSixteenths * secPerSixteenth;

          const settings = this.settings || {
            measureAccentVolume: 90,
            beatGroupAccentVolume: 70,
            nonAccentVolume: 40,
            emphasizeSimpleRhythms: false,
            metronomeVolume: 50,
          };

          let volume = settings.nonAccentVolume / 100;
          if (positionInMeasure === 0) {
            volume = settings.measureAccentVolume / 100;
          } else {
            const groupInfo = getBeatGroupInfo(positionInMeasure, beatGroupingInSixteenths);
            if (groupInfo.isFirstOfGroup) {
              if (!isSimpleRhythm || settings.emphasizeSimpleRhythms) {
                volume = settings.beatGroupAccentVolume / 100;
              }
            }
          }

          const fadeDuration = noteDurationSec < 0.15 ? noteDurationSec : undefined;

          this.noteEvents.push({
            timeSec,
            sound: note.sound,
            volume,
            fadeDuration,
            isTiedFrom: !!note.isTiedFrom,
            measureIndex,
            noteIndex,
            repeatIteration,
            repeatCount,
          });
        }

        currentTick += note.durationInSixteenths;
        positionInMeasure += note.durationInSixteenths;
      });
    });
  }

  private buildMetronomeEvents(timing: {
    secPerSixteenth: number;
    effectiveStartTick: number;
    effectiveEndTick: number;
  }): void {
    if (!this.currentRhythm) return;

    const rhythm = this.currentRhythm;
    const bpm = this.currentBpm;
    const { secPerSixteenth, effectiveStartTick, effectiveEndTick } = timing;

    this.metronomeEvents = [];
    let measureStartTick = 0;

    const subdivisionLevel = this.metronomePlaybackPrefs?.subdivisionLevel ?? null;
    const voiceMode = this.metronomePlaybackPrefs?.voiceMode ?? 'counting';
    const visualDots = subdivisionLevel != null
      ? getMetronomeVisualDots(rhythm.timeSignature, subdivisionLevel, voiceMode)
      : null;
    const legacyMetVolume = this.settings?.metronomeVolume ?? 50;
    const gridSubdivSec =
      subdivisionLevel != null
        ? gridSubdivDurationSec(bpm, rhythm.timeSignature, subdivisionLevel)
        : secPerSixteenth;

    rhythm.measures.forEach((measure, measureIndex) => {
      const sixteenthsPerMeasure = getSixteenthsPerMeasure(rhythm.timeSignature);
      const metBeatGrouping = getBeatGroupingInSixteenths(
        getDefaultBeatGrouping(rhythm.timeSignature),
        rhythm.timeSignature,
      );

      const clickPositions = new Set<number>();
      clickPositions.add(0);
      let cumulative = 0;
      for (const groupSize of metBeatGrouping) {
        cumulative += groupSize;
        if (cumulative < sixteenthsPerMeasure) clickPositions.add(cumulative);
      }

      let positionsToEmit: number[];
      const eventByPosition = new Map<
        number,
        Pick<
          ScheduledMetronomeEvent,
          | 'shouldClick'
          | 'clickVolume'
          | 'clickPlaybackRate'
          | 'shouldVoice'
          | 'voiceSampleId'
          | 'voiceVolume'
          | 'shouldDrum'
          | 'drumSound'
          | 'drumVolume'
          | 'subdivDurationSec'
        >
      >();

      if (visualDots && subdivisionLevel != null) {
        positionsToEmit = visualDots.map((d) => d.positionInSixteenths);
        for (const dot of visualDots) {
          let clickVolume = 0;
          let clickPlaybackRate = 1;
          let shouldClick = false;
          let shouldVoice = false;
          let voiceSampleId: string | undefined;
          let voiceVolume = 0;
          let shouldDrum = false;
          let drumSound: 'dum' | 'tak' | 'ka' | undefined;
          let drumVolume = 0;

          if (this.metronomePlaybackPrefs) {
            const resolved = resolveRhythmMetronomeClick(
              dot,
              this.metronomePlaybackPrefs,
              legacyMetVolume,
            );
            if (resolved) {
              shouldClick = true;
              clickVolume = resolved.volume;
              clickPlaybackRate = resolved.playbackRate;
            }

            const voiceResolved = resolveRhythmMetronomeVoice(
              dot,
              this.metronomePlaybackPrefs,
              legacyMetVolume,
              gridSubdivSec,
              VOICE_SUBDIV_MIN_DUR,
            );
            if (voiceResolved) {
              shouldVoice = true;
              voiceSampleId = voiceResolved.sampleId;
              voiceVolume = voiceResolved.volume;
            }

            const drumResolved = resolveRhythmMetronomeDrum(
              dot,
              this.metronomePlaybackPrefs,
              legacyMetVolume,
            );
            if (drumResolved) {
              shouldDrum = true;
              drumSound = drumResolved.sound;
              drumVolume = drumResolved.volume;
            }
          } else if (shouldClickAtVisualDot(dot, subdivisionLevel)) {
            shouldClick = true;
            clickVolume = (dot.tier === 'downbeat' ? 0.8 : 0.5) * (legacyMetVolume / 100);
            clickPlaybackRate = dot.tier === 'downbeat' ? 1.05 : 1.5;
          }

          eventByPosition.set(dot.positionInSixteenths, {
            shouldClick,
            clickVolume,
            clickPlaybackRate,
            shouldVoice,
            voiceSampleId,
            voiceVolume,
            shouldDrum,
            drumSound,
            drumVolume,
            subdivDurationSec: gridSubdivSec,
          });
        }
      } else {
        positionsToEmit = this.metronomeResolution === 'beat'
          ? Array.from(clickPositions.values()).sort((a, b) => a - b)
          : Array.from({ length: sixteenthsPerMeasure }, (_, i) => i);

        for (const pos of positionsToEmit) {
          const beatsClick = clickPositions.has(pos);
          eventByPosition.set(pos, {
            shouldClick: beatsClick,
            clickVolume: beatsClick ? (pos === 0 ? 0.8 : 0.5) * (legacyMetVolume / 100) : 0,
            clickPlaybackRate: pos === 0 ? 1.05 : 1,
            shouldVoice: false,
            voiceVolume: 0,
            shouldDrum: false,
            drumVolume: 0,
            subdivDurationSec: gridSubdivSec,
          });
        }
      }

      for (const pos of positionsToEmit) {
        const absTick = measureStartTick + pos;
        if (this.tickRange && (absTick < effectiveStartTick || absTick >= effectiveEndTick)) continue;
        const timeSec = (absTick - effectiveStartTick) * secPerSixteenth;
        const clickMeta = eventByPosition.get(pos) ?? {
          shouldClick: false,
          clickVolume: 0,
          clickPlaybackRate: 1,
          shouldVoice: false,
          voiceVolume: 0,
          shouldDrum: false,
          drumVolume: 0,
          subdivDurationSec: gridSubdivSec,
        };
        this.metronomeEvents.push({
          timeSec,
          measureIndex,
          positionInMeasure: pos,
          isDownbeat: pos === 0,
          shouldClick: clickMeta.shouldClick,
          clickVolume: clickMeta.clickVolume,
          clickPlaybackRate: clickMeta.clickPlaybackRate,
          shouldVoice: clickMeta.shouldVoice ?? false,
          voiceSampleId: clickMeta.voiceSampleId,
          voiceVolume: clickMeta.voiceVolume ?? 0,
          shouldDrum: clickMeta.shouldDrum ?? false,
          drumSound: clickMeta.drumSound,
          drumVolume: clickMeta.drumVolume ?? 0,
          subdivDurationSec: clickMeta.subdivDurationSec ?? gridSubdivSec,
        });
      }

      let measureTicks = 0;
      measure.notes.forEach(note => { measureTicks += note.durationInSixteenths; });
      measureStartTick += measureTicks;
    });
  }

  private getLoopTiming(): {
    secPerSixteenth: number;
    effectiveStartTick: number;
    effectiveEndTick: number;
  } | null {
    if (!this.currentRhythm) return null;

    const rhythm = this.currentRhythm;
    const bpm = this.currentBpm;
    const secPerSixteenth = 60 / bpm / 4;

    const unrolledMeasures = unrollMeasures(rhythm);
    let totalTicks = 0;
    unrolledMeasures.forEach(({ measure }) => {
      measure.notes.forEach(note => { totalTicks += note.durationInSixteenths; });
    });

    const effectiveStartTick = this.tickRange ? this.tickRange.startTick : 0;
    const effectiveEndTick = this.tickRange ? Math.min(this.tickRange.endTick, totalTicks) : totalTicks;

    return { secPerSixteenth, effectiveStartTick, effectiveEndTick };
  }

  private resyncMetronomeEventIndexFromNow(): void {
    const ctx = audioPlayer.getAudioContext();
    if (!ctx) {
      this.metronomeEventIndex = 0;
      return;
    }

    const elapsed = Math.max(0, ctx.currentTime - this.audioStartTimeSec);
    this.metronomeEventIndex = 0;
    while (
      this.metronomeEventIndex < this.metronomeEvents.length &&
      this.metronomeEvents[this.metronomeEventIndex].timeSec < elapsed
    ) {
      this.metronomeEventIndex++;
    }
  }

  /**
   * rAF tick: schedule events whose AudioContext time falls within the
   * look-ahead window.
   */
  private tick = (): void => {
    if (!this.isPlaying) return;

    const ctx = audioPlayer.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const lookAhead = this.getLookAheadSec();
    const horizon = now + lookAhead;

    const gap = now - this.scheduledUpToSec;
    if (gap > lookAhead * 2) {
      while (this.noteEventIndex < this.noteEvents.length) {
        const evt = this.noteEvents[this.noteEventIndex];
        if (this.audioStartTimeSec + evt.timeSec > now) break;
        this.noteEventIndex++;
      }
      while (this.metronomeEventIndex < this.metronomeEvents.length) {
        const evt = this.metronomeEvents[this.metronomeEventIndex];
        if (this.audioStartTimeSec + evt.timeSec > now) break;
        this.metronomeEventIndex++;
      }
      this.scheduledUpToSec = now;
    }

    // --- schedule note events ---
    while (this.noteEventIndex < this.noteEvents.length) {
      const evt = this.noteEvents[this.noteEventIndex];
      const audioTime = this.audioStartTimeSec + evt.timeSec;

      if (audioTime > horizon) break;

      if (audioTime >= this.scheduledUpToSec) {
        if (!evt.isTiedFrom) {
          if (evt.sound !== 'rest') {
            audioPlayer.stopAllDrumSounds(audioTime);
          }
          audioPlayer.playNowIfReady(evt.sound, evt.volume, evt.fadeDuration, audioTime);
        }

        const delayMs = Math.max(0, (audioTime - now) * 1000);
        const { measureIndex, noteIndex, repeatIteration, repeatCount } = evt;
        this.scheduler.scheduleCallback(delayMs, () => {
          if (!this.isPlaying) return;
          this.onNotePlay?.(measureIndex, noteIndex, repeatIteration, repeatCount);
        });
      }

      this.noteEventIndex++;
    }

    // --- schedule metronome events ---
    while (this.metronomeEventIndex < this.metronomeEvents.length) {
      const evt = this.metronomeEvents[this.metronomeEventIndex];
      const audioTime = this.audioStartTimeSec + evt.timeSec;

      if (audioTime > horizon) break;

      if (audioTime >= this.scheduledUpToSec) {
        if (this.metronomeEnabled && evt.shouldClick) {
          audioPlayer.playClickNowIfReady(evt.clickVolume, audioTime, evt.clickPlaybackRate);
        }
        if (this.metronomeEnabled && evt.shouldVoice && evt.voiceSampleId && ctx) {
          scheduleVoiceSampleOnContext(
            ctx,
            this.voicePack,
            evt.voiceSampleId,
            audioTime,
            evt.voiceVolume,
            evt.subdivDurationSec,
            (source) => {
              this.voiceSources.push(source);
            },
          );
        }
        if (this.metronomeEnabled && evt.shouldDrum && evt.drumSound) {
          audioPlayer.playNowIfReady(evt.drumSound, evt.drumVolume, evt.subdivDurationSec, audioTime);
        }

        const delayMs = Math.max(0, (audioTime - now) * 1000);
        const { measureIndex, positionInMeasure, isDownbeat } = evt;
        this.scheduler.scheduleCallback(delayMs, () => {
          if (!this.isPlaying) return;
          this.onMetronomeBeat?.(measureIndex, positionInMeasure, isDownbeat);
        });
      }

      this.metronomeEventIndex++;
    }

    // Advance the watermark before the loop-boundary check so a wrap
    // can reset it to the new loop's start without being overwritten.
    this.scheduledUpToSec = Math.max(this.scheduledUpToSec, now);

    // --- loop boundary ---
    // One pattern loop occupies [audioStartTimeSec, audioStartTimeSec + loopDurationSec).
    // When BPM changes at the boundary, buildEventList() updates loopDurationSec for the *next*
    // loop — we must advance audioStartTimeSec by the *completed* loop's duration (captured before
    // rebuild), not by loopCount * newDuration (which mis-anchors and can skip or stall playback).
    const loopEndTimeSec = this.audioStartTimeSec + this.loopDurationSec;

    if (now >= loopEndTimeSec - 0.01) {
      const durationOfCompletedLoop = this.loopDurationSec;
      if (this.pendingBpm !== null && this.pendingBpm !== this.currentBpm) {
        this.currentBpm = this.pendingBpm;
        this.pendingBpm = null;
        this.buildEventList();
      }

      if (this.isLooping) {
        this.audioStartTimeSec += durationOfCompletedLoop;
        this.noteEventIndex = 0;
        this.metronomeEventIndex = 0;
        this.scheduledUpToSec = this.audioStartTimeSec;
      } else {
        this.isPlaying = false;
        this.scheduler.stop();
        this.onPlaybackEnd?.();
      }
    }
  };

  stop(): void {
    this.isPlaying = false;
    this.isLooping = false;
    this.pendingBpm = null;
    this.tickRange = null;

    this.stopHealthCheck();
    this.removeVisibilityHandler();

    this.scheduler.stop();
    this.scheduler.beginSession();

    audioPlayer.stopAll();

    this.currentRhythm = null;
    this.onNotePlay = null;
    this.onPlaybackEnd = null;
    this.noteEvents = [];
    this.metronomeEvents = [];
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Update metronome enabled state during playback
   * This allows toggling the metronome on/off while playing
   */
  setMetronomeEnabled(enabled: boolean): void {
    this.metronomeEnabled = enabled;
  }

  /**
   * Update advanced metronome prefs during playback (subdivision grid, sources, gains).
   * Rebuilds the metronome schedule from the current loop position.
   */
  async setMetronomePlaybackPrefs(prefs: RhythmMetronomePlaybackPrefs | null): Promise<void> {
    this.metronomePlaybackPrefs = prefs;

    if (!this.isPlaying || !this.currentRhythm) return;

    const ctx = audioPlayer.getAudioContext();
    if (prefs?.sourceEnabled.voice && ctx) {
      await this.voicePack.load(ctx);
    }
    if (!this.isPlaying || !this.currentRhythm) return;

    const timing = this.getLoopTiming();
    if (!timing) return;

    this.buildMetronomeEvents(timing);
    this.resyncMetronomeEventIndexFromNow();
  }

  /**
   * Update playback settings during playback
   * This allows adjusting volume and accent settings in real-time
   * Settings will apply to newly scheduled notes in the next loop iteration
   */
  setSettings(settings: PlaybackSettings): void {
    this.settings = settings;
    // Update reverb strength when settings change
    audioPlayer.setReverbStrength(settings.reverbStrength);
  }

  /**
   * Update BPM during playback - applies at the next measure boundary
   * This ensures smooth transitions without interrupting the current measure
   */
  setBpmAtMeasureBoundary(bpm: number): void {
    if (!this.isPlaying || !this.currentRhythm) {
      // Not playing - update immediately
      this.currentBpm = bpm;
      this.pendingBpm = null;
      return;
    }

    // Always update pendingBpm if it's different from the current pending value
    // This ensures rapid BPM changes are captured correctly
    if (bpm !== this.pendingBpm) {
      this.pendingBpm = bpm;
    }
  }

  /** Exposes loop transport for auxiliary look-ahead schedulers (e.g. Words backing beat). */
  getLoopTransportSnapshot(): {
    audioStartTimeSec: number;
    bpm: number;
    loopDurationSec: number;
    timeSignature: TimeSignature;
    isPlaying: boolean;
  } | null {
    if (!this.isPlaying || !this.currentRhythm) return null;
    return {
      audioStartTimeSec: this.audioStartTimeSec,
      bpm: this.currentBpm,
      loopDurationSec: this.loopDurationSec,
      timeSignature: this.currentRhythm.timeSignature,
      isPlaying: this.isPlaying,
    };
  }

}

// Singleton instance
export const rhythmPlayer = new RhythmPlayer();
