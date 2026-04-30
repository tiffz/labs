import {
  AcousticInput as SharedAcousticInput,
  type AcousticInputCallbacks,
} from '../../shared/music/pitch/acousticInput';
import type { MicrophonePitchInputOptions } from '../../shared/music/pitch/microphonePitchInput';
import { isDebugEnabled, logDebugEvent } from './practiceDebugLog';

export type { AcousticInputCallbacks };

/**
 * Tuning optimized for sequential single-note scale practice. Compared to
 * defaults: slightly smaller vote window, generous sustain tolerance, and
 * an RMS gate tuned for laptop mics (was missing quiet or mid-register
 * notes like D4 when set too high — see debug `pitch_raw` stuck at rms 0).
 *
 * `clearWindowOnLoudOnset: false` avoids wiping the YIN vote buffer on RMS
 * spikes so quorum can still form on the same frame as a soft attack.
 */
const SCALES_PITCH_OPTIONS: MicrophonePitchInputOptions = {
  bufferSize: 2048,
  windowSize: 6,
  windowQuorum: 3,
  noteOffFrames: 12,
  rmsThreshold: 0.0055,
  hysteresisSemitones: 1,
  minNoteDurationMs: 55,
  onsetThresholdMultiplier: 2.2,
  clearWindowOnLoudOnset: false,
  /** Lets mic "double tap same key" emit off→on between strikes (see MicrophonePitchInput). */
  samePitchRearticulation: 'offThenOn',
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
