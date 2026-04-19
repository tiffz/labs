import {
  MicrophonePitchInput,
  type MicrophonePitchInputOptions,
} from './microphonePitchInput';

export interface AcousticInputCallbacks {
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
  onPitchDetected?: (midi: number | null, confidence: number) => void;
}

export interface AcousticInputDebugHooks {
  isEnabled(): boolean;
  onNoteOn?: (midi: number) => void;
  onNoteOff?: (midi: number) => void;
  onPitch?: (midi: number | null, confidence: number, frequency: number | undefined) => void;
}

export interface AcousticInputFactoryOptions {
  /** Tuning forwarded to the underlying microphone pitch detector. */
  pitchOptions?: MicrophonePitchInputOptions;
  /** Optional per-app debug logging. No-op when `isEnabled()` returns false. */
  debug?: AcousticInputDebugHooks;
}

/**
 * Thin lifecycle wrapper around {@link MicrophonePitchInput}. Each app used to
 * maintain its own copy (`src/piano/utils/acousticInput.ts`,
 * `src/scales/utils/acousticInput.ts`) which drifted subtly over time. Use
 * this factory so both apps stay on the same semantics.
 */
export class AcousticInput {
  private readonly input: MicrophonePitchInput;

  constructor(callbacks: AcousticInputCallbacks, options: AcousticInputFactoryOptions = {}) {
    const debug = options.debug;
    this.input = new MicrophonePitchInput(
      {
        onNoteOn: (midi) => {
          if (debug?.isEnabled() && debug.onNoteOn) debug.onNoteOn(midi);
          callbacks.onNoteOn(midi);
        },
        onNoteOff: (midi) => {
          if (debug?.isEnabled() && debug.onNoteOff) debug.onNoteOff(midi);
          callbacks.onNoteOff(midi);
        },
        onPitchDetected: (midi, confidence, pitchInfo) => {
          if (debug?.isEnabled() && debug.onPitch) {
            debug.onPitch(midi, confidence, pitchInfo?.frequency);
          }
          callbacks.onPitchDetected?.(midi, confidence);
        },
      },
      options.pitchOptions,
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
