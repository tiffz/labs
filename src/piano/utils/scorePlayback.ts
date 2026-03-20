import type { PianoScore } from '../types';
import { DURATION_BEATS, midiToFrequency } from '../types';
import { PianoSynthesizer, SampledPiano, SimpleSynthesizer, type WaveformType } from '../../shared/playback/instruments';
import type { Instrument } from '../../shared/playback/instruments';
import type { SoundType } from '../../chords/types/soundOptions';
import { recordNoteExpectedTime, clearExpectedTimes, refreshHeldNotes } from './practiceTimingStore';
import clickSoundUrl from '../../drums/assets/sounds/click.mp3';

interface NoteEvent {
  partId: string;
  noteId: string;
  measureIndex: number;
  noteIndex: number;
  beatPosition: number;
  pitches: number[];
  duration: number;
  rest: boolean;
}

type PositionCallback = (
  beat: number,
  measureIndex: number,
  noteIndices: Map<string, number>,
  isPlaying: boolean,
) => void;

export class ScorePlaybackEngine {
  private audioContext: AudioContext | null = null;
  private instrument: Instrument | null = null;
  private metronomeEnabled = false;
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
  private clickBuffer: AudioBuffer | null = null;
  private clickLoadingPromise: Promise<void> | null = null;
  private scheduledClickTimes = new Set<number>();
  private lastClickAudioTime = -1;
  private onEndCallback: (() => void) | null = null;
  private currentScore: PianoScore | null = null;
  private loopEnabled = false;
  private onLoopCallback: (() => void) | null = null;
  private generation = 0;
  private masterVolume = 1;
  private metronomeVolume = 0.7;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  async loadClickSound(): Promise<void> {
    if (this.clickBuffer) return;
    if (this.clickLoadingPromise) return this.clickLoadingPromise;
    this.clickLoadingPromise = (async () => {
      try {
        const ctx = this.getAudioContext();
        const response = await fetch(clickSoundUrl);
        const arrayBuffer = await response.arrayBuffer();
        this.clickBuffer = await ctx.decodeAudioData(arrayBuffer);
      } catch (e) {
        console.error('Failed to load click sound:', e);
      }
    })();
    return this.clickLoadingPromise;
  }

