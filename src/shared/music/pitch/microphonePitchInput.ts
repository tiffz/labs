import { detectPitchInfo, type PitchInfo } from './pitchDetection';

const DEFAULT_BUFFER_SIZE = 2048;
const DEFAULT_WINDOW_SIZE = 7;
const DEFAULT_WINDOW_QUORUM = 4;
const DEFAULT_NOTE_OFF_FRAMES = 12;
const DEFAULT_RMS_THRESHOLD = 0.0075;
const DEFAULT_HYSTERESIS_SEMITONES = 1;
const DEFAULT_MIN_NOTE_DURATION_MS = 80;
const DEFAULT_ONSET_THRESHOLD_MULTIPLIER = 3;
const RMS_HISTORY_SIZE = 5;

export interface MicrophoneDevice {
  id: string;
  name: string;
}

export interface MicrophonePitchInputCallbacks {
  onNoteOn?: (midi: number) => void;
  onNoteOff?: (midi: number) => void;
  onPitchDetected?: (midi: number | null, confidence: number, pitchInfo: PitchInfo | null) => void;
}

export interface MicrophonePitchInputOptions {
  bufferSize?: number;
  windowSize?: number;
  windowQuorum?: number;
  noteOffFrames?: number;
  rmsThreshold?: number;
  hysteresisSemitones?: number;
  /** Minimum time (ms) a note stays active before it can be turned off or replaced */
  minNoteDurationMs?: number;
  /** Energy spike multiplier for onset detection (relative to recent RMS average) */
  onsetThresholdMultiplier?: number;
}

export class MicrophonePitchInput {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private callbacks: MicrophonePitchInputCallbacks;
  private currentNote: number | null = null;
  private recentPitches: (number | null)[] = [];
  private silenceFrames = 0;
  private running = false;
  private activeInputLabel: string | null = null;
  private noteOnTimestamp = 0;
  private rmsHistory: number[] = [];

  private readonly bufferSize: number;
  private readonly windowSize: number;
  private readonly windowQuorum: number;
  private readonly noteOffFrames: number;
  private readonly rmsThreshold: number;
  private readonly hysteresisSemitones: number;
  private readonly minNoteDurationMs: number;
  private readonly onsetThresholdMultiplier: number;

  constructor(callbacks: MicrophonePitchInputCallbacks = {}, options: MicrophonePitchInputOptions = {}) {
    this.callbacks = callbacks;
    this.bufferSize = options.bufferSize ?? DEFAULT_BUFFER_SIZE;
    this.windowSize = options.windowSize ?? DEFAULT_WINDOW_SIZE;
    this.windowQuorum = options.windowQuorum ?? DEFAULT_WINDOW_QUORUM;
    this.noteOffFrames = options.noteOffFrames ?? DEFAULT_NOTE_OFF_FRAMES;
    this.rmsThreshold = options.rmsThreshold ?? DEFAULT_RMS_THRESHOLD;
    this.hysteresisSemitones = options.hysteresisSemitones ?? DEFAULT_HYSTERESIS_SEMITONES;
    this.minNoteDurationMs = options.minNoteDurationMs ?? DEFAULT_MIN_NOTE_DURATION_MS;
    this.onsetThresholdMultiplier = options.onsetThresholdMultiplier ?? DEFAULT_ONSET_THRESHOLD_MULTIPLIER;
  }

