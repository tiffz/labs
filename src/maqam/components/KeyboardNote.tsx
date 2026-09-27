import { useState } from 'react';
import Button from '@mui/material/Button';

import AnchoredPopover from '../../shared/components/AnchoredPopover';
import type { MidiDevice } from '../../shared/music/scoreTypes';

interface KeyboardNoteProps {
  supported: boolean;
  devices: MidiDevice[];
}

/**
 * One control for everything about this keyboard: why its keys are retuned,
 * and how to play it with a real one.
 *
 * These were two separate things in the same corner — a "?" and a MIDI status
 * chip — asking the reader to work out that they were the same conversation.
 * They are: a controller plays this board, retuned, so the answer to "why is
 * my E not an E" and the answer to "can I plug something in" belong together.
 *
 * Quiet by default. The app is fully playable without ever opening it.
 */
export default function KeyboardNote({ supported, devices }: KeyboardNoteProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const connected = devices.filter((device) => device.connected);

  /**
   * "Unavailable" covers two different things and `MidiInput.init()` answers
   * one boolean for both, so Chrome users who declined the prompt were told
   * their browser lacks Web MIDI. Ask the navigator directly.
   */
  const hasWebMidi =
    typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function';

  const state = !supported ? 'unsupported' : connected.length > 0 ? 'connected' : 'ready';

  return (
    <>
      <Button
        variant="text"
        size="small"
        className={`maqam-midi maqam-midi--${state}`}
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
      >
        <span className="maqam-midi__dot" aria-hidden="true" />
        {state === 'connected'
          ? connected.length === 1
            ? connected[0].name
            : `${connected.length} keyboards`
          : 'About this keyboard'}
      </Button>

      {/* The shared primitive, not a raw MUI Popover: it carries the Labs
          popover shadow token and placement conventions, and
          `check:chrome-ui-contract` enforces that app code uses it. */}
      <AnchoredPopover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        placement="top-end"
      >
        {/* `maqam-portal` carries the app's tokens into the portal, which
            renders at the end of <body>, outside `.maqam`. */}
        <div className="maqam-portal maqam-midi__detail">
          <h3>Why the keys are retuned</h3>
          <p>
            A piano octave has 12 fixed keys. Maqam music uses pitches between them, so the switches
            above each key bend it a quarter tone flat.
          </p>

          <h3>Playing it with your own keyboard</h3>
          {state === 'connected' ? (
            <ul>
              {connected.map((device) => (
                <li key={device.id}>{device.name}</li>
              ))}
            </ul>
          ) : state === 'ready' ? (
            <p>Plug in a USB MIDI keyboard. It appears here on its own, and plays this tuning.</p>
          ) : (
            <p>
              {hasWebMidi
                ? 'This browser has Web MIDI but could not open it, usually because access was declined.'
                : 'This browser has no Web MIDI. Chrome and Edge do.'}{' '}
              The keys on screen work either way.
            </p>
          )}
          {/* No link out. It pointed at maqamworld's "Oriental keyboards"
              page, and repeating that word is not something this app needs to
              do to explain a MIDI port. The two answers above are the whole
              content of this control. */}
        </div>
      </AnchoredPopover>
    </>
  );
}
