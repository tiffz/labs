import {
  AcousticInput as SharedAcousticInput,
  type AcousticInputCallbacks,
} from '../../shared/music/pitch/acousticInput';
import type { MicrophonePitchInputOptions } from '../../shared/music/pitch/microphonePitchInput';
import { isDebugEnabled, logDebugEvent } from './practiceDebugLog';

export type { AcousticInputCallbacks };

/**
 * Tuning optimized for sequential single-note scale practice. Compared to
 * defaults: faster onset via smaller window/quorum, generous sustain
 * tolerance, and a higher RMS gate to reject ambient noise.
 */
const SCALES_PITCH_OPTIONS: MicrophonePitchInputOptions = {
  bufferSize: 2048,
  windowSize: 5,
  windowQuorum: 3,
  noteOffFrames: 10,
  rmsThreshold: 0.008,
  hysteresisSemitones: 1,
  minNoteDurationMs: 60,
  onsetThresholdMultiplier: 2.5,
};

/**
 * Scales-app acoustic input. Delegates to the shared implementation with the
 * scales-specific pitch tuning and debug logger.
 */
export class AcousticInput extends SharedAcousticInput {
  constructor(callbacks: AcousticInputCallbacks) {
    super(callbacks, {
      pitchOptions: SCALES_PITCH_OPTIONS,
      debug: {
        isEnabled: isDebugEnabled,
        onPitch: (midi, confidence, frequency) =>
          logDebugEvent({
            type: 'pitch_raw',
            t: performance.now(),
            midi,
            rms: confidence,
            freq: frequency,
          }),
      },
    });
  }
}
