import { useState } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';

import AnchoredPopover from '../../shared/components/AnchoredPopover';

/**
 * Why a familiar keyboard is playing unfamiliar pitches.
 *
 * A question mark, not a sentence. The label used to read "Why these keys are
 * retuned", which is a lot of chrome for a note most people will open once,
 * sitting beside the instrument it is about to explain.
 *
 * It answers in three sentences and then gets out of the way, handing off to
 * maqamworld.com — which documents the physical oriental keyboards this app's
 * whole conceit is borrowed from, and can speak with an authority this app
 * should not claim.
 */
export default function RetuningNote() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <IconButton
        size="small"
        className="maqam-retuning__trigger"
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
        aria-label="Why these keys are retuned"
      >
        <span aria-hidden="true">?</span>
      </IconButton>

      <AnchoredPopover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        placement="top-end"
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
            cents below where a piano puts it. Only the keys this maqam needs are bent.
          </p>
          <Button
            variant="text"
            size="small"
            component="a"
            href="https://www.maqamworld.com/en/instr/keyboard.php"
            target="_blank"
            rel="noreferrer noopener"
          >
            Oriental keyboards at maqamworld
          </Button>
        </div>
      </AnchoredPopover>
    </>
  );
}
