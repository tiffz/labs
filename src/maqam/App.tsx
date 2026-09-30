import { useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';

import SkipToMain from '../shared/components/SkipToMain';
import KeyTuningRail from './components/KeyTuningRail';
import MaqamCard from './components/MaqamCard';
import MaqamKeyboard from './components/MaqamKeyboard';
import MaqamStaff from './components/MaqamStaff';
import KeyboardNote from './components/KeyboardNote';
import { MAQAM_PRESETS, ajnasSpans } from './data/maqamPresets';
import { pitchClassOf } from './notation/maqamAccidentals';
import { describeTuning, liveScaleLabels } from './state/maqamTuning';
import { useMaqamState } from './state/useMaqamState';

/**
 * Three octaves, centred on middle C. Two was enough to play a maqam and its
 * upper jins, but left the board looking like a toy beside a full-width staff —
 * and a maqam's sayr regularly dips below the tonic.
 */
const KEYBOARD_OCTAVES = [3, 4, 5];


export default function App() {
  const {
    preset,
    presetId,
    matrix,
    keyTunings,
    activeNotes,
    midiDevices,
    midiSupported,
    audioLatency,
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

  /**
   * The jins the reader is pointing at in the maqam card, or `null`.
   *
   * One piece of state drives three surfaces: which bracket is drawn over the
   * staff, which noteheads are emphasised, and which keys keep their degree
   * numeral. Two brackets drawn at once cannot answer "which of you owns the
   * shared note"; one at a time, pointed at in turn, answers it by
   * construction.
   */
  const [activeJinsId, setActiveJinsId] = useState<string | null>(null);


  const staffNotes = useMemo(
    () => melody.map((note) => ({ ...note.staff, duration: note.duration })),
    [melody],
  );

  /*
   * The brackets over the staff, which is the one place the app draws a maqam
   * as what it is: cells joined at a shared degree. The staff shows the same
   * ascending scale the melody does, so a cell's scale indices are its note
   * indices — but only while that stays true, which is what the guard in the
   * e2e checks by counting brackets against the panel.
   */
  const brackets = useMemo(() => {
    if (!preset || !activeJinsId) return undefined;
    const spans = ajnasSpans(preset);
    const index = spans.findIndex((span) => span.id === activeJinsId);
    if (index < 0) return undefined;
    const span = spans[index];
    return [
      {
        id: span.id,
        label: span.name,
        from: span.fromIndex,
        to: span.toIndex,
        /* 1-based, so it lines up with the `--maqam-jins-N` tokens and with
           the chip's own `data-jins`. */
        tone: index + 1,
      },
    ];
  }, [preset, activeJinsId]);

  /** The scale degrees of the jins being pointed at, for the keyboard. */
  const activeSpan = useMemo(() => {
    if (!preset || !activeJinsId) return undefined;
    return ajnasSpans(preset).find((span) => span.id === activeJinsId);
  }, [preset, activeJinsId]);

  /**
   * Which pitch classes that jins covers. Pitch classes rather than scale
   * indices because the keyboard has three octaves of each, and a jins that
   * spans the octave (Nahawand on Kurd's 4th) must light both its Ds.
   */
  const activePitchClasses = useMemo(() => {
    if (!preset || !activeSpan) return undefined;
    const classes = new Set<number>();
    for (let index = activeSpan.fromIndex; index <= activeSpan.toIndex; index += 1) {
      const degree = preset.scaleDegrees[index];
      if (degree) classes.add(pitchClassOf(degree));
    }
    return classes;
  }, [preset, activeSpan]);

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

  /*
   * Bending a note the maqam does not use is preparing, not altering — it is
   * how a player sets up a modulation, and Rast's commonest one is described
   * on maqamworld as "practically obligatory". Reporting that as "Custom
   * tuning" told the user they had broken something.
   */
  const tuning = describeTuning(preset, matrix, MAQAM_PRESETS);

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
          {/* The app's name, set as a name rather than as a label. The maqam
              picker and the glossary used to sit beside it; both are about the
              maqam, so both moved into the card that is about the maqam. */}
          <h1 className="maqam-topbar__title">
            <span className="maqam-topbar__word">Maqam</span>
            <span className="maqam-topbar__word maqam-topbar__word--light">Playground</span>
          </h1>
        </header>

        <div className="maqam-stage">
          <section className="maqam-stage__staff" aria-labelledby="maqam-scale-heading">
            {/* No eyebrow, no hint. "MELODY" labelled a five-line stave with a
                treble clef on it, and "press play, or press a key" narrated a
                button and a piano both visible without scrolling. */}
            <h2 id="maqam-scale-heading" className="maqam-visually-hidden">
              {preset ? `${preset.name} scale` : 'Scale'}
            </h2>

            {/* Play lives in the card, under the music it plays — M3 puts a
                card's actions inside it. Floating on the page below the card,
                it left a hole beside a full reference panel and read as a
                stray control belonging to nothing. */}
            <Paper elevation={0} className="maqam-staff-surface">
              {/* The bracket row is reserved whether or not a bracket is in
                  it, so pointing at a jins cannot make the music jump. */}
              <MaqamStaff
                notes={staffNotes}
                highlighted={litNotes}
                brackets={brackets}
                reserveBracketRow={(preset?.primaryAjnas.length ?? 0) > 0}
              />

              {/* Beside the control that failed, naming the action the user
                  took. It used to render under the keyboard and say "press a
                  key again" whichever control had failed, so someone who
                  pressed Play was told to do something else, in a line 250px
                  below the button and off-screen on a phone. */}
              {audioBlocked === 'playback' && (
                <p className="maqam-alert" role="status">
                  No sound yet. Your browser holds audio until you interact with the page. Press
                  Play again.
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
            </Paper>
          </section>

          {preset && (
            <aside className="maqam-stage__jins" aria-labelledby="maqam-card-heading">
              <MaqamCard
                preset={preset}
                presetId={presetId}
                onSelectPreset={selectPreset}
                isPresetTuning={tuning.kind === 'preset' || tuning.kind === 'prepared'}
                activeJinsId={activeJinsId}
                onActiveJinsChange={setActiveJinsId}
              />
            </aside>
          )}
        </div>

        <section className="maqam-board" aria-labelledby="maqam-board-heading">
          <h2 id="maqam-board-heading" className="maqam-visually-hidden">
            Keyboard
          </h2>

          {/* Twelve levers, outside the scroll host: inside it, bending B on a
              phone meant scrolling the keyboard sideways to reach its switch. */}
          <KeyTuningRail matrix={matrix} onToggle={toggleSlot} />

          {/*
            The keys scroll on their own now.
            Three octaves of fingertip-sized keys do not fit 390px, so the
            instrument scrolls sideways — but only the keys did, while the
            rail of switches above them kept its full width and pushed the
            whole page 71px wider than the phone. It also meant scrolling the
            keys slid them out from under the switches that label them, which
            is the entire design of the rail.
          */}
          <div
            className="maqam-instrument"
            data-labs-allow-horizontal-scroll
          >
            <MaqamKeyboard
              keyTunings={keyTunings}
              activeNotes={activeNotes}
              octaves={KEYBOARD_OCTAVES}
              playingMidiNote={playingNote}
              inJinsPitchClasses={activePitchClasses}
              inJinsTone={brackets?.[0]?.tone}
              onNoteOn={noteOn}
              onNoteOff={noteOff}
            />
          </div>

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

            {/* No legend. It existed to decode a colour, and the board does
                not use one any more: each key in the maqam carries its degree,
                and degree 1 is filled. A line of prose explaining two swatches
                was the app narrating a mark the mark already makes. */}

            <div className="maqam-board__actions">
              {tuning.kind === 'spells' && (
                <span className="maqam-badge">Now spells {tuning.name}</span>
              )}
              {tuning.kind === 'unnamed' && <span className="maqam-badge">Not a named maqam</span>}
              {/* One control: why the keys are retuned, and how to play them
                  with a real keyboard. Two chips in one corner asked the
                  reader to work out they were the same conversation. */}
              <KeyboardNote
                supported={midiSupported}
                devices={midiDevices}
                latency={audioLatency}
              />
              {preset && tuning.kind !== 'preset' && tuning.kind !== 'prepared' && (
                <Button variant="text" size="small" onClick={resetTuning}>
                  Reset
                </Button>
              )}
            </div>
          </div>

        </section>
      </div>
    </main>
  );
}
