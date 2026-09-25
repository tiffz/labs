import { useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';

import SkipToMain from '../shared/components/SkipToMain';
import DetuneMatrixBar from './components/DetuneMatrixBar';
import HowMaqamsWork from './components/HowMaqamsWork';
import JinsBreakdown from './components/JinsBreakdown';
import MaqamKeyboard from './components/MaqamKeyboard';
import MaqamStaff from './components/MaqamStaff';
import MidiStatusBadge from './components/MidiStatusBadge';
import { MAQAM_PRESETS, PITCH_CLASS_NAMES } from './data/maqamPresets';
import {
  GENERATED_MELODY_ID,
  MELODY_PATTERNS,
  findMelodyDefinition,
} from './melody/maqamMelody';
import { bentPitchClasses, formatCents, liveScaleLabels } from './state/maqamTuning';
import { useMaqamState } from './state/useMaqamState';

/**
 * Three octaves, centred on middle C. Two was enough to play a maqam and its
 * upper jins, but left the board looking like a toy beside a full-width staff —
 * and a maqam's sayr regularly dips below the tonic.
 */
const KEYBOARD_OCTAVES = [3, 4, 5];

/** "C♯, E and B" — the list separator is a comma, and only the last one is "and". */
const LIST_FORMAT = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });
const listJoin = (items: string[]): string => LIST_FORMAT.format(items);

