import type { ParsedRhythm, PlaybackSettings, DrumSound } from './types';
import { audioPlayer } from './drumAudioPlayer';
import {
  getDefaultBeatGrouping,
  getBeatGroupInfo,
  getSixteenthsPerMeasure,
  getBeatGroupingInSixteenths,
} from './timeSignatureUtils';
import { PlaybackScheduler } from '../playback/scheduler';
import { PreciseScheduler } from '../audio/preciseScheduler';

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
  private loopCount = 0;
  private settings: PlaybackSettings | null = null;
  private pendingBpm: number | null = null;
  private visibilityHandler: (() => void) | null = null;
  private healthCheckScheduler: PlaybackScheduler | null = null;
  private tickRange: { startTick: number; endTick: number } | null = null;
  private metronomeResolution: 'sixteenth' | 'beat' = 'sixteenth';

  private scheduledUpToSec = 0;
  private audioStartTimeSec = 0;
  private noteEvents: ScheduledNoteEvent[] = [];
  private metronomeEvents: ScheduledMetronomeEvent[] = [];
  private noteEventIndex = 0;
  private metronomeEventIndex = 0;
  private loopDurationSec = 0;

  private static readonly LOOK_AHEAD_SEC = 0.25;

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
  ): Promise<void> {
    this.stop();

    const session = this.scheduler.beginSession();

    const isAudioReady = await audioPlayer.ensureResumed();
    if (!isAudioReady) {
      console.error('Failed to initialize audio - cannot start playback');
      if (onPlaybackEnd) onPlaybackEnd();
      return;
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
    this.loopCount = 0;

    if (settings) {
      audioPlayer.setReverbStrength(settings.reverbStrength);
    }

    this.setupVisibilityHandler();
    this.startHealthCheck();

    this.buildEventList();

    const ctx = audioPlayer.getAudioContext();
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

    // --- Metronome events ---
    this.metronomeEvents = [];
    let measureStartTick = 0;

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

      const positionsToEmit = this.metronomeResolution === 'beat'
        ? Array.from(clickPositions.values()).sort((a, b) => a - b)
        : Array.from({ length: sixteenthsPerMeasure }, (_, i) => i);

      for (const pos of positionsToEmit) {
        const absTick = measureStartTick + pos;
        if (this.tickRange && (absTick < effectiveStartTick || absTick >= effectiveEndTick)) continue;
        const timeSec = (absTick - effectiveStartTick) * secPerSixteenth;
        this.metronomeEvents.push({
          timeSec,
          measureIndex,
          positionInMeasure: pos,
          isDownbeat: pos === 0,
          shouldClick: clickPositions.has(pos),
        });
      }

      let measureTicks = 0;
      measure.notes.forEach(note => { measureTicks += note.durationInSixteenths; });
      measureStartTick += measureTicks;
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

  /**
   * rAF tick: schedule events whose AudioContext time falls within the
   * look-ahead window.
   */
  private tick = (): void => {
    if (!this.isPlaying) return;

    const ctx = audioPlayer.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const horizon = now + RhythmPlayer.LOOK_AHEAD_SEC;

    // --- schedule note events ---
    while (this.noteEventIndex < this.noteEvents.length) {
      const evt = this.noteEvents[this.noteEventIndex];
      const loopOffset = this.loopCount * this.loopDurationSec;
      const audioTime = this.audioStartTimeSec + loopOffset + evt.timeSec;

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
      const loopOffset = this.loopCount * this.loopDurationSec;
      const audioTime = this.audioStartTimeSec + loopOffset + evt.timeSec;

      if (audioTime > horizon) break;

      if (audioTime >= this.scheduledUpToSec) {
        if (this.metronomeEnabled && evt.shouldClick) {
          const settings = this.settings || { metronomeVolume: 50 };
          const baseVolume = evt.isDownbeat ? 0.8 : 0.5;
          const clickVolume = baseVolume * ((settings.metronomeVolume ?? 50) / 100);
          audioPlayer.playClickNowIfReady(clickVolume, audioTime);
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
    const loopEndTimeSec = this.audioStartTimeSec + (this.loopCount + 1) * this.loopDurationSec;

    if (now >= loopEndTimeSec - 0.01) {
      if (this.pendingBpm !== null && this.pendingBpm !== this.currentBpm) {
        this.currentBpm = this.pendingBpm;
        this.pendingBpm = null;
        this.buildEventList();
      }

      if (this.isLooping) {
        this.loopCount++;
        this.noteEventIndex = 0;
        this.metronomeEventIndex = 0;
        this.scheduledUpToSec = this.audioStartTimeSec + this.loopCount * this.loopDurationSec;
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
    this.loopCount = 0;
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

}

// Singleton instance
export const rhythmPlayer = new RhythmPlayer();
