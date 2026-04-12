import type { MetronomeEngine } from '../engine/MetronomeEngine';

export interface TimingResult {
  deltaMs: number;
  nearestBeatTime: number;
  onsetTime: number;
}

export interface SessionStats {
  count: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

const HISTORY_SIZE = 100;
const ONSET_THRESHOLD = 0.15;
const ONSET_COOLDOWN_MS = 80;

/**
 * Analyzes timing accuracy of mic/MIDI input against the metronome clock.
 * Decoupled from React — communicates via callbacks.
 */
export class RhythmAnalyzer {
  private engine: MetronomeEngine | null = null;
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private midiAccess: MIDIAccess | null = null;

  private deltas: number[] = [];
  private lastOnsetTime = 0;
  private rafId: number | null = null;
  private listening = false;

  private onDeltaCallback: ((delta: number) => void) | null = null;
  private _onReEntryCallback: ((delta: number) => void) | null = null;

  // Calibration offset between performance.now() and AudioContext.currentTime
  private perfToAudioOffset = 0;

  attachToEngine(engine: MetronomeEngine): void {
    this.engine = engine;
  }

  onDelta(cb: (delta: number) => void): void {
    this.onDeltaCallback = cb;
  }

  onReEntry(cb: (delta: number) => void): void {
    this._onReEntryCallback = cb;
  }

  async startMicListening(): Promise<void> {
    if (this.listening) return;

    this.audioCtx = new AudioContext();
    this.perfToAudioOffset = this.audioCtx.currentTime - performance.now() / 1000;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.micStream = stream;

    this.sourceNode = this.audioCtx.createMediaStreamSource(stream);
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 1024;
    this.sourceNode.connect(this.analyserNode);

    this.listening = true;
    this.detectOnsets();
  }

  async startMidiListening(): Promise<void> {
    if (!navigator.requestMIDIAccess) return;

    this.audioCtx = this.audioCtx ?? new AudioContext();
    this.perfToAudioOffset = this.audioCtx.currentTime - performance.now() / 1000;

    this.midiAccess = await navigator.requestMIDIAccess();
    for (const input of this.midiAccess.inputs.values()) {
      input.onmidimessage = (e) => this.handleMidiMessage(e);
    }

    this.listening = true;
  }

  stopListening(): void {
    this.listening = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.micStream) {
      for (const track of this.micStream.getTracks()) track.stop();
      this.micStream = null;
    }
    if (this.midiAccess) {
      for (const input of this.midiAccess.inputs.values()) {
        input.onmidimessage = null;
      }
      this.midiAccess = null;
    }
  }

  isListening(): boolean {
    return this.listening;
  }

  processOnset(audioTime: number): TimingResult | null {
    if (!this.engine) return null;

    const beatTimes = this.engine.getScheduledBeatTimes();
    if (beatTimes.length === 0) return null;

    // Find the nearest scheduled beat
    let nearestTime = beatTimes[0];
    let minDist = Math.abs(audioTime - beatTimes[0]);

    for (let i = 1; i < beatTimes.length; i++) {
      const dist = Math.abs(audioTime - beatTimes[i]);
      if (dist < minDist) {
        minDist = dist;
        nearestTime = beatTimes[i];
      }
    }

    const deltaMs = (audioTime - nearestTime) * 1000;

    this.deltas.push(deltaMs);
    if (this.deltas.length > HISTORY_SIZE) {
      this.deltas.shift();
    }

    this.onDeltaCallback?.(deltaMs);
    this._onReEntryCallback?.(deltaMs);

    return { deltaMs, nearestBeatTime: nearestTime, onsetTime: audioTime };
  }

  getSessionStats(): SessionStats {
    if (this.deltas.length === 0) {
      return { count: 0, mean: 0, stdDev: 0, min: 0, max: 0 };
    }

    const n = this.deltas.length;
    const mean = this.deltas.reduce((a, b) => a + b, 0) / n;
    const variance = this.deltas.reduce((sum, d) => sum + (d - mean) ** 2, 0) / n;

    return {
      count: n,
      mean,
      stdDev: Math.sqrt(variance),
      min: Math.min(...this.deltas),
      max: Math.max(...this.deltas),
    };
  }

  getLastDelta(): number | null {
    return this.deltas.length > 0 ? this.deltas[this.deltas.length - 1] : null;
  }

  getAverageDelta(): number | null {
    if (this.deltas.length === 0) return null;
    return this.deltas.reduce((a, b) => a + b, 0) / this.deltas.length;
  }

  // -------------------------------------------------------------------------
  // Mic onset detection
  // -------------------------------------------------------------------------

  private detectOnsets = (): void => {
    if (!this.listening || !this.analyserNode || !this.audioCtx) return;

    const bufferLength = this.analyserNode.fftSize;
    const dataArray = new Float32Array(bufferLength);
    this.analyserNode.getFloatTimeDomainData(dataArray);

    // Simple amplitude-based onset detection
    let maxAmplitude = 0;
    for (let i = 0; i < bufferLength; i++) {
      const abs = Math.abs(dataArray[i]);
      if (abs > maxAmplitude) maxAmplitude = abs;
    }

    const now = this.audioCtx.currentTime;
    const timeSinceLastOnset = (now - this.lastOnsetTime) * 1000;

    if (maxAmplitude > ONSET_THRESHOLD && timeSinceLastOnset > ONSET_COOLDOWN_MS) {
      this.lastOnsetTime = now;
      this.processOnset(now);
    }

    this.rafId = requestAnimationFrame(this.detectOnsets);
  };

  // -------------------------------------------------------------------------
  // MIDI handling
  // -------------------------------------------------------------------------

  private handleMidiMessage(e: MIDIMessageEvent): void {
    const data = e.data;
    if (!data || data.length < 3) return;

    const status = data[0] & 0xf0;
    const velocity = data[2];

    // Note On with non-zero velocity
    if (status === 0x90 && velocity > 0) {
      const perfTime = e.timeStamp ?? performance.now();
      const audioTime = perfTime / 1000 + this.perfToAudioOffset;
      this.processOnset(audioTime);
    }
  }
}
