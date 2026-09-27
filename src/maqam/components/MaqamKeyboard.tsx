import { useCallback, type CSSProperties } from 'react';

import OnscreenPianoKeyboard, {
  type PianoKeyDecoration,
} from '../../shared/components/music/OnscreenPianoKeyboard';
import type { KeyTuning } from '../state/maqamTuning';

interface MaqamKeyboardProps {
  keyTunings: KeyTuning[];
  activeNotes: Set<number>;
  octaves: number[];
  /** The exact note the melody is sounding right now, if any. */
  playingMidiNote?: number;
  /**
   * Pitch classes of the jins the reader is pointing at in the maqam card.
   *
   * `undefined` means "no cell is being pointed at", which is not the same as
   * an empty set — an empty set would mean "a cell with no notes", and would
   * correctly dim the entire keyboard.
   */
  inJinsPitchClasses?: ReadonlySet<number>;
  /**
   * Which of the `--maqam-jins-N` colours that cell owns, 1-based. The same
   * number the chip and the staff bracket use, so the three agree.
   */
  inJinsTone?: number;
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
}

/**
 * The shared piano keyboard, painted with this maqam's meaning: which keys
 * belong to it, which are retuned, and which is home.
 *
 * The colouring comes from `keyTunings`, which is derived from the *live*
 * detune matrix — so a key the user bends by hand goes amber immediately, even
 * though the loaded preset never asked for it.
 */
export default function MaqamKeyboard({
  keyTunings,
  activeNotes,
  octaves,
  playingMidiNote,
  inJinsPitchClasses,
  inJinsTone,
  onNoteOn,
  onNoteOff,
}: MaqamKeyboardProps) {
  const decorateKey = useCallback(
    (midi: number): PianoKeyDecoration | undefined => {
      const tuning = keyTunings[((midi % 12) + 12) % 12];
      if (!tuning) return undefined;
      const octave = Math.floor(midi / 12) - 1;
      // One class per independent fact. The degree numeral says "in the maqam,
      // and which note of it"; the amber badge says "retuned" — so a key that
      // is both (Sikah's E½♭) shows both instead of one winning.
      return {
        className: [
          'maqam-key',
          `maqam-key--${tuning.role}`,
          tuning.isTonic ? 'maqam-key--home' : '',
          // Pointing at a jins in the card lights the keys it covers and
          // quiets the rest, so "which notes are this cell" is answered on the
          // instrument as well as on the staff.
          inJinsPitchClasses
            ? inJinsPitchClasses.has(tuning.pitchClass)
              ? 'maqam-key--in-jins'
              : 'maqam-key--out-of-jins'
            : '',
          tuning.isRetuned ? 'maqam-key--retuned' : '',
          // Two tiers: the octave actually sounding, and the octaves that
          // share its pitch class. One fact each, one weight each.
          playingMidiNote === midi ? 'maqam-key--sounding' : '',
          playingMidiNote !== undefined &&
          playingMidiNote !== midi &&
          ((playingMidiNote % 12) + 12) % 12 === tuning.pitchClass
            ? 'maqam-key--echoing'
            : '',
        ]
          .filter(Boolean)
          .join(' '),
        /*
         * Spelled the way the MAQAM spells it, not the way a piano does.
         *
         * On Hijaz the staff and the scale line both read `E♭`, while the key
         * under it said `D♯3` — the same pitch, named twice, and matching the
         * two is the entire thing a reader is here to do. `tuning.label`
         * already follows the live tuning, so a hand-bent key renames itself
         * too.
         *
         * This also retires the separate ½♭ badge. It carried the accidental
         * in a second chip above the name, which had to be positioned in the
         * strip of white key no black key covers — and that strip is 80px at
         * full desktop but 44px on a laptop, so the chip was sliced in half at
         * 1366x768 and read as labelling the black key beside it. Folding the
         * accidental into the name removes both the chip and its collision.
         */
        label: tuning.label ? `${tuning.label}${octave}` : undefined,
        // The numeral IS the membership mark. It is legible on Rast, where
        // every white key belongs and a relative tint therefore says nothing.
        mark: tuning.degree ? String(tuning.degree) : undefined,
        ariaLabel: `${tuning.ariaLabel}, octave ${octave}`,
      };
    },
    [keyTunings, playingMidiNote, inJinsPitchClasses],
  );

  return (
    <div
      className="maqam-keyboard"
      style={
        inJinsTone
          ? ({ '--maqam-cell-tone': `var(--maqam-jins-${inJinsTone})` } as CSSProperties)
          : undefined
      }
    >
      <OnscreenPianoKeyboard
        octaves={octaves}
        activeNotes={activeNotes}
        onNoteOn={onNoteOn}
        onNoteOff={onNoteOff}
        showLabels
        // Black keys carry names too. Without them the accidentals are an
        // unreadable wall of dark keys, and "which key is F#?" has no answer.
        showBlackLabels
        decorateKey={decorateKey}
      />
    </div>
  );
}