  static async listDevices(): Promise<MicrophoneDevice[]> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return [{ id: 'default', name: 'System default' }];
    }
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter((d) => d.kind === 'audioinput');
      const unique = new Map<string, MicrophoneDevice>();
      for (let i = 0; i < inputs.length; i++) {
        const device = inputs[i];
        const id = device.deviceId || `audioinput-${i + 1}`;
        const label = device.label?.trim();
        const name = id === 'default'
          ? (label ? `System default (${label})` : 'System default')
          : (label || `Microphone ${i + 1}`);
        unique.set(id, { id, name });
      }
      if (!unique.has('default')) {
        unique.set('default', { id: 'default', name: 'System default' });
      }
      return Array.from(unique.values());
    } catch {
      return [{ id: 'default', name: 'System default' }];
    }
  }

  async start(preferredDeviceId?: string): Promise<void> {
    if (this.running) return;

    const baseConstraints: MediaTrackConstraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    };
    const fallbackStream = () => navigator.mediaDevices.getUserMedia({ audio: baseConstraints });
    const requestByExactId = (deviceId: string) => navigator.mediaDevices.getUserMedia({
      audio: { ...baseConstraints, deviceId: { exact: deviceId } },
    });
    const requestByIdealId = (deviceId: string) => navigator.mediaDevices.getUserMedia({
      audio: { ...baseConstraints, deviceId: { ideal: deviceId } },
    });

    if (preferredDeviceId && preferredDeviceId !== 'default') {
      try {
        this.stream = await requestByExactId(preferredDeviceId);
      } catch {
        try {
          this.stream = await requestByIdealId(preferredDeviceId);
        } catch {
          this.stream = await fallbackStream();
        }
      }
    } else {
      try {
        this.stream = await requestByIdealId('default');
      } catch {
        this.stream = await fallbackStream();
      }
    }

    this.audioContext = new AudioContext();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.bufferSize * 2;
    source.connect(this.analyser);

    this.activeInputLabel = this.stream.getAudioTracks()[0]?.label ?? null;
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
      this.callbacks.onNoteOff?.(this.currentNote);
      this.currentNote = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.activeInputLabel = null;
  }

  isRunning(): boolean {
    return this.running;
  }

  /**
   * While {@link start} is active, returns the same live mic stream used for analysis
   * so callers can attach {@link MediaRecorder} without opening a second capture session.
   */
  getMediaStream(): MediaStream | null {
    return this.stream;
  }

  getActiveInputLabel(): string | null {
    return this.activeInputLabel;
  }

  private getWindowMajority(): number | null {
    const counts = new Map<number, number>();
    for (const pitch of this.recentPitches) {
      if (pitch === null) continue;
      counts.set(pitch, (counts.get(pitch) || 0) + 1);
    }
    let best: number | null = null;
    let bestCount = 0;
    for (const [note, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        best = note;
      }
    }
    return bestCount >= this.windowQuorum ? best : null;
  }

  private isOnset(currentRms: number): boolean {
    if (this.rmsHistory.length < 3) return false;
    const recentAvg = this.rmsHistory.reduce((a, b) => a + b, 0) / this.rmsHistory.length;
    return currentRms > recentAvg * this.onsetThresholdMultiplier
      && currentRms > this.rmsThreshold * 2;
  }

  private noteMinDurationMet(): boolean {
    return !this.currentNote || (Date.now() - this.noteOnTimestamp >= this.minNoteDurationMs);
  }

  private tick = () => {
    if (!this.running || !this.analyser || !this.audioContext) return;

    const buffer = new Float32Array(this.bufferSize);
    this.analyser.getFloatTimeDomainData(buffer);

    let rms = 0;
    for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / buffer.length);

    const onset = this.isOnset(rms);

    this.rmsHistory.push(rms);
    if (this.rmsHistory.length > RMS_HISTORY_SIZE) this.rmsHistory.shift();

    if (rms < this.rmsThreshold) {
      this.silenceFrames++;

      if (this.silenceFrames >= this.noteOffFrames && this.currentNote !== null && this.noteMinDurationMet()) {
        this.callbacks.onNoteOff?.(this.currentNote);
        this.currentNote = null;
        this.recentPitches = [];
      }
      this.callbacks.onPitchDetected?.(null, 0, null);
    } else {
      this.silenceFrames = 0;
      const pitchInfo = detectPitchInfo(buffer, this.audioContext.sampleRate);

      let resolvedMidi: number | null;

      if (pitchInfo !== null) {
        if (this.currentNote !== null && Math.abs(pitchInfo.midi - this.currentNote) <= this.hysteresisSemitones) {
          resolvedMidi = this.currentNote;
        } else {
          resolvedMidi = pitchInfo.midi;
        }
      } else if (this.currentNote !== null) {
        resolvedMidi = this.currentNote;
      } else {
        resolvedMidi = null;
      }

      this.recentPitches.push(resolvedMidi);
      if (this.recentPitches.length > this.windowSize) {
        this.recentPitches.shift();
      }

      if (onset && this.currentNote !== null && this.noteMinDurationMet()) {
        this.recentPitches = this.recentPitches.slice(-2);
      }

      const majority = this.getWindowMajority();

      if (majority !== null && majority !== this.currentNote) {
        if (this.noteMinDurationMet()) {
          if (this.currentNote !== null) {
            this.callbacks.onNoteOff?.(this.currentNote);
          }
          this.currentNote = majority;
          this.noteOnTimestamp = Date.now();
          this.callbacks.onNoteOn?.(majority);
        }
      }

      this.callbacks.onPitchDetected?.(
        this.currentNote ?? resolvedMidi,
        rms,
        pitchInfo ?? null,
      );
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}

