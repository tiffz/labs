import {
  AcousticInput as SharedAcousticInput,
  type AcousticInputCallbacks,
} from '../../shared/music/pitch/acousticInput';
import { isDebugEnabled, logDebugEvent } from './practiceDebugLog';

export type { AcousticInputCallbacks };

/**
 * Piano-app acoustic input. Delegates to the shared implementation and
 * supplies the piano-specific debug logger so pitch events land in the piano
 * practice debug log.
 */
export class AcousticInput extends SharedAcousticInput {
  constructor(callbacks: AcousticInputCallbacks) {
    super(callbacks, {
      debug: {
        isEnabled: isDebugEnabled,
        onNoteOn: (midi) => logDebugEvent({ type: 'note_on', t: performance.now(), midi }),
        onNoteOff: (midi) => logDebugEvent({ type: 'note_off', t: performance.now(), midi }),
        onPitch: (midi, confidence) =>
          logDebugEvent({ type: 'pitch_raw', t: performance.now(), midi, rms: confidence }),
      },
    });
  }
}
