import React from 'react';

const WHITE_KEYS = [
  { note: 'C', midi: 0 },
  { note: 'D', midi: 2 },
  { note: 'E', midi: 4 },
  { note: 'F', midi: 5 },
  { note: 'G', midi: 7 },
  { note: 'A', midi: 9 },
  { note: 'B', midi: 11 },
];

const BLACK_KEYS = [
  { note: 'C#', midi: 1, afterWhite: 0 },
  { note: 'D#', midi: 3, afterWhite: 1 },
  { note: 'F#', midi: 6, afterWhite: 3 },
  { note: 'G#', midi: 8, afterWhite: 4 },
  { note: 'A#', midi: 10, afterWhite: 5 },
];

interface KeyboardClassNames {
  container: string;
  octaveGroup: string;
  whiteKey: string;
  blackKey: string;
  whiteKeyLabel: string;
  blackKeyLabel: string;
  bassRange: string;
}

const DEFAULT_CLASS_NAMES: KeyboardClassNames = {
  container: 'shared-pk-container',
  octaveGroup: 'shared-pk-octave',
  whiteKey: 'shared-pk-white',
  blackKey: 'shared-pk-black',
  whiteKeyLabel: 'shared-pk-white-label',
  blackKeyLabel: 'shared-pk-black-label',
  bassRange: 'shared-pk-bass-range',
};

/**
 * Per-key presentation an app layers on top of the plain keyboard: a role class
 * (e.g. "in this scale", "retuned"), a small badge drawn on the keycap, and a
 * spoken name replacing the bare note name.
 */
export interface PianoKeyDecoration {
  /** Extra class on the key button. */
  className?: string;
  /** Short badge rendered on the keycap, e.g. `½♭`. */
  badge?: string;
  /** Replaces the default accessible name for the key. */
  ariaLabel?: string;
}

interface OnscreenPianoKeyboardProps {
  octaves?: number[];
  activeNotes?: Set<number>;
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
  showLabels?: boolean;
  showBlackLabels?: boolean;
  highlightBassBelowMidi?: number;
  classNames?: Partial<KeyboardClassNames>;
  /**
   * Optional per-key styling hook, called once per rendered key. Keeps
   * app-specific meaning (scale membership, microtonal retuning) out of this
   * component while letting apps paint it — see Maqam Playground.
   */
  decorateKey?: (midi: number) => PianoKeyDecoration | undefined;
}

