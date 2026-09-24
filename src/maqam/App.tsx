import { useMemo, useState } from 'react';

import SkipToMain from '../shared/components/SkipToMain';
import DetuneMatrixBar from './components/DetuneMatrixBar';
import HowMaqamsWork from './components/HowMaqamsWork';
import JinsBreakdown from './components/JinsBreakdown';
import MaqamKeyboard from './components/MaqamKeyboard';
import MaqamStaff from './components/MaqamStaff';
import { MAQAM_PRESETS, PITCH_CLASS_NAMES } from './data/maqamPresets';
import { highlightedDegreeIndices, referenceStaffNotes } from './notation/maqamSpelling';
import { bentPitchClasses, formatCents } from './state/maqamTuning';
import { useMaqamState } from './state/useMaqamState';

/** Written octave the reference scale starts in. */
const REFERENCE_OCTAVE = 4;
/** Two octaves is enough to play a maqam and its upper jins. */
const KEYBOARD_OCTAVES = [4, 5];

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
    selectPreset,
    toggleSlot,
    resetTuning,
    noteOn,
    noteOff,
  } = useMaqamState();

  const [tuningOpen, setTuningOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const scaleNotes = useMemo(() => referenceStaffNotes(preset, REFERENCE_OCTAVE), [preset]);
  const litDegrees = useMemo(
    () => highlightedDegreeIndices(preset, activeNotes),
    [preset, activeNotes],
  );

  const bentKeys = bentPitchClasses(matrix);
  const connectedDevices = midiDevices.filter((device) => device.connected);

  return (
    <main id="main" className="maqam">
      <SkipToMain />

      {/*
        One viewport, three rows: choose, read, play. No page scroll — every
        control is reachable without moving the page, which is the point of the
        layout. The shared AppShellLayout is deliberately not used here: it
        provides a scrolling content region, which is the opposite of what this
        app wants.
      */}
      <div className="maqam-shell">
        <header className="maqam-topbar">
          <h1 className="maqam-topbar__title">Maqam Playground</h1>

          <label className="maqam-topbar__picker">
            <span className="maqam-visually-hidden">Maqam</span>
            <select
              className="maqam-select"
              value={presetId}
              onChange={(event) => selectPreset(event.target.value)}
            >
              {MAQAM_PRESETS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} · {option.transliteration}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="maqam-topbar__help" onClick={() => setHelpOpen(true)}>
            How maqamat work
          </button>
        </header>

        {preset && <p className="maqam-description">{preset.description}</p>}

        <div className="maqam-stage">
          <section className="maqam-stage__staff" aria-labelledby="maqam-scale-heading">
            <h2 id="maqam-scale-heading" className="maqam-panel__heading">
              The scale
              <span className="maqam-stage__hint">press a key to light its note</span>
            </h2>
            <MaqamStaff notes={scaleNotes} highlighted={litDegrees} />
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
            onNoteOn={noteOn}
            onNoteOff={noteOff}
          />

          <div className="maqam-board__bar">
            <p className="maqam-tuning-status" aria-live="polite">
              <span className="maqam-legend__swatch maqam-legend__swatch--tonic" /> home
              <span className="maqam-legend__swatch maqam-legend__swatch--scale" /> in the maqam
              {bentKeys.length > 0 && (
                <>
                  <span className="maqam-legend__swatch maqam-legend__swatch--microtonal" />
                  {bentKeys.map((pc) => PITCH_CLASS_NAMES[pc]).join(' and ')} tuned{' '}
                  {formatCents(-50)}
                </>
              )}
              {!isPresetTuning && <span className="maqam-badge">Custom</span>}
            </p>

            <div className="maqam-board__actions">
              {midiSupported && (
                <span className="maqam-board__midi">
                  {connectedDevices.length > 0
                    ? `MIDI: ${connectedDevices.map((d) => d.name).join(', ')}`
                    : 'MIDI ready'}
                </span>
              )}
              {!isPresetTuning && preset && (
                <button type="button" className="maqam-text-button" onClick={resetTuning}>
                  Reset
                </button>
              )}
              <button
                type="button"
                className="maqam-text-button"
                aria-expanded={tuningOpen}
                onClick={() => setTuningOpen((open) => !open)}
              >
                {tuningOpen ? 'Hide tuning' : 'Tune keys'}
              </button>
            </div>
          </div>

          {tuningOpen && (
            <DetuneMatrixBar matrix={matrix} keyTunings={keyTunings} onToggle={toggleSlot} />
          )}
        </section>
      </div>

      {helpOpen && <HowMaqamsWork onClose={() => setHelpOpen(false)} />}
    </main>
  );
}
