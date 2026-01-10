import { AudioPlayer } from './audioPlayer';
import type { TimeSignature } from '../rhythm/types';
import { getDefaultBeatGrouping, getBeatGroupingInSixteenths, getSixteenthsPerMeasure } from '../rhythm/timeSignatureUtils';

/**
 * Callback for when a metronome beat occurs
 * Parameters: measureIndex, positionInSixteenths, isDownbeat (true for first beat of measure)
 */
export type MetronomeCallback = (
  measureIndex: number,
  positionInSixteenths: number,
  isDownbeat: boolean
) => void;

/**
 * Standalone metronome player for playing click tracks
 * Can be synced to an external time source (like audio playback)
 */
export class MetronomePlayer {
  private audioPlayer: AudioPlayer;
  private timeoutIds: Set<number> = new Set();
  private isPlaying = false;
  private startTime = 0;
  private loopCount = 0;
  private currentBpm = 120;
  private timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
  private onBeat: MetronomeCallback | null = null;
  private onPlaybackEnd: (() => void) | null = null;
  private downbeatVolume = 0.8;
  private beatVolume = 0.5;
  private isLooping = true;
  private numMeasures = 1;

  constructor(audioPlayer: AudioPlayer) {
    this.audioPlayer = audioPlayer;
  }

  /**
   * Start playing the metronome
   * @param bpm - Beats per minute
   * @param timeSignature - Time signature
   * @param numMeasures - Number of measures to play (for looping)
   * @param onBeat - Callback for each beat
   * @param onPlaybackEnd - Callback when playback ends (if not looping)
   */
  async start(
    bpm: number,
    timeSignature: TimeSignature,
    numMeasures: number = 1,
    onBeat?: MetronomeCallback,
    onPlaybackEnd?: () => void
  ): Promise<void> {
    this.stop();

    const isReady = await this.audioPlayer.ensureResumed();
    if (!isReady) {
      console.error('Failed to initialize audio - cannot start metronome');
      if (onPlaybackEnd) onPlaybackEnd();
      return;
    }

    this.isPlaying = true;
    this.currentBpm = bpm;
    this.timeSignature = timeSignature;
    this.numMeasures = numMeasures;
    this.onBeat = onBeat || null;
    this.onPlaybackEnd = onPlaybackEnd || null;
    this.startTime = performance.now();
    this.loopCount = 0;

    this.scheduleMetronome();
  }

  /**
   * Schedule metronome clicks for all measures
   */
  private scheduleMetronome(): void {
    if (!this.isPlaying) return;

    const bpm = this.currentBpm;
    const msPerSixteenth = 60000 / bpm / 4;
    const sixteenthsPerMeasure = getSixteenthsPerMeasure(this.timeSignature);
    const beatGrouping = getDefaultBeatGrouping(this.timeSignature);
    const beatGroupingInSixteenths = getBeatGroupingInSixteenths(beatGrouping, this.timeSignature);

    // Calculate total loop duration
    const totalLoopDuration = this.numMeasures * sixteenthsPerMeasure * msPerSixteenth;
    const loopStartOffset = this.loopCount * totalLoopDuration;
    const now = performance.now();

    // Schedule clicks for each measure
    for (let measureIndex = 0; measureIndex < this.numMeasures; measureIndex++) {
      const measureStartOffset = measureIndex * sixteenthsPerMeasure * msPerSixteenth;

      // Calculate beat positions for this measure
      const beatPositions: { position: number; isDownbeat: boolean }[] = [{ position: 0, isDownbeat: true }];

      let cumulativePosition = 0;
      beatGroupingInSixteenths.forEach(groupSize => {
        cumulativePosition += groupSize;
        if (cumulativePosition < sixteenthsPerMeasure) {
          beatPositions.push({ position: cumulativePosition, isDownbeat: false });
        }
      });

      // Schedule each beat
      beatPositions.forEach(({ position, isDownbeat }) => {
        const beatTimeInMeasure = position * msPerSixteenth;
        const absoluteTime = loopStartOffset + measureStartOffset + beatTimeInMeasure;
        const delay = Math.max(0, this.startTime + absoluteTime - now);

        const timeoutId = window.setTimeout(() => {
          this.timeoutIds.delete(timeoutId);
          if (!this.isPlaying) return;

          // Play click
          const volume = isDownbeat ? this.downbeatVolume : this.beatVolume;
          this.audioPlayer.playClick(volume);

          // Notify callback
          if (this.onBeat) {
            this.onBeat(measureIndex, position, isDownbeat);
          }
        }, delay);

        this.timeoutIds.add(timeoutId);
      });
    }

    // Schedule next loop or end
    const absoluteEndTime = loopStartOffset + totalLoopDuration;
    const endDelay = Math.max(0, this.startTime + absoluteEndTime - now);

    const endTimeoutId = window.setTimeout(() => {
      this.timeoutIds.delete(endTimeoutId);
      if (!this.isPlaying) return;

      if (this.isLooping) {
        this.loopCount++;
        this.scheduleMetronome();
      } else {
        this.isPlaying = false;
        if (this.onPlaybackEnd) {
          this.onPlaybackEnd();
        }
      }
    }, endDelay);

    this.timeoutIds.add(endTimeoutId);
  }

  /**
   * Stop the metronome
   */
  stop(): void {
    this.isPlaying = false;
    this.timeoutIds.forEach(id => window.clearTimeout(id));
    this.timeoutIds.clear();
    this.onBeat = null;
    this.onPlaybackEnd = null;
    this.loopCount = 0;
  }

  /**
   * Set whether to loop
   */
  setLooping(loop: boolean): void {
    this.isLooping = loop;
  }

  /**
   * Set volumes
   */
  setVolumes(downbeat: number, beat: number): void {
    this.downbeatVolume = Math.max(0, Math.min(1, downbeat));
    this.beatVolume = Math.max(0, Math.min(1, beat));
  }

  /**
   * Update BPM during playback (applies on next loop)
   */
  setBpm(bpm: number): void {
    this.currentBpm = bpm;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