export default function App() {
  const {
    preset,
    presetId,
    matrix,
    isPresetTuning,
    keyTunings,
    activeNotes,
    midiDevices,
    midiSupported,
    audioBlocked,
    selectPreset,
    toggleSlot,
    resetTuning,
    noteOn,
    noteOff,
    melodyId,
    melody,
    isPlaying,
    playingIndex,
    selectMelody,
    shuffleMelody,
    togglePlayback,
  } = useMaqamState();

  const [tuningOpen, setTuningOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const staffNotes = useMemo(
    () => melody.map((note) => ({ ...note.staff, duration: note.duration })),
    [melody],
  );

  /**
   * Which staff notes to light.
   *
   * During playback that is the note the audio clock says is sounding. When
   * idle it is every note matching a held key, so pressing E lights every E in
   * the phrase — one key really is every octave of its pitch class here.
   */
  const litNotes = useMemo(() => {
    if (playingIndex !== null) return new Set([playingIndex]);
    if (activeNotes.size === 0) return new Set<number>();
    const heldClasses = new Set([...activeNotes].map((midi) => ((midi % 12) + 12) % 12));
    const lit = new Set<number>();
    melody.forEach((note, index) => {
      if (heldClasses.has(((note.midiNote % 12) + 12) % 12)) lit.add(index);
    });
    return lit;
  }, [melody, playingIndex, activeNotes]);

  /**
   * The note the melody is sounding, and the octaves that echo it.
   *
   * Both, because they are different facts. The primary journey is "watch which
   * key makes that sound", and lighting all three octaves at full strength gave
   * that question three equally loud answers — three solid slabs marching
   * across the board for one note. The octave being played now gets the loud
   * state; its siblings get the quiet one.
   */
  const playingNote = useMemo(
    () => (playingIndex === null ? undefined : melody[playingIndex]?.midiNote),
    [melody, playingIndex],
  );

  const melodyDescription =
    melodyId === GENERATED_MELODY_ID
      ? 'A phrase generated in this maqam: mostly stepwise, resolving to the tonic.'
      : findMelodyDefinition(melodyId)?.description;

  const bentKeys = bentPitchClasses(matrix);

  return (
    <main id="main" className="maqam">
      <SkipToMain />

      {/*
        One viewport, three bands: choose, read, play. No page scroll — every
        control is reachable without moving the page. The shared AppShellLayout
        is deliberately not used: it provides a scrolling content region, the
        opposite of what this app wants.
      */}
      <div className="maqam-shell">
        <header className="maqam-topbar">
          <h1 className="maqam-topbar__title">Maqam Playground</h1>

          <TextField
            select
            size="small"
            label="Maqam"
            value={presetId}
            onChange={(event) => selectPreset(event.target.value)}
            className="maqam-topbar__picker"
            slotProps={{ select: { native: true } }}
          >
            {/*
              A native select: 9 options is a list, not a menu, and the platform
              picker is better on a phone than a rendered popover.
            */}
            {MAQAM_PRESETS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} · {option.transliteration}
              </option>
            ))}
          </TextField>

          <Button variant="text" onClick={() => setHelpOpen(true)}>
            How maqamat work
          </Button>

          <MidiStatusBadge supported={midiSupported} devices={midiDevices} />
        </header>

        <div className="maqam-stage">
          <section className="maqam-stage__staff" aria-labelledby="maqam-scale-heading">
            <div className="maqam-stage__head">
              <h2 id="maqam-scale-heading" className="maqam-eyebrow">
                Melody
              </h2>
              <p className="maqam-stage__hint">
                {isPlaying ? 'playing' : 'press play, or press a key'}
              </p>
            </div>

            <Paper elevation={0} className="maqam-staff-surface">
              <MaqamStaff notes={staffNotes} highlighted={litNotes} />
            </Paper>

            <div className="maqam-melodybar">
              <Button
                variant="contained"
                disableElevation
                onClick={togglePlayback}
                className="maqam-melodybar__play"
              >
                {isPlaying ? 'Stop' : 'Play'}
              </Button>

              <TextField
                select
                size="small"
                label="Pattern"
                value={melodyId}
                onChange={(event) => selectMelody(event.target.value)}
                className="maqam-melodybar__pick"
                slotProps={{ select: { native: true } }}
              >
                {MELODY_PATTERNS.map((pattern) => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.name}
                  </option>
                ))}
                <option value={GENERATED_MELODY_ID}>Generated phrase</option>
              </TextField>

              <Button variant="outlined" size="small" disableElevation onClick={shuffleMelody}>
                New phrase
              </Button>
            </div>

            {melodyDescription && <p className="maqam-description">{melodyDescription}</p>}
          </section>

          {preset && (
            <aside className="maqam-stage__jins">
              <JinsBreakdown preset={preset} />
            </aside>
          )}
        </div>

        <section className="maqam-board" aria-labelledby="maqam-board-heading">
          <h2 id="maqam-board-heading" className="maqam-visually-hidden">
            Keyboard
          </h2>

          <MaqamKeyboard
            keyTunings={keyTunings}
            activeNotes={activeNotes}
            octaves={KEYBOARD_OCTAVES}
            playingMidiNote={playingNote}
            onNoteOn={noteOn}
            onNoteOff={noteOff}
          />

          {/* Only ever rendered when sound was asked for and did not arrive.
              A browser that has not been gestured at, or an exhausted audio
              context, otherwise leaves the user pressing keys in silence with
              the app showing every sign of working. */}
          {audioBlocked && (
            <p className="maqam-alert" role="status">
              No sound yet. Your browser holds audio until you interact with the
              page, so press a key again.
            </p>
          )}

          <div className="maqam-board__bar">
            {/* The maqam, read back in order. It sits with the board because it
                names the keys that are lit, and it follows the live tuning, so
                bending a key rewrites it. */}
            <p className="maqam-scaleline">
              {liveScaleLabels(preset, keyTunings).map((label, index) => (
                <span key={`${label}-${index}`} className="maqam-scaleline__note">
                  {label}
                </span>
              ))}
            </p>

            {/* One entry per visual channel, in the order the eye meets them.
                Membership is not one of them: the scale line directly above
                names the maqam's notes, which explains the bright keys better
                than a pair of 7px swatches ever did — and those rendered as two
                near-identical outlined boxes, one sample of a two-sample
                comparison. */}
            <p className="maqam-legend" aria-live="polite">
              <span className="maqam-legend__item">
                <span className="maqam-legend__dot" aria-hidden="true" />
                Tonic
              </span>
              {bentKeys.length > 0 && (
                <span className="maqam-legend__item">
                  <span className="maqam-legend__bend" aria-hidden="true">
                    ½♭
                  </span>
                  {/* "C♯, E and B", not "C♯ and E and B". */}
                  {listJoin(bentKeys.map((pc) => PITCH_CLASS_NAMES[pc]))}{' '}
                  {formatCents(-50)}
                </span>
              )}
              {!isPresetTuning && <span className="maqam-badge">Custom tuning</span>}
            </p>

            <div className="maqam-board__actions">
              {!isPresetTuning && preset && (
                <Button variant="text" size="small" onClick={resetTuning}>
                  Reset
                </Button>
              )}
              <Button
                variant={tuningOpen ? 'contained' : 'outlined'}
                size="small"
                disableElevation
                aria-expanded={tuningOpen}
                onClick={() => setTuningOpen((open) => !open)}
              >
                Tune keys
              </Button>
            </div>
          </div>

          {tuningOpen && (
            <DetuneMatrixBar matrix={matrix} keyTunings={keyTunings} onToggle={toggleSlot} />
          )}
        </section>
      </div>

      <HowMaqamsWork open={helpOpen} onClose={() => setHelpOpen(false)} />
    </main>
  );
}
