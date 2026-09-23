import { useCallback } from 'react';

import OnscreenPianoKeyboard, {
  type PianoKeyDecoration,
} from '../../shared/components/music/OnscreenPianoKeyboard';
import type { KeyTuning } from '../state/maqamTuning';

interface MaqamKeyboardProps {
  keyTunings: KeyTuning[];
  activeNotes: Set<number>;
  octaves: number[];
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
  onNoteOn,
  onNoteOff,
}: MaqamKeyboardProps) {
  const decorateKey = useCallback(
    (midi: number): PianoKeyDecoration | undefined => {
      const tuning = keyTunings[((midi % 12) + 12) % 12];
      if (!tuning) return undefined;
      const octave = Math.floor(midi / 12) - 1;
      return {
        className: [
          'maqam-key',
          `maqam-key--${tuning.role}`,
          // Home is marked separately from the colour tier so a microtonal
          // tonic (Sikah) shows as both retuned and home.
          tuning.isTonic ? 'maqam-key--home' : '',
        ]
          .filter(Boolean)
          .join(' '),
        badge: tuning.badge,
        ariaLabel: `${tuning.ariaLabel}, octave ${octave}`,
      };
    },
    [keyTunings],
  );

  return (
    <div className="maqam-keyboard">
      <OnscreenPianoKeyboard
        octaves={octaves}
        activeNotes={activeNotes}
        onNoteOn={onNoteOn}
        onNoteOff={onNoteOff}
        showLabels
        showBlackLabels={false}
        decorateKey={decorateKey}
      />
    </div>
  );
}
