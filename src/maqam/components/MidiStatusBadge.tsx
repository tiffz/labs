import { useState } from 'react';
import Button from '@mui/material/Button';

import AnchoredPopover from '../../shared/components/AnchoredPopover';
import type { MidiDevice } from '../../shared/music/scoreTypes';

interface MidiStatusBadgeProps {
  supported: boolean;
  devices: MidiDevice[];
}

/**
 * MIDI connection status, and what MIDI would get you.
 *
 * Deliberately off the critical path: a chip in the corner, never a prompt,
 * never a blocking permission ask. The app is fully usable with the on-screen
 * keyboard, so a controller is a bonus and should read as one. But there was
 * previously no way at all to tell whether a connected controller had been
 * seen, which makes a silent keyboard impossible to diagnose.
 */
export default function MidiStatusBadge({ supported, devices }: MidiStatusBadgeProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const connected = devices.filter((device) => device.connected);

  const state = !supported ? 'unsupported' : connected.length > 0 ? 'connected' : 'ready';
  const label =
    state === 'connected'
      ? connected.length === 1
        ? connected[0].name
        : `${connected.length} MIDI devices`
      : state === 'ready'
        ? 'No MIDI device'
        : 'MIDI unavailable';

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
        {label}
      </Button>

      {/* The shared primitive, not a raw MUI Popover: it carries the Labs
          popover shadow token and placement conventions, and `check:chrome-ui-contract`
          enforces that app code uses it. */}
      <AnchoredPopover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        placement="bottom-end"
      >
        <div className="maqam-portal maqam-midi__detail">
          <h3>Playing with a MIDI keyboard</h3>
          {state === 'connected' ? (
            <>
              <p>Connected and listening:</p>
              <ul>
                {connected.map((device) => (
                  <li key={device.id}>
                    {device.name}
                    {device.manufacturer ? ` · ${device.manufacturer}` : ''}
                  </li>
                ))}
              </ul>
            </>
          ) : state === 'ready' ? (
            <p>
              Nothing connected yet. Plug in a USB MIDI keyboard and it should appear here on its
              own. No reload, no setup.
            </p>
          ) : (
            <p>
              This browser does not offer the Web MIDI API. Chrome and Edge do; Safari and Firefox
              currently do not. The on-screen keyboard works either way.
            </p>
          )}

          <p>
            A controller plays the retuned maqam, not equal temperament: the app bends each key as
            the note leaves your keyboard, so the half-flats sound the same as they do on screen.
          </p>
          <p className="maqam-midi__note">
            Entirely optional. Everything here works by clicking the keys.
          </p>
        </div>
      </AnchoredPopover>
    </>
  );
}
