/**
 * Acoustic piano input via microphone using YIN pitch detection.
 * Provides a MIDI-like interface: onNote callbacks with noteon/noteoff events.
 */

import { detectPitch } from './pitchDetection';
import { isDebugEnabled, logDebugEvent, setSampleRate } from './practiceDebugLog';

export interface AcousticInputCallbacks {
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
  onPitchDetected?: (midi: number | null, confidence: number) => void;
}

const BUFFER_SIZE = 2048;
const WINDOW_SIZE = 9;
const WINDOW_QUORUM = 5;  // 5 of last 9 frames must agree
const NOTE_OFF_FRAMES = 5;
const RMS_THRESHOLD = 0.01;

export class AcousticInput {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private callbacks: AcousticInputCallbacks;
  private currentNote: number | null = null;
  private recentPitches: (number | null)[] = [];
  private silenceFrames = 0;
  private running = false;

  constructor(callbacks: AcousticInputCallbacks) {
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    if (this.running) return;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });

    this.audioContext = new AudioContext();
    setSampleRate(this.audioContext.sampleRate);
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = BUFFER_SIZE * 2;
    source.connect(this.analyser);

    this.running = true;
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.currentNote !== null) {
      this.callbacks.onNoteOff(this.currentNote);
      this.currentNote = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  private getWindowMajority(): number | null {
    const counts = new Map<number, number>();
    for (const p of this.recentPitches) {
      if (p === null) continue;
      counts.set(p, (counts.get(p) || 0) + 1);
    }
    let best: number | null = null;
    let bestCount = 0;
    for (const [note, count] of counts) {
      if (count > bestCount) { bestCount = count; best = note; }
    }
    return bestCount >= WINDOW_QUORUM ? best : null;
  }

  private tick = () => {
    if (!this.running || !this.analyser || !this.audioContext) return;

    const buffer = new Float32Array(BUFFER_SIZE);
    this.analyser.getFloatTimeDomainData(buffer);

    let rms = 0;
    for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / buffer.length);

    if (rms < RMS_THRESHOLD) {
      this.silenceFrames++;
      this.recentPitches = [];
      if (this.silenceFrames >= NOTE_OFF_FRAMES && this.currentNote !== null) {
        if (isDebugEnabled()) logDebugEvent({ type: 'note_off', t: performance.now(), midi: this.currentNote });
        this.callbacks.onNoteOff(this.currentNote);
        this.currentNote = null;
      }
      if (isDebugEnabled()) logDebugEvent({ type: 'pitch_raw', t: performance.now(), midi: null, rms });
      this.callbacks.onPitchDetected?.(null, 0);
    } else {
      this.silenceFrames = 0;
      const midi = detectPitch(buffer, this.audioContext.sampleRate);

      if (isDebugEnabled()) logDebugEvent({ type: 'pitch_raw', t: performance.now(), midi, rms });
      this.callbacks.onPitchDetected?.(midi, rms);

      this.recentPitches.push(midi);
      if (this.recentPitches.length > WINDOW_SIZE) {
        this.recentPitches.shift();
      }

      const majority = this.getWindowMajority();
      if (majority !== null && majority !== this.currentNote) {
        if (this.currentNote !== null) {
          if (isDebugEnabled()) logDebugEvent({ type: 'note_off', t: performance.now(), midi: this.currentNote });
          this.callbacks.onNoteOff(this.currentNote);
        }
        this.currentNote = majority;
        if (isDebugEnabled()) logDebugEvent({ type: 'note_on', t: performance.now(), midi: majority });
        this.callbacks.onNoteOn(majority);
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