export default function OnscreenPianoKeyboard({
  octaves = [3, 4, 5],
  activeNotes,
  onNoteOn,
  onNoteOff,
  showLabels = true,
  showBlackLabels = true,
  highlightBassBelowMidi,
  classNames,
  decorateKey,
}: OnscreenPianoKeyboardProps): React.ReactElement {
  const classes: KeyboardClassNames = { ...DEFAULT_CLASS_NAMES, ...classNames };

  /**
   * Which keys the KEYBOARD is holding down. Held separately from `activeNotes`
   * because that set also contains notes sounded by MIDI, playback, or another
   * pointer, and releasing one of those on a stray `keyup` would cut a note the
   * user never pressed.
   */
  const heldByKeyboard = React.useRef<Set<number>>(new Set());

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, midi: number) => {
    event.preventDefault();
    // Sound the note FIRST. Pointer capture is an enhancement — it keeps the
    // note held when the finger slides off the keycap — and `setPointerCapture`
    // throws `InvalidPointerId` if the pointer has already gone up. Capturing
    // first meant that throw took the note with it, silently.
    onNoteOn(midi);
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // No capture: the note still sounds, it just will not track off-key drags.
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>, midi: number) => {
    event.preventDefault();
    try {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }
    } catch {
      // Already released. Releasing the NOTE is the part that must not be skipped.
    }
    onNoteOff(midi);
  };

  /**
   * Play from the keyboard. Without this the instrument was mouse-only: every
   * key was a focusable `<button>` that did nothing when activated, which is
   * WCAG 2.1.1 (Keyboard) and reads as a broken control rather than a missing
   * feature.
   *
   * Space and Enter hold the note for as long as they are held, matching the
   * pointer, rather than firing a fixed blip on click.
   */
  const isPlayKey = (key: string) => key === 'Enter' || key === ' ' || key === 'Spacebar';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, midi: number) => {
    if (!isPlayKey(event.key)) return;
    // Space scrolls the page and Enter re-fires `click`; both would fight the note.
    event.preventDefault();
    // Auto-repeat would restrike the string 30 times a second.
    if (event.repeat || heldByKeyboard.current.has(midi)) return;
    heldByKeyboard.current.add(midi);
    onNoteOn(midi);
  };

  const releaseKeyboardNote = (midi: number) => {
    if (!heldByKeyboard.current.delete(midi)) return;
    onNoteOff(midi);
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLButtonElement>, midi: number) => {
    if (!isPlayKey(event.key)) return;
    event.preventDefault();
    releaseKeyboardNote(midi);
  };

  /**
   * Tabbing away mid-note, or a dialog stealing focus, never delivers the
   * `keyup` — so the note would sound forever. A stuck drone is the worst
   * failure this component has.
   */
  const handleBlur = (midi: number) => releaseKeyboardNote(midi);

  const pressProps = (midi: number) => ({
    type: 'button' as const,
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => handlePointerDown(event, midi),
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => handlePointerUp(event, midi),
    onPointerCancel: (event: React.PointerEvent<HTMLButtonElement>) => handlePointerUp(event, midi),
    onPointerLeave: (event: React.PointerEvent<HTMLButtonElement>) => {
      if ((event.buttons & 1) !== 1) return;
      handlePointerUp(event, midi);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => handleKeyDown(event, midi),
    onKeyUp: (event: React.KeyboardEvent<HTMLButtonElement>) => handleKeyUp(event, midi),
    onBlur: () => handleBlur(midi),
  });

  return (
    <div className={classes.container}>
      {octaves.map((octave) => (
        <div key={octave} className={classes.octaveGroup}>
          {WHITE_KEYS.map((key) => {
            const midi = (octave + 1) * 12 + key.midi;
            const active = activeNotes?.has(midi) ?? false;
            const isBass = typeof highlightBassBelowMidi === 'number' && midi < highlightBassBelowMidi;
            const decoration = decorateKey?.(midi);
            return (
              <button
                key={midi}
                className={[
                  classes.whiteKey,
                  active ? 'active' : '',
                  isBass ? classes.bassRange : '',
                  decoration?.className ?? '',
                ].filter(Boolean).join(' ')}
                aria-label={decoration?.ariaLabel}
                aria-pressed={active}
                {...pressProps(midi)}
              >
                {showLabels && <span className={classes.whiteKeyLabel}>{key.note}{octave}</span>}
                {decoration?.badge && (
                  <span className="shared-pk-badge" aria-hidden="true">{decoration.badge}</span>
                )}
              </button>
            );
          })}

          {BLACK_KEYS.map((key) => {
            const midi = (octave + 1) * 12 + key.midi;
            const active = activeNotes?.has(midi) ?? false;
            const leftPct = ((key.afterWhite + 1) / 7) * 100;
            const decoration = decorateKey?.(midi);
            return (
              <button
                key={midi}
                className={[
                  classes.blackKey,
                  active ? 'active' : '',
                  decoration?.className ?? '',
                ].filter(Boolean).join(' ')}
                aria-label={decoration?.ariaLabel}
                aria-pressed={active}
                style={{ left: `${leftPct}%` }}
                {...pressProps(midi)}
              >
                {showLabels && showBlackLabels && (
                  <span className={classes.blackKeyLabel}>{key.note}{octave}</span>
                )}
                {decoration?.badge && (
                  <span className="shared-pk-badge" aria-hidden="true">{decoration.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

