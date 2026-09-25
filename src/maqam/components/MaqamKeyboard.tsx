import { useCallback } from 'react';

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
  onNoteOn,
  onNoteOff,
}: MaqamKeyboardProps) {
  const decorateKey = useCallback(
    (midi: number): PianoKeyDecoration | undefined => {
      const tuning = keyTunings[((midi % 12) + 12) % 12];
      if (!tuning) return undefined;
      const octave = Math.floor(midi / 12) - 1;
      // One class per independent fact. Fill says "in the maqam", the dot says
      // "home", the amber mark says "retuned" — so a key that is all three
      // (Sikah's E½♭) shows all three instead of one winning.
      return {
        className: [
          'maqam-key',
          `maqam-key--${tuning.role}`,
          tuning.isTonic ? 'maqam-key--home' : '',
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
        badge: tuning.badge,
        ariaLabel: `${tuning.ariaLabel}, octave ${octave}`,
      };
    },
    [keyTunings, playingMidiNote],
  );

  return (
    <div className="maqam-keyboard">
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
