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

interface OnscreenPianoKeyboardProps {
  octaves?: number[];
  activeNotes?: Set<number>;
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
  showLabels?: boolean;
  showBlackLabels?: boolean;
  highlightBassBelowMidi?: number;
  classNames?: Partial<KeyboardClassNames>;
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
}: OnscreenPianoKeyboardProps): React.ReactElement {
  const classes: KeyboardClassNames = { ...DEFAULT_CLASS_NAMES, ...classNames };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, midi: number) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onNoteOn(midi);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>, midi: number) => {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    onNoteOff(midi);
  };

  return (
    <div className={classes.container}>
      {octaves.map((octave) => (
        <div key={octave} className={classes.octaveGroup}>
          {WHITE_KEYS.map((key) => {
            const midi = (octave + 1) * 12 + key.midi;
            const active = activeNotes?.has(midi) ?? false;
            const isBass = typeof highlightBassBelowMidi === 'number' && midi < highlightBassBelowMidi;
            return (
              <button
                key={midi}
                className={[
                  classes.whiteKey,
                  active ? 'active' : '',
                  isBass ? classes.bassRange : '',
                ].filter(Boolean).join(' ')}
                onPointerDown={(event) => handlePointerDown(event, midi)}
                onPointerUp={(event) => handlePointerUp(event, midi)}
                onPointerCancel={(event) => handlePointerUp(event, midi)}
                onPointerLeave={(event) => {
                  if ((event.buttons & 1) !== 1) return;
                  handlePointerUp(event, midi);
                }}
              >
                {showLabels && <span className={classes.whiteKeyLabel}>{key.note}{octave}</span>}
              </button>
            );
          })}

          {BLACK_KEYS.map((key) => {
            const midi = (octave + 1) * 12 + key.midi;
            const active = activeNotes?.has(midi) ?? false;
            const leftPct = ((key.afterWhite + 1) / 7) * 100;
            return (
              <button
                key={midi}
                className={[classes.blackKey, active ? 'active' : ''].filter(Boolean).join(' ')}
                style={{ left: `${leftPct}%` }}
                onPointerDown={(event) => handlePointerDown(event, midi)}
                onPointerUp={(event) => handlePointerUp(event, midi)}
                onPointerCancel={(event) => handlePointerUp(event, midi)}
                onPointerLeave={(event) => {
                  if ((event.buttons & 1) !== 1) return;
                  handlePointerUp(event, midi);
                }}
              >
                {showLabels && showBlackLabels && (
                  <span className={classes.blackKeyLabel}>{key.note}{octave}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

