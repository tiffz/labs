import { detectPitchInfo, type PitchInfo } from './pitchDetection';

const BUFFER_SIZE = 2048;
const WINDOW_SIZE = 7;
const WINDOW_QUORUM = 4;
const NOTE_OFF_FRAMES = 8;
const RMS_THRESHOLD = 0.0075;
const CURRENT_NOTE_HYSTERESIS_SEMITONES = 1;

export interface MicrophoneDevice {
  id: string;
  name: string;
}

export interface MicrophonePitchInputCallbacks {
  onNoteOn?: (midi: number) => void;
  onNoteOff?: (midi: number) => void;
  onPitchDetected?: (midi: number | null, confidence: number, pitchInfo: PitchInfo | null) => void;
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

  constructor(callbacks: MicrophonePitchInputCallbacks = {}) {
    this.callbacks = callbacks;
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
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = BUFFER_SIZE * 2;
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
        this.callbacks.onNoteOff?.(this.currentNote);
        this.currentNote = null;
      }
      this.callbacks.onPitchDetected?.(null, 0, null);
    } else {
      this.silenceFrames = 0;
      let pitchInfo = detectPitchInfo(buffer, this.audioContext.sampleRate);
      if (
        pitchInfo &&
        this.currentNote !== null &&
        Math.abs(pitchInfo.midi - this.currentNote) <= CURRENT_NOTE_HYSTERESIS_SEMITONES
      ) {
        pitchInfo = { ...pitchInfo, midi: this.currentNote };
      }

      const midi = pitchInfo?.midi ?? null;
      this.callbacks.onPitchDetected?.(midi, rms, pitchInfo ?? null);
      this.recentPitches.push(midi);
      if (this.recentPitches.length > WINDOW_SIZE) {
        this.recentPitches.shift();
      }

      const majority = this.getWindowMajority();
      if (majority !== null && majority !== this.currentNote) {
        if (this.currentNote !== null) {
          this.callbacks.onNoteOff?.(this.currentNote);
        }
        this.currentNote = majority;
        this.callbacks.onNoteOn?.(majority);
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}

