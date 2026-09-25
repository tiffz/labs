import { PITCH_CLASS_NAMES, type DetuneMatrix } from '../data/maqamPresets';
import { formatCents, type KeyTuning } from '../state/maqamTuning';

interface DetuneMatrixBarProps {
  matrix: DetuneMatrix;
  keyTunings: KeyTuning[];
  onToggle: (pitchClass: number) => void;
}

/**
 * Twelve toggles, one per piano key, each switching that key between equal
 * temperament and a half-flat.
 *
 * This is the escape hatch, not the main control — picking a maqam sets all
 * twelve at once. It lives behind a disclosure so it does not compete with the
 * maqam picker for the same decision.
 */
export default function DetuneMatrixBar({
  matrix,
  keyTunings,
  onToggle,
}: DetuneMatrixBarProps) {
  return (
    <div className="maqam-matrix" role="group" aria-label="Retune individual keys">
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
