import AppTooltip from '../../shared/components/AppTooltip';
import { PITCH_CLASS_NAMES, type DetuneMatrix } from '../data/maqamPresets';
import { formatCents } from '../state/maqamTuning';

/** Mirrors the shared keyboard's own layout, so the bank keeps piano shape. */
const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_KEYS = [
  { offset: 1, afterWhite: 0 },
  { offset: 3, afterWhite: 1 },
  { offset: 6, afterWhite: 3 },
  { offset: 8, afterWhite: 4 },
  { offset: 10, afterWhite: 5 },
];

interface KeyTuningRailProps {
  matrix: DetuneMatrix;
  onToggle: (pitchClass: number) => void;
}

/**
 * Twelve levers, one per note name — not one per key.
 *
 * The app's model is a HARP's pedals, not a qanun's levers: one action per
 * pitch class, applying to every octave at once. It was built as a qanun — one
 * lever per string — which meant 36 objects doing 12 jobs, in an app where 5
 * of the 9 maqamat never light a single one. Three separate reports of "messy"
 * and "cluttered" came from that surplus, and the last of them was a real
 * geometric fault it caused: a black chip is 18px wide and the gap it sits in
 * between two white chips is 17px, so every black chip overlapped its
 * neighbours by a pixel — and by nine at a coarse pointer, where it grows to
 * 26px. What looked like a clipping bug was one control drawn on top of
 * another.
 *
 * Twelve levers in piano geometry cannot overlap, because the black levers own
 * the gaps instead of being squeezed into them.
 *
 * Position is still the label, which was the win over the ORIGINAL version: a
 * flat row of twelve pills that had to spell out "C", "C#", "D" because
 * nothing about where they sat said which note they governed. The shape is
 * what labels them — seven wide, five narrow, at piano offsets. A piano is
 * recognisable from its silhouette, and this is that silhouette.
 *
 * The readout stays on the keys. A lit lever used to be echoed by all three of
 * its keycaps, which is one fact three times; the keycap already prints the
 * live spelling (`E½♭3`), so the lever only has to be the control.
 */
export default function KeyTuningRail({ matrix, onToggle }: KeyTuningRailProps) {
  const lever = (pitchClass: number, className: string, style?: React.CSSProperties) => {
    const cents = matrix[pitchClass] ?? 0;
    const bent = cents !== 0;
    const name = PITCH_CLASS_NAMES[pitchClass];

    return (
      /* A real tooltip, not `title`: the native one never appears on keyboard
         focus, so the only explanation of the app's least familiar control was
         invisible to anyone not using a mouse. */
      <AppTooltip
        key={`lever-${pitchClass}`}
        title={
          bent
            ? `${name} is lowered a quarter tone, in every octave. Click to restore it.`
            : `Lower ${name} a quarter tone, in every octave.`
        }
      >
        <button
          type="button"
          className={[className, bent ? 'is-bent' : ''].filter(Boolean).join(' ')}
          style={style}
          aria-pressed={bent}
          onClick={() => onToggle(pitchClass)}
          /* One lever per note, so the name IS the note — there is no octave
             left to disambiguate, which is the only reason the 36-chip version
             had to say "E3, E4, E5". That it applies to every octave is stated
             once, on the group. */
          aria-label={`${name}, ${bent ? formatCents(cents) : 'equal temperament'}`}
        >
          <span aria-hidden="true">{bent ? '½♭' : ''}</span>
        </button>
      </AppTooltip>
    );
  };

  return (
    <div
      className="maqam-tuningbank"
      role="group"
      aria-label="Quarter-tone levers. Each one lowers its note a quarter tone, in every octave."
    >
      {/* The unit, printed ONCE — the way a desk prints dB at the head of a
          fader bank rather than on every fader. Thirty-six copies of "½♭" made
          the loudest type on the page out of a control the README calls the
          exception. */}
      <span className="maqam-tuningbank__unit" aria-hidden="true">
        ½♭
      </span>
      <div className="maqam-tuningbank__keys">
        {WHITE_OFFSETS.map((offset) => lever(offset, 'maqam-lever maqam-lever--white'))}
        {BLACK_KEYS.map(({ offset, afterWhite }) =>
          lever(offset, 'maqam-lever maqam-lever--black', {
            left: `${((afterWhite + 1) / 7) * 100}%`,
          }),
        )}
      </div>
    </div>
  );
}
