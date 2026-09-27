import { PITCH_CLASS_NAMES, type DetuneMatrix } from '../data/maqamPresets';
import { formatCents, type KeyTuning } from '../state/maqamTuning';

interface DetuneMatrixBarProps {
  matrix: DetuneMatrix;
  keyTunings: KeyTuning[];
  onToggle: (pitchClass: number) => void;
}

/**
 * Twelve switches, one per note name, sitting directly above the keyboard.
 *
 * Modelled on the physical oriental keyboards this app's whole conceit is
 * borrowed from, which carry a row of quarter-tone switches — one per note
 * name, not one per key, because bending C bends every C.
 *
 * It used to hide behind a "Tune keys" disclosure, which cost three things: a
 * second solid button competing with Play, a 62px page reflow on open that
 * truncated the reference panel on the far side of the screen, and the
 * impression that retuning was an advanced mode rather than the thing this
 * instrument does. Picking a maqam still sets all twelve at once; this is how
 * you see what it set.
 */
export default function DetuneMatrixBar({
  matrix,
  keyTunings,
  onToggle,
}: DetuneMatrixBarProps) {
  return (
    <div className="maqam-matrix" role="group" aria-label="Retune individual notes">
      {PITCH_CLASS_NAMES.map((name, pitchClass) => {
        const cents = matrix[pitchClass] ?? 0;
        const bent = cents !== 0;
        const tuning = keyTunings[pitchClass];
        const inScale = tuning?.role !== 'outside';
        return (
          <button
            key={name}
            type="button"
            className={[
              'maqam-matrix__slot',
              bent ? 'is-bent' : '',
              inScale ? 'is-in-scale' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-pressed={bent}
            onClick={() => onToggle(pitchClass)}
            // One accessible name, not a title plus hidden text: duplicating it
            // makes some screen readers announce the key twice.
            aria-label={
              bent
                ? `${name} is tuned ${formatCents(cents)}`
                : `${name} is in equal temperament`
            }
          >
            <span className="maqam-matrix__note" aria-hidden="true">
              {name}
            </span>
            <span className="maqam-matrix__cents" aria-hidden="true">
              {bent ? '½♭' : '·'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
