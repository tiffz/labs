import type { PianoScore, ScoreNote } from '../music/scoreTypes';
import { midiToFrequency, durationToBeats } from '../music/scoreTypes';
import { PianoSynthesizer, SampledPiano } from './instruments';
import type { Instrument } from './instruments';
import type { SoundType } from '../music/soundOptions';
import { recordNoteExpectedTime, clearExpectedTimes, refreshHeldNotes } from '../practice/practiceTimingStore';
import { CLICK_SAMPLE_URL } from '../audio/drumSampleUrls';
import { createManagedAudioContext, ensureAudioContextRunning, primeAudioContext } from './audioContextLifecycle';
import { createInstrumentForSoundType } from './instrumentFactory';
import { loadClickSample, playClickSampleAt, type LoadedClickSample } from '../audio/clickService';
import {
  scheduleClicksInBeatRange,
  slotsPerQuarterBeat,
  type MetronomeClickMode,
  type ScheduledClick,
} from '../audio/metronome/subdivisionClickSchedule';

/** Interface for variable-tempo beat mapping (e.g. from video sync). */
export interface BeatMap {
  timeToBeat(elapsed: number): number;
  beatToTime(beat: number): number;
}

interface TieContinuation {
  noteId: string;
  measureIndex: number;
  noteIndex: number;
  beatOffset: number;
}

interface NoteEvent {
  partId: string;
  noteId: string;
  measureIndex: number;
  noteIndex: number;
  beatPosition: number;
  pitches: number[];
  duration: number;
  rest: boolean;
  continuations?: TieContinuation[];
}

type PositionCallback = (
  beat: number,
  measureIndex: number,
  noteIndices: Map<string, number>,
  isPlaying: boolean,
) => void;

/**
 * Resolve the actual playback order of measures, handling repeats,
 * voltas, and D.S. al Coda navigation.  Used by both the playback
 * engine and the video-to-score correlation.
 */
export function resolvePlaybackOrder(score: PianoScore): number[] {
  const nav = score.navigation;
  const measureCount = Math.max(...score.parts.map(p => p.measures.length), 0);
  if (measureCount === 0) return [];

  const repeats = nav?.repeats ?? [];
  const voltas = nav?.voltas ?? [];

  const forwardMap = new Map<number, true>();
  const backwardMap = new Map<number, number>();
  for (const r of repeats) {
    if (r.direction === 'forward') forwardMap.set(r.measureIndex, true);
    if (r.direction === 'backward') backwardMap.set(r.measureIndex, r.times ?? 2);
  }

  const voltasByMeasure = new Map<number, number>();
  for (const v of voltas) {
    for (let m = v.startMeasure; m <= v.endMeasure; m++) {
      voltasByMeasure.set(m, v.endingNumber);
    }
  }

  const hasSimpleRepeats = repeats.length > 0;
  const hasDSAlCoda = nav?.dalsegnoMeasure !== undefined;

  if (!nav || (!hasSimpleRepeats && !hasDSAlCoda)) {
    const order: number[] = [];
    for (let i = 0; i < measureCount; i++) order.push(i);
    return order;
  }

  // Phase 1: Handle simple repeats and voltas
  const expandedOrder: number[] = [];
  let i = 0;
  let repeatStart = 0;
  const repeatCountUsed = new Map<number, number>();

  while (i < measureCount) {
    if (forwardMap.has(i)) repeatStart = i;

    const voltaNum = voltasByMeasure.get(i);
    const timesUsed = repeatCountUsed.get(repeatStart) ?? 0;
    const pass = timesUsed + 1;

    if (voltaNum !== undefined && voltaNum !== pass) {
      i++;
      continue;
    }

    expandedOrder.push(i);

    if (backwardMap.has(i)) {
      const totalTimes = backwardMap.get(i)!;
      const used = (repeatCountUsed.get(repeatStart) ?? 0) + 1;
      if (used < totalTimes) {
        repeatCountUsed.set(repeatStart, used);
        i = repeatStart;
        continue;
      } else {
        repeatCountUsed.set(repeatStart, used);
      }
    }

    i++;
  }

  // Phase 2: Handle D.S. al Coda on the expanded order
  if (!hasDSAlCoda) return expandedOrder;

  const segno = nav!.segnoMeasure ?? 0;
  const tocoda = nav!.tocodaMeasure ?? nav!.dalsegnoMeasure!;
  const coda = nav!.codaMeasure ?? measureCount;
  const ds = nav!.dalsegnoMeasure!;

  const order: number[] = [];

  for (const m of expandedOrder) {
    order.push(m);
    if (m === ds) break;
  }

  for (let m = segno; m <= tocoda && m < measureCount; m++) {
    order.push(m);
  }

  for (let m = coda; m < measureCount; m++) {
    order.push(m);
  }

  return order;
}

