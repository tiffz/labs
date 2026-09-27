import { PITCH_CLASS_NAMES, type DetuneMatrix } from '../data/maqamPresets';
import { formatCents } from '../state/maqamTuning';

/** Mirrors the shared keyboard's own layout, so a switch sits over its key. */
const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_KEYS = [
  { offset: 1, afterWhite: 0 },
  { offset: 3, afterWhite: 1 },
  { offset: 6, afterWhite: 3 },
  { offset: 8, afterWhite: 4 },
  { offset: 10, afterWhite: 5 },
];

interface KeyTuningRailProps {
  octaves: number[];
  matrix: DetuneMatrix;
  onToggle: (pitchClass: number) => void;
}

/**
 * A quarter-tone switch directly above every key, aligned to it.
 *
 * The position IS the label. The previous version was a separate row of twelve
 * switches that each had to name their note ("C", "C#", "D"...) because
 * nothing about where they sat said which key they governed — the reader had
 * to match a name to a name. Putting the switch over its key makes the
 * mapping spatial, so the names come off.
 *
 * There is one switch per KEY rather than per note name, and all three octaves
 * of a pitch class light together when any of them is thrown. That is not
 * redundancy: bending C bends every C, and seeing the other two switches move
 * is the clearest way to say so.
 *
 * Geometry is copied from `OnscreenPianoKeyboard`: white keys flex evenly,
 * black keys sit at `((afterWhite + 1) / 7) * 100%` of the octave. If that
 * component's layout changes, this drifts, which is why
 * `keyTuningRailAlignment` in the e2e measures the two against each other
 * rather than trusting them to agree.
 */
export default function KeyTuningRail({
  octaves,
  matrix,
  onToggle,
}: KeyTuningRailProps) {
  const switchFor = (
    pitchClass: number,
    octave: number,
    className: string,
    style?: React.CSSProperties,
  ) => {
    const cents = matrix[pitchClass] ?? 0;
    const bent = cents !== 0;
    const name = PITCH_CLASS_NAMES[pitchClass];

    return (
      <button
        type="button"
        key={`${className}-${octave}-${pitchClass}`}
        className={[className, bent ? 'is-bent' : ''].filter(Boolean).join(' ')}
        style={style}
        aria-pressed={bent}
        onClick={() => onToggle(pitchClass)}
        /* Named by key, not by note, because there are three of each on
           screen and a screen reader would otherwise read the same label
           three times with no way to tell them apart. That one switch bends
           all three octaves is said once, on the group. */
        aria-label={`${name}${octave}, ${bent ? formatCents(cents) : 'equal temperament'}`}
        /* Hovering a switch should teach what it is, not restate the key's
           own name. Someone meeting this app has never seen a quarter-tone
           switch and there is nothing else on screen that explains one. */
        title={
          bent
            ? `${name} is lowered a quarter tone, in every octave. Click to restore it.`
            : `Lower ${name} a quarter tone, in every octave.`
        }
      >
        <span aria-hidden="true">{bent ? '½♭' : ''}</span>
      </button>
    );
  };

  return (
    <div
      className="maqam-rail"
      role="group"
      aria-label="Quarter-tone switches. Each one bends every octave of its note."
    >
      {octaves.map((octave) => (
        <div className="maqam-rail__octave" key={octave}>
          {WHITE_OFFSETS.map((offset) =>
            switchFor(offset, octave, 'maqam-rail__switch maqam-rail__switch--white'),
          )}
          {BLACK_KEYS.map(({ offset, afterWhite }) =>
            switchFor(offset, octave, 'maqam-rail__switch maqam-rail__switch--black', {
              left: `${((afterWhite + 1) / 7) * 100}%`,
            }),
          )}
        </div>
      ))}
    </div>
  );
}