  private createInstrument(soundType: SoundType): Instrument {
    const ctx = this.getAudioContext();
    if (soundType === 'piano-sampled') {
      if (!this.sampledPiano) {
        this.sampledPiano = new SampledPiano(ctx);
      }
      this.sampledPiano.connect(ctx.destination);
      return this.sampledPiano;
    }
    if (soundType === 'piano') {
      const inst = new PianoSynthesizer(ctx);
      inst.connect(ctx.destination);
      return inst;
    }
    const waveMap: Record<string, WaveformType> = {
      sine: 'sine', square: 'square', sawtooth: 'sawtooth', triangle: 'triangle',
    };
    const inst = new SimpleSynthesizer(ctx, waveMap[soundType] || 'sine');
    inst.connect(ctx.destination);
    return inst;
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
      if (!this.sampledPiano) {
        this.sampledPiano = new SampledPiano(ctx);
      }
      this.sampledPiano.connect(ctx.destination);
      if (progressCallback) {
        this.sampledPiano.setLoadingProgressCallback(progressCallback);
      }
      await this.sampledPiano.loadSamples();
      this.instrument = this.sampledPiano;
    } else {
      this.instrument = this.createInstrument(soundType);
    }
  }

  private buildEvents(score: PianoScore): NoteEvent[] {
    const events: NoteEvent[] = [];
    for (const part of score.parts) {
      let beatPos = 0;
      for (let mi = 0; mi < part.measures.length; mi++) {
        const measure = part.measures[mi];
        for (let ni = 0; ni < measure.notes.length; ni++) {
          const note = measure.notes[ni];
          const dur = DURATION_BEATS[note.duration] * (note.dotted ? 1.5 : 1);
          events.push({
            partId: part.id,
            noteId: note.id,
            measureIndex: mi,
            noteIndex: ni,
            beatPosition: beatPos,
            pitches: note.pitches,
            duration: dur,
            rest: !!note.rest,
          });
          beatPos += dur;
        }
      }
    }
    return events.sort((a, b) => a.beatPosition - b.beatPosition);
  }

  async playCountIn(tempo: number): Promise<void> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    await this.loadClickSound();

    const startBuffer = 0.15;
    const msPerBeat = 60000 / tempo;
    const secPerBeat = msPerBeat / 1000;

    for (let i = 0; i < 4; i++) {
      const time = ctx.currentTime + startBuffer + i * secPerBeat;
      this.playClickAt(time, i === 0);
    }

    return new Promise<void>((resolve) => {
      setTimeout(resolve, startBuffer * 1000 + 4 * msPerBeat);
    });
  }

  private playClickAt(time: number, isDownbeat: boolean) {
    const ctx = this.audioContext;
    if (!ctx) return;

    if (this.clickBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = this.clickBuffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime((isDownbeat ? 0.8 : 0.4) * this.metronomeVolume * this.masterVolume, time);
      source.playbackRate.value = isDownbeat ? 1.3 : 1.0;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      source.start(time);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = isDownbeat ? 1500 : 1000;
      gain.gain.value = 0.15 * this.metronomeVolume * this.masterVolume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      gain.gain.setTargetAtTime(0, time + 0.03, 0.01);
      osc.stop(time + 0.08);
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
    this.generation++;
    const myGen = this.generation;

    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    if (this.generation !== myGen) return;

    await this.loadClickSound();
    if (this.generation !== myGen) return;

    this.instrument = this.createInstrument(soundType);

    if (soundType === 'piano-sampled' && this.sampledPiano && !this.sampledPiano.isReady()) {
      await this.sampledPiano.loadSamples();
      if (this.generation !== myGen) return;
    }

    this.events = this.buildEvents(score);
    this.positionCallback = callback;
    this.onEndCallback = onEnd || null;
    this.currentScore = score;
    this.scheduledUpTo = -1;
    this.scheduledClickTimes.clear();
    this.lastClickAudioTime = -1;
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

    this.tick();
  }

  private tick = () => {
    if (!this.playing || !this.audioContext) return;
    const now = this.audioContext.currentTime;
    const elapsed = now - this.startTime;
    const currentBeat = elapsed * (this.tempo / 60);

    if (currentBeat >= this.totalBeats) {
      if (this.loopEnabled) {
        clearExpectedTimes();
        refreshHeldNotes(performance.now());
        const secPerBeat = 60 / this.tempo;
        this.startTime += this.totalBeats * secPerBeat;
        this.scheduledUpTo = -1;
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

    const lookAhead = 0.2;
    const lookAheadBeats = lookAhead * (this.tempo / 60);
    const scheduleUpTo = currentBeat + lookAheadBeats;

    if (this.metronomeEnabled) {
      const { numerator, denominator } = this.currentScore?.timeSignature ?? { numerator: 4, denominator: 4 };
      const beatsPerClick = 4 / denominator;
      const secPerBeat = 60 / this.tempo;
      const firstBeat = Math.ceil(Math.max(this.scheduledUpTo, 0) / beatsPerClick) * beatsPerClick;
      for (let b = firstBeat; b <= scheduleUpTo; b += beatsPerClick) {
        if (b < 0) continue;
        if (this.loopEnabled && b >= this.totalBeats) continue;
        const audioTime = this.startTime + b * secPerBeat;
        const timeKey = Math.round(audioTime * 1000);
        if (this.scheduledClickTimes.has(timeKey)) continue;
        if (this.lastClickAudioTime >= 0 && (audioTime - this.lastClickAudioTime) < 0.05) continue;
        this.scheduledClickTimes.add(timeKey);
        this.lastClickAudioTime = audioTime;
        const beatInMeasure = (b / beatsPerClick) % numerator;
        this.playClickAt(audioTime, Math.abs(beatInMeasure) < 0.01);
      }

      // Prune old click times to prevent unbounded growth during long loops
      if (this.scheduledClickTimes.size > 200) {
        const cutoff = Math.round((now - 2) * 1000);
        for (const t of this.scheduledClickTimes) {
          if (t < cutoff) this.scheduledClickTimes.delete(t);
        }
      }
    }

    for (const event of this.events) {
      if (event.beatPosition <= this.scheduledUpTo) continue;
      if (event.beatPosition > scheduleUpTo) break;

      if (!event.rest && event.pitches.length > 0) {
        const muted = this.trackMuted.get(event.partId) ?? false;
        if (!muted && this.instrument) {
          const volume = this.trackVolume.get(event.partId) ?? 1;
          const audioTime = this.startTime + event.beatPosition * (60 / this.tempo);
          const durSec = event.duration * (60 / this.tempo);
          for (const midi of event.pitches) {
            this.instrument.playNote({
              frequency: midiToFrequency(midi),
              startTime: audioTime,
              duration: durSec * 0.9,
              velocity: 0.7 * volume * this.masterVolume,
            });
          }
        }
      }
    }
    if (scheduleUpTo > this.scheduledUpTo) this.scheduledUpTo = scheduleUpTo;

    let curMeasure = 0;
    const noteIndices = new Map<string, number>();
    const perfNow = performance.now();
    const secPerBeat = 60 / this.tempo;
    for (const event of this.events) {
      if (event.beatPosition > currentBeat) break;
      const endBeat = event.beatPosition + event.duration;
      if (currentBeat >= event.beatPosition && currentBeat < endBeat) {
        curMeasure = event.measureIndex;
        noteIndices.set(event.partId, event.noteIndex);
        if (!event.rest) {
          const audioTimeForNote = this.startTime + event.beatPosition * secPerBeat;
          const wallTimeMs = perfNow + (audioTimeForNote - now) * 1000;
          recordNoteExpectedTime(event.noteId, wallTimeMs);
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
  setTrackMuted(partId: string, muted: boolean) { this.trackMuted.set(partId, muted); }
  setTrackVolume(partId: string, volume: number) { this.trackVolume.set(partId, volume); }
  setTempo(tempo: number) { this.tempo = tempo; }
  setMasterVolume(volume: number) { this.masterVolume = volume; }
  setMetronomeVolume(volume: number) { this.metronomeVolume = volume; }

  playNote(midi: number, duration = 0.3) {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
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
