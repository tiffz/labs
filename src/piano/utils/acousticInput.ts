import { MicrophonePitchInput } from '../../shared/music/pitch/microphonePitchInput';
import { isDebugEnabled, logDebugEvent } from './practiceDebugLog';

export interface AcousticInputCallbacks {
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
  onPitchDetected?: (midi: number | null, confidence: number) => void;
}

export class AcousticInput {
  private readonly callbacks: AcousticInputCallbacks;
  private readonly input: MicrophonePitchInput;

  constructor(callbacks: AcousticInputCallbacks) {
    this.callbacks = callbacks;
    this.input = new MicrophonePitchInput({
      onNoteOn: (midi) => {
        if (isDebugEnabled()) logDebugEvent({ type: 'note_on', t: performance.now(), midi });
        this.callbacks.onNoteOn(midi);
      },
      onNoteOff: (midi) => {
        if (isDebugEnabled()) logDebugEvent({ type: 'note_off', t: performance.now(), midi });
        this.callbacks.onNoteOff(midi);
      },
      onPitchDetected: (midi, confidence) => {
        if (isDebugEnabled()) {
          logDebugEvent({
            type: 'pitch_raw',
            t: performance.now(),
            midi,
            rms: confidence,
          });
        }
        this.callbacks.onPitchDetected?.(midi, confidence);
      },
    });
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
