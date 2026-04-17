import { MicrophonePitchInput, type MicrophonePitchInputOptions } from '../../shared/music/pitch/microphonePitchInput';
import { isDebugEnabled, logDebugEvent } from './practiceDebugLog';

export interface AcousticInputCallbacks {
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
  onPitchDetected?: (midi: number | null, confidence: number) => void;
}

/**
 * Tuning optimized for sequential single-note scale practice.
 * Compared to defaults: faster onset via smaller window/quorum,
 * generous sustain tolerance, and higher RMS gate to reject ambient noise.
 */
const SCALES_OPTIONS: MicrophonePitchInputOptions = {
  bufferSize: 2048,
  windowSize: 5,
  windowQuorum: 3,
  noteOffFrames: 10,
  rmsThreshold: 0.008,
  hysteresisSemitones: 1,
  minNoteDurationMs: 60,
  onsetThresholdMultiplier: 2.5,
};

export class AcousticInput {
  private readonly input: MicrophonePitchInput;

  constructor(callbacks: AcousticInputCallbacks) {
    this.input = new MicrophonePitchInput(
      {
        onNoteOn: (midi) => callbacks.onNoteOn(midi),
        onNoteOff: (midi) => callbacks.onNoteOff(midi),
        onPitchDetected: (midi, confidence, pitchInfo) => {
          if (isDebugEnabled()) {
            logDebugEvent({ type: 'pitch_raw', t: performance.now(), midi,
              rms: confidence, freq: pitchInfo?.frequency });
          }
          callbacks.onPitchDetected?.(midi, confidence);
        },
      },
      SCALES_OPTIONS,
    );
  }

  async start(preferredDeviceId?: string): Promise<void> {
    await this.input.start(preferredDeviceId);
  }

  stop(): void {
    this.input.stop();
  }

  isRunning(): boolean {
    return this.input.isRunning();
  }

  getActiveInputLabel(): string | null {
    return this.input.getActiveInputLabel();
  }
}
