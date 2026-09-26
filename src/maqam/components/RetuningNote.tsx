import { useState } from 'react';
import Button from '@mui/material/Button';

import AnchoredPopover from '../../shared/components/AnchoredPopover';

interface RetuningNoteProps {
  /** Opens the full explainer, for a reader who wants the rest of it. */
  onReadMore: () => void;
}

/**
 * Why a familiar keyboard is playing unfamiliar pitches.
 *
 * A retuned keyboard is the app's strangest idea to anyone who already plays
 * one, and the explanation lived only behind "How maqamat work" in the topbar,
 * three sections down, which is nowhere near the keys it is about. This sits
 * beside the board and answers the question at the point it gets asked.
 *
 * Deliberately quiet: a text button, no icon badge, no callout. The app is
 * usable without ever opening it, so it should not compete with Play. Anyone
 * who wants the rest of the story gets it in one more click.
 */
export default function RetuningNote({ onReadMore }: RetuningNoteProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Button
        variant="text"
        size="small"
        className="maqam-retuning__trigger"
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
      >
        Why these keys are retuned
      </Button>

      <AnchoredPopover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        placement="top-start"
      >
        {/* `maqam-portal` carries the app's tokens into the portal, which
            renders at the end of <body>, outside `.maqam`. */}
        <div className="maqam-portal maqam-retuning__detail">
          <h3>Why these keys are retuned</h3>
          <p>
            A piano octave has 12 fixed keys. Maqam music uses pitches that sit between them, so
            this keyboard bends some keys off the pitch a piano would give them.
          </p>
          <p>
            The keys keep their names and their places. Press E in Rast and you hear E half flat, 50
            cents below where a piano puts it. Only the keys this maqam needs are bent, and the
            marked ones show which.
          </p>
          <p className="maqam-retuning__note">
            So you can play what your hands already know, and hear something they do not.
          </p>
          <Button variant="text" size="small" onClick={onReadMore}>
            How maqamat work
          </Button>
        </div>
      </AnchoredPopover>
    </>
  );
}
