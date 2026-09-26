import { useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';

import SkipToMain from '../shared/components/SkipToMain';
import DetuneMatrixBar from './components/DetuneMatrixBar';
import JinsBreakdown from './components/JinsBreakdown';
import MaqamKeyboard from './components/MaqamKeyboard';
import MaqamStaff from './components/MaqamStaff';
import MidiStatusBadge from './components/MidiStatusBadge';
import RetuningNote from './components/RetuningNote';
import { PITCH_CLASS_NAMES, maqamatByFamily } from './data/maqamPresets';
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
    melody,
    isPlaying,
    playingIndex,
    togglePlayback,
  } = useMaqamState();

  const [tuningOpen, setTuningOpen] = useState(false);

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
              Grouped by family, because that is how maqamat are organised:
              "Maqamat are classified into families based on sharing the same
              first (root) jins" (maqamworld.com). The grouping is derived from
              each maqam's root jins rather than authored, so a new maqam files
              itself and a family can never disagree with the cell it is named
              for.

              Still a native select: the platform's own picker renders optgroups
              properly on a phone, which a hand-rolled two-tier menu would have
              to reimplement badly.
            */}
            {maqamatByFamily().map(({ family, maqamat }) => (
              <optgroup key={family} label={`${family} family`}>
                {maqamat.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} · {option.transliteration}
                  </option>
                ))}
              </optgroup>
            ))}
          </TextField>

          {/*
            The explainer this replaced was several screens of our own prose
            about a tradition nobody here is expert in. Linking out is the
            honest version: maqamworld.com is where every interval in this app
            came from, and it can say what a maqam is far better than we can.
          */}
          <Button
            variant="text"
            component="a"
            href="https://www.maqamworld.com/en/maqam.php"
            target="_blank"
            rel="noreferrer noopener"
          >
            Learn maqamat at maqamworld
          </Button>
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

            {/* Beside the control that failed, naming the action the user took.
                It used to render under the keyboard and say "press a key
                again" whichever control had failed, so someone who pressed
                Play was told to do something else, in a line 250px below the
                button and off-screen on a phone. */}
            {audioBlocked === 'playback' && (
              <p className="maqam-alert" role="status">
                No sound yet. Your browser holds audio until you interact with the page. Press Play
                again.
              </p>
            )}

            <div className="maqam-melodybar">
              <Button
                variant="contained"
                disableElevation
                onClick={togglePlayback}
                className="maqam-melodybar__play"
              >
                {isPlaying ? 'Stop' : 'Play'}
              </Button>
            </div>

          </section>

          {preset && (
            <aside className="maqam-stage__jins">
              <JinsBreakdown preset={preset} isPresetTuning={isPresetTuning} />
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

          {audioBlocked === 'keyboard' && (
            <p className="maqam-alert" role="status">
              No sound yet. Your browser holds audio until you interact with the page. Press a key
              again.
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
                Membership is back, because the swatch can now show it: cool
                against warm is a difference you can see at 14px, which the
                previous bright-against-dim pair was not. */}
            <p className="maqam-legend" aria-live="polite">
              <span className="maqam-legend__item">
                <span className="maqam-legend__swatch" aria-hidden="true" />
                In this maqam
              </span>
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
              {/* Beside the keyboard, because that is the thing it is about:
                  a controller plays THIS board, retuned. In the topbar it read
                  as app chrome and answered a question nobody had yet. */}
              <MidiStatusBadge supported={midiSupported} devices={midiDevices} />
              <RetuningNote />
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
    </main>
  );
}