export class ScorePlaybackEngine {
  private audioContext: AudioContext | null = null;
  private instrument: Instrument | null = null;
  private metronomeEnabled = false;
  private metronomeClickMode: MetronomeClickMode = 'beat';
  private metronomeSubdivision: 'eighth' | 'triplet' | 'sixteenth' = 'eighth';
  private playing = false;
  private animFrameId: number | null = null;
  private events: NoteEvent[] = [];
  private scheduledUpTo = -1;
  private startTime = 0;
  private tempo = 80;
  private totalBeats = 0;
  private positionCallback: PositionCallback | null = null;
  private trackMuted = new Map<string, boolean>();
  private trackVolume = new Map<string, number>();
  private sampledPiano: SampledPiano | null = null;
  private clickSample: LoadedClickSample | null = null;
  private clickLoadingPromise: Promise<void> | null = null;
  /** Beat-position keys for clicks already sent to Web Audio (avoids time-collision dedup). */
  private scheduledClickBeatKeys = new Set<number>();
  /** Metronome look-ahead cursor — separate from note `scheduledUpTo` so tab-gap catch-up does not skip subdivisions. */
  private metronomeScheduledUpTo = -1;
  private countInGeneration = 0;
  private onEndCallback: (() => void) | null = null;
  private currentScore: PianoScore | null = null;
  private loopEnabled = false;
  private onLoopCallback: (() => void) | null = null;
  private generation = 0;
  private masterVolume = 1;
  private metronomeVolume = 0.7;
  private drumBuffers = new Map<string, AudioBuffer>();
  private drumCallback: ((scheduledUpTo: number, scheduleEnd: number, startTime: number, tempo: number, audioCtx: AudioContext) => void) | null = null;
  private drumScheduledUpTo = -1;
  private smartBeatMap: BeatMap | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const managed = createManagedAudioContext({ latencyHint: 'interactive' });
      this.audioContext = managed.context;
    }
    return this.audioContext;
  }

  /** Call synchronously from a click/tap handler before awaited playback setup. */
  primeAudioContext(): void {
    primeAudioContext(this.getAudioContext());
  }

  async loadClickSound(): Promise<void> {
    if (this.clickSample) return;
    if (this.clickLoadingPromise) return this.clickLoadingPromise;
    this.clickLoadingPromise = (async () => {
      try {
        const ctx = this.getAudioContext();
        const loaded = await loadClickSample(ctx, CLICK_SAMPLE_URL);
        this.clickSample = loaded;
      } catch (e) {
        console.error('Failed to load click sound:', e);
      }
    })();
    return this.clickLoadingPromise;
  }

  private compressor: DynamicsCompressorNode | null = null;

  private getOutputNode(): AudioNode {
    const ctx = this.getAudioContext();
    if (!this.compressor) {
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.15;
      this.compressor.connect(ctx.destination);
    }
    return this.compressor;
  }

  private createInstrument(soundType: SoundType): Instrument {
    const ctx = this.getAudioContext();
    const output = this.getOutputNode();
    if (soundType === 'piano-sampled' && !this.sampledPiano) {
      this.sampledPiano = new SampledPiano(ctx);
    }
    return createInstrumentForSoundType({
      soundType,
      context: ctx,
      output,
      sampledPiano: this.sampledPiano,
    });
  }

  /**
   * Pre-load a sound type. For sampled piano, this triggers sample download.
   */
  async prepareSoundType(
    soundType: SoundType,
    progressCallback?: (loaded: number, total: number) => void,
  ): Promise<void> {
    if (soundType === 'piano-sampled') {
      const ctx = this.getAudioContext();
      const output = this.getOutputNode();
      if (!this.sampledPiano) {
        this.sampledPiano = new SampledPiano(ctx);
      }
      this.sampledPiano.connect(output);
      if (progressCallback) {
        this.sampledPiano.setLoadingProgressCallback(progressCallback);
      }
      await this.sampledPiano.loadSamples();
      this.instrument = this.sampledPiano;
    } else {
      this.instrument = this.createInstrument(soundType);
    }
  }

  private getNoteDurationBeats(note: ScoreNote): number {
    let dur = durationToBeats(note.duration, note.dotted);
    if (note.tuplet) {
      dur = dur * (note.tuplet.normal / note.tuplet.actual);
    }
    return dur;
  }

  private resolvePlaybackOrder(score: PianoScore): number[] {
    return resolvePlaybackOrder(score);
  }

  private buildEvents(score: PianoScore): NoteEvent[] {
    const events: NoteEvent[] = [];
    const playbackOrder = this.resolvePlaybackOrder(score);
    const beatsPerMeasure = score.timeSignature.numerator *
      (4 / score.timeSignature.denominator);

    for (const part of score.parts) {
      let beatPos = 0;
      const tieExtend = new Map<number, NoteEvent>();

      for (let orderIdx = 0; orderIdx < playbackOrder.length; orderIdx++) {
        const mi = playbackOrder[orderIdx];
        if (mi >= part.measures.length) continue;
        const measure = part.measures[mi];
        const measureStart = beatPos;
        let measureBeats = 0;

        for (let ni = 0; ni < measure.notes.length; ni++) {
          const note = measure.notes[ni];
          if (note.grace) continue;

          const dur = this.getNoteDurationBeats(note);

          if (note.tieStop) {
            for (const pitch of note.pitches) {
              const prev = tieExtend.get(pitch);
              if (prev) {
                if (!prev.continuations) prev.continuations = [];
                prev.continuations.push({
                  noteId: note.id,
                  measureIndex: mi,
                  noteIndex: ni,
                  beatOffset: prev.duration,
                });
                prev.duration += dur;
                if (!note.tieStart) tieExtend.delete(pitch);
              }
            }
            beatPos += dur;
            measureBeats += dur;
            continue;
          }

          const event: NoteEvent = {
            partId: part.id,
            noteId: note.id,
            measureIndex: mi,
            noteIndex: ni,
            beatPosition: beatPos,
            pitches: note.pitches,
            duration: dur,
            rest: !!note.rest,
          };
          events.push(event);

          if (note.tieStart) {
            for (const pitch of note.pitches) {
              tieExtend.set(pitch, event);
            }
          }

          beatPos += dur;
          measureBeats += dur;
        }

        // Force exact beatsPerMeasure for every full measure to prevent
        // inter-part beat drift from floating-point accumulation.
        // Only allow a shorter duration for genuine pickup measures
        // (first in playback order with fewer beats than a full measure).
        const isPickup = orderIdx === 0 && measureBeats > 0
          && measureBeats < beatsPerMeasure - 0.01;
        beatPos = measureStart + (isPickup ? measureBeats : beatsPerMeasure);
      }
    }
    return events.sort((a, b) => a.beatPosition - b.beatPosition);
  }

  async playCountIn(
    tempo: number,
    options?: {
      clickMode?: MetronomeClickMode;
      subdivision?: 'eighth' | 'triplet' | 'sixteenth';
      timeSignature?: { numerator: number; denominator: number };
    },
  ): Promise<void> {
    const countInGen = ++this.countInGeneration;
    const ctx = this.getAudioContext();
    await ensureAudioContextRunning(ctx);
    if (countInGen !== this.countInGeneration) return;
    await this.loadClickSound();
    await ensureAudioContextRunning(ctx);
    if (countInGen !== this.countInGeneration) return;

    const clickMode = options?.clickMode ?? this.metronomeClickMode;
    const subdivision = options?.subdivision ?? this.metronomeSubdivision;
    const timeSignature = options?.timeSignature ?? { numerator: 4, denominator: 4 };

    const startBuffer = 0.15;
    const secPerBeat = 60 / tempo;
    const countInBeats = clickMode === 'subdivision' ? timeSignature.numerator : 4;

    const scheduled = scheduleClicksInBeatRange({
      startBeat: 0,
      endBeat: countInBeats,
      clickMode,
      subdivision,
      timeSignature,
    });

    const countInBeatKeys = new Set<number>();
    for (const click of scheduled) {
      if (countInGen !== this.countInGeneration) return;
      const beatKey = this.clickBeatKey(click.beatPosition);
      if (countInBeatKeys.has(beatKey)) continue;
      countInBeatKeys.add(beatKey);
      const time = ctx.currentTime + startBuffer + click.beatPosition * secPerBeat;
      this.playClickAt(
        time,
        click.subdivision === 'accent',
        click.volume * 0.7,
        click.playbackRate,
      );
    }

    const resolveAt = ctx.currentTime + startBuffer + countInBeats * secPerBeat;
    await new Promise<void>((resolve) => {
      const wait = () => {
        if (countInGen !== this.countInGeneration) {
          resolve();
          return;
        }
        if (!this.audioContext) {
          resolve();
          return;
        }
        if (this.audioContext.currentTime >= resolveAt) resolve();
        else requestAnimationFrame(wait);
      };
      wait();
    });
  }

  private clickBeatKey(beatPosition: number): number {
    return Math.round(beatPosition * 10000);
  }

  private recordExpectedAtBeat(now: number, noteId: string, beatPosition: number): void {
    const audioTime = this.startTime + this.beatToElapsed(beatPosition);
    const wallTimeMs = performance.now() + (audioTime - now) * 1000;
    recordNoteExpectedTime(noteId, wallTimeMs);
  }

  private scheduleMetronomeClick(click: ScheduledClick): void {
    const b = click.beatPosition;
    if (b >= this.totalBeats) return;
    const beatKey = this.clickBeatKey(b);
    if (this.scheduledClickBeatKeys.has(beatKey)) return;
    this.scheduledClickBeatKeys.add(beatKey);
    const audioTime = this.startTime + this.beatToElapsed(b);
    this.playClickAt(
      audioTime,
      click.subdivision === 'accent',
      click.volume,
      click.playbackRate,
    );
  }

  /** Pre-schedule every click on the Web Audio clock (immune to rAF throttling). */
  private preScheduleMetronomeClicks(): void {
    if (!this.metronomeEnabled || !this.currentScore) return;
    const { numerator, denominator } = this.currentScore.timeSignature;
    const scheduled = scheduleClicksInBeatRange({
      startBeat: 0,
      endBeat: this.totalBeats,
      clickMode: this.metronomeClickMode,
      subdivision: this.metronomeSubdivision,
      timeSignature: { numerator, denominator },
    });
    for (const click of scheduled) {
      this.scheduleMetronomeClick(click);
    }
    this.metronomeScheduledUpTo = this.totalBeats;
  }

  private playClickAt(
    time: number,
    isDownbeat: boolean,
    volumeScale = 1,
    playbackRate = 1,
  ) {
    const ctx = this.audioContext;
    if (!ctx) return;

    const at = Math.max(time, ctx.currentTime + 0.002);

    if (this.clickSample) {
      playClickSampleAt(
        ctx,
        this.clickSample,
        at,
        (isDownbeat ? 0.8 : 0.4) * volumeScale * this.metronomeVolume * this.masterVolume,
        playbackRate,
      );
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = isDownbeat ? 1500 : 1000;
      gain.gain.value = 0.15 * this.metronomeVolume * this.masterVolume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      gain.gain.setTargetAtTime(0, at + 0.03, 0.01);
      osc.stop(at + 0.08);
    }
  }

  setLoop(enabled: boolean) { this.loopEnabled = enabled; }
  setLoopCallback(cb: (() => void) | null) { this.onLoopCallback = cb; }

  async start(
    score: PianoScore,
    soundType: SoundType,
    callback: PositionCallback,
    onEnd?: () => void,
  ): Promise<void> {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.generation++;
    const myGen = this.generation;

    this.primeAudioContext();
    const ctx = this.getAudioContext();
    const running = await ensureAudioContextRunning(ctx);
    if (!running || this.generation !== myGen) return;

    await this.loadClickSound();
    if (this.generation !== myGen) return;

    this.instrument = this.createInstrument(soundType);

    if (soundType === 'piano-sampled' && this.sampledPiano && !this.sampledPiano.isReady()) {
      await this.sampledPiano.loadSamples();
      if (this.generation !== myGen) return;
    }

    if (!(await ensureAudioContextRunning(ctx)) || this.generation !== myGen) return;

    this.events = this.buildEvents(score);
    this.positionCallback = callback;
    this.onEndCallback = onEnd || null;
    this.currentScore = score;
    this.scheduledUpTo = -1;
    this.drumScheduledUpTo = -1;
    this.metronomeScheduledUpTo = -1;
    this.scheduledClickBeatKeys.clear();
    clearExpectedTimes();
    refreshHeldNotes(performance.now());
    this.playing = true;
    this.startTime = ctx.currentTime;

    let maxBeat = 0;
    for (const e of this.events) {
      const end = e.beatPosition + e.duration;
      if (end > maxBeat) maxBeat = end;
    }
    this.totalBeats = maxBeat;

    if (this.metronomeEnabled && !this.smartBeatMap) {
      this.preScheduleMetronomeClicks();
    }

    this.tick();
  }

  /** Convert elapsed seconds to beat position (variable or fixed tempo). */
  private elapsedToBeat(elapsed: number): number {
    if (this.smartBeatMap) return this.smartBeatMap.timeToBeat(elapsed);
    return elapsed * (this.tempo / 60);
  }

  /** Convert beat position to elapsed seconds (variable or fixed tempo). */
  private beatToElapsed(beat: number): number {
    if (this.smartBeatMap) return this.smartBeatMap.beatToTime(beat);
    return beat * (60 / this.tempo);
  }

  private tick = () => {
    if (!this.playing || !this.audioContext) return;
    const now = this.audioContext.currentTime;
    const elapsed = now - this.startTime;
    const currentBeat = this.elapsedToBeat(elapsed);

    // Skip gap when tab was backgrounded (rAF was throttled)
    const maxGapBeats = 1;
    if (this.scheduledUpTo >= 0 && currentBeat > this.scheduledUpTo + maxGapBeats) {
      this.scheduledUpTo = currentBeat;
    }

    if (currentBeat >= this.totalBeats) {
      if (this.loopEnabled) {
        clearExpectedTimes();
        refreshHeldNotes(performance.now());
        this.startTime += this.beatToElapsed(this.totalBeats);
        this.scheduledUpTo = -1;
        this.drumScheduledUpTo = -1;
        this.scheduledClickBeatKeys.clear();
        if (this.metronomeEnabled && !this.smartBeatMap) {
          this.preScheduleMetronomeClicks();
        } else {
          this.metronomeScheduledUpTo = -1;
        }
        if (this.onLoopCallback) this.onLoopCallback();
        this.animFrameId = requestAnimationFrame(this.tick);
        return;
      }

      this.playing = false;
      if (this.positionCallback) {
        this.positionCallback(currentBeat, 0, new Map(), false);
      }
      if (this.onEndCallback) {
        this.onEndCallback();
      }
      return;
    }

    const lookAhead = Math.max(0.5, 60 / this.tempo);
    const lookAheadBeat = this.elapsedToBeat(elapsed + lookAhead);
    const scheduleUpTo = lookAheadBeat;

    if (this.metronomeEnabled && this.smartBeatMap) {
      const { numerator, denominator } = this.currentScore?.timeSignature ?? { numerator: 4, denominator: 4 };
      const timeSignature = { numerator, denominator };
      const subdivision = this.metronomeSubdivision;
      const step = this.metronomeClickMode === 'beat'
        ? 1
        : 1 / slotsPerQuarterBeat(subdivision);
      const metronomeStart = Math.max(this.metronomeScheduledUpTo, 0);
      const scheduled = scheduleClicksInBeatRange({
        startBeat: metronomeStart,
        endBeat: scheduleUpTo,
        clickMode: this.metronomeClickMode,
        subdivision,
        timeSignature,
      });

      let lastScheduledBeat = this.metronomeScheduledUpTo;
      for (const click of scheduled) {
        if (click.beatPosition >= this.totalBeats) continue;
        this.scheduleMetronomeClick(click);
        lastScheduledBeat = Math.max(lastScheduledBeat, click.beatPosition);
      }
      if (scheduled.length > 0) {
        this.metronomeScheduledUpTo = lastScheduledBeat + step;
      }
    }

    if (this.drumCallback && this.audioContext) {
      this.drumCallback(
        this.drumScheduledUpTo,
        scheduleUpTo,
        this.startTime,
        this.tempo,
        this.audioContext,
      );
      this.drumScheduledUpTo = scheduleUpTo;
    }

    for (const event of this.events) {
      if (event.beatPosition <= this.scheduledUpTo) continue;
      if (event.beatPosition > scheduleUpTo) break;

      if (!event.rest && event.pitches.length > 0) {
        const muted = this.trackMuted.get(event.partId) ?? false;
        this.recordExpectedAtBeat(now, event.noteId, event.beatPosition);
        for (const cont of event.continuations ?? []) {
          const contBeat = event.beatPosition + cont.beatOffset;
          if (contBeat <= this.scheduledUpTo) continue;
          if (contBeat > scheduleUpTo) break;
          this.recordExpectedAtBeat(now, cont.noteId, contBeat);
        }
        if (!muted && this.instrument) {
          const volume = this.trackVolume.get(event.partId) ?? 1;
          const audioTime = this.startTime + this.beatToElapsed(event.beatPosition);
          const durSec = this.beatToElapsed(event.beatPosition + event.duration) - this.beatToElapsed(event.beatPosition);
          const eventEndBeat = event.beatPosition + event.duration;
          const isNearEnd = eventEndBeat >= this.totalBeats - 0.01;
          const trimmedDur = isNearEnd
            ? durSec + 1.5
            : event.duration > 4 ? durSec : durSec * 0.9;
          for (const midi of event.pitches) {
            this.instrument.playNote({
              frequency: midiToFrequency(midi),
              startTime: audioTime,
              duration: trimmedDur,
              velocity: 0.7 * volume * this.masterVolume,
            });
          }
        }
      }
    }
    if (scheduleUpTo > this.scheduledUpTo) this.scheduledUpTo = scheduleUpTo;

    let curMeasure = 0;
    const noteIndices = new Map<string, number>();
    for (const event of this.events) {
      if (event.beatPosition > currentBeat) break;
      const endBeat = event.beatPosition + event.duration;
      if (currentBeat >= event.beatPosition && currentBeat < endBeat) {
        const beatInEvent = currentBeat - event.beatPosition;
        if (event.continuations && event.continuations.length > 0) {
          let activeCont: TieContinuation | null = null;
          for (const cont of event.continuations) {
            if (beatInEvent >= cont.beatOffset) activeCont = cont;
          }
          if (activeCont) {
            curMeasure = activeCont.measureIndex;
            noteIndices.set(event.partId, activeCont.noteIndex);
          } else {
            curMeasure = event.measureIndex;
            noteIndices.set(event.partId, event.noteIndex);
          }
        } else {
          curMeasure = event.measureIndex;
          noteIndices.set(event.partId, event.noteIndex);
        }
      }
    }

    if (this.positionCallback) {
      this.positionCallback(currentBeat, curMeasure, noteIndices, true);
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  stop() {
    this.generation++;
    this.countInGeneration++;
    this.playing = false;
    this.onEndCallback = null;
    this.onLoopCallback = null;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.instrument) {
      this.instrument.stopAll(50);
      try { this.instrument.disconnect(); } catch { /* may not be connected */ }
    }
  }

  isPlaying() { return this.playing; }

  setMetronome(enabled: boolean) { this.metronomeEnabled = enabled; }
  setMetronomeClickMode(mode: MetronomeClickMode) { this.metronomeClickMode = mode; }
  setMetronomeSubdivision(subdivision: 'eighth' | 'triplet' | 'sixteenth') {
    this.metronomeSubdivision = subdivision;
  }
  setTrackMuted(partId: string, muted: boolean) { this.trackMuted.set(partId, muted); }
  setTrackVolume(partId: string, volume: number) { this.trackVolume.set(partId, volume); }
  setTempo(tempo: number) { this.tempo = tempo; }
  setMasterVolume(volume: number) { this.masterVolume = volume; }
  setMetronomeVolume(volume: number) { this.metronomeVolume = volume; }
  setSmartBeatMap(map: BeatMap | null) { this.smartBeatMap = map; }

  /**
   * Register a drum scheduling callback. Called each tick with the look-ahead window
   * so drums can be scheduled with precise Web Audio timing.
   */
  setDrumCallback(cb: typeof this.drumCallback) {
    this.drumCallback = cb;
    this.drumScheduledUpTo = -1;
  }

  /** Load a drum sound buffer into the engine's AudioContext for precise scheduling */
  async loadDrumSound(name: string, url: string): Promise<void> {
    if (this.drumBuffers.has(name)) return;
    const ctx = this.getAudioContext();
    const resp = await fetch(url);
    const ab = await resp.arrayBuffer();
    this.drumBuffers.set(name, await ctx.decodeAudioData(ab));
  }

  /** Play a drum hit at a precise Web Audio time */
  playDrumAt(soundName: string, audioTime: number, volume: number): void {
    if (soundName === 'rest') return;
    const buffer = this.drumBuffers.get(soundName);
    if (!buffer || !this.audioContext) return;
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), audioTime);
    source.connect(gain);
    gain.connect(this.audioContext.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(Math.max(audioTime, this.audioContext.currentTime));
  }

  /**
   * Tracks the last trigger time per MIDI note to debounce rapid duplicates.
   * Some controllers send redundant note-on messages within a few ms.
   */
  private midiNoteLastTrigger = new Map<number, number>();
  private static readonly MIDI_DEBOUNCE_MS = 30;

  /** Dedicated low-latency instrument for MIDI key-press sounds (bypasses compressor). */
  private midiInstrument: Instrument | null = null;

  private getMidiInstrument(): Instrument {
    if (!this.midiInstrument) {
      const ctx = this.getAudioContext();
      const inst = new PianoSynthesizer(ctx);
      inst.connect(ctx.destination);
      this.midiInstrument = inst;
    }
    return this.midiInstrument;
  }

  /**
   * Play a MIDI note with minimal latency.
   * Bypasses the compressor, debounces rapid re-triggers, and uses velocity.
   */
  playMidiNote(midi: number, velocity = 0.7) {
    const now = performance.now();
    const last = this.midiNoteLastTrigger.get(midi);
    if (last !== undefined && now - last < ScorePlaybackEngine.MIDI_DEBOUNCE_MS) {
      return;
    }
    this.midiNoteLastTrigger.set(midi, now);

    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') void ensureAudioContextRunning(ctx);

    this.getMidiInstrument().playNote({
      frequency: midiToFrequency(midi),
      startTime: ctx.currentTime,
      duration: 0.4,
      velocity: Math.min(1, velocity) * this.masterVolume,
    });
  }

  /** Clear debounce tracking for a released note so re-strikes register. */
  stopMidiNote(midi: number) {
    this.midiNoteLastTrigger.delete(midi);
  }

  /** Play a short preview note (used by non-MIDI contexts like onscreen keyboard). */
  playNote(midi: number, duration = 0.3) {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') void ensureAudioContextRunning(ctx);
    if (!this.instrument) {
      this.instrument = this.createInstrument('piano');
    }
    this.instrument.playNote({
      frequency: midiToFrequency(midi),
      startTime: ctx.currentTime,
      duration,
      velocity: 0.7 * this.masterVolume,
    });
  }
}

let instance: ScorePlaybackEngine | null = null;
export function getScorePlaybackEngine(): ScorePlaybackEngine {
  if (!instance) instance = new ScorePlaybackEngine();
  return instance;
}
