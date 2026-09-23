import { useMemo, useState } from 'react';

import SkipToMain from '../shared/components/SkipToMain';
import { AppShellLayout } from '../shared/layout/AppShellLayout';
import DetuneMatrixBar from './components/DetuneMatrixBar';
import MaqamKeyboard from './components/MaqamKeyboard';
import MaqamStaff from './components/MaqamStaff';
import TerminologyList from './components/TerminologyList';
import { MAQAM_PRESETS, PITCH_CLASS_NAMES } from './data/maqamPresets';
import { referenceStaffNotes, spellMidiNote } from './notation/maqamSpelling';
import { bentPitchClasses, formatCents } from './state/maqamTuning';
import { RIBBON_LENGTH, useMaqamState } from './state/useMaqamState';

/** Written octave the reference scale starts in. */
const REFERENCE_OCTAVE = 4;
/** Two octaves is enough to play a maqam and its upper jins without scrolling. */
const KEYBOARD_OCTAVES = [4, 5];

export default function App() {
  const {
    preset,
    presetId,
    matrix,
    isPresetTuning,
    keyTunings,
    activeNotes,
    ribbon,
    midiDevices,
    midiSupported,
    selectPreset,
    toggleSlot,
    resetTuning,
    noteOn,
    noteOff,
    clearRibbon,
  } = useMaqamState();

  const [matrixOpen, setMatrixOpen] = useState(false);

  const referenceNotes = useMemo(() => referenceStaffNotes(preset, REFERENCE_OCTAVE), [preset]);

  const ribbonNotes = useMemo(
    () => ribbon.map((note) => spellMidiNote(note.midiNote, note.cents, preset)),
    [ribbon, preset]
  );

  const bentKeys = bentPitchClasses(matrix);
  const connectedDevices = midiDevices.filter((device) => device.connected);

  return (
    <main id="main" className="maqam">
      <SkipToMain />
      <AppShellLayout
        header={
          <header className="maqam-header">
            <h1>Maqam Playground</h1>
            <p className="maqam-header__sub">
              Retune a piano keyboard and hear the notes between the keys.
            </p>
          </header>
        }
      >
        <div className="maqam-app">
          <section
            className="maqam-panel maqam-panel--choose"
            aria-labelledby="maqam-choose-heading"
          >
            <h2 id="maqam-choose-heading" className="maqam-panel__heading">
              Choose a maqam
            </h2>
            <div className="maqam-picker" role="radiogroup" aria-labelledby="maqam-choose-heading">
              {MAQAM_PRESETS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={option.id === presetId}
                  className={['maqam-picker__option', option.id === presetId ? 'is-selected' : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => selectPreset(option.id)}
                >
                  <span className="maqam-picker__name">{option.name}</span>
                  <span className="maqam-picker__translit">{option.transliteration}</span>
                </button>
              ))}
            </div>
            {preset && <p className="maqam-description">{preset.description}</p>}
          </section>

          <section className="maqam-panel maqam-panel--play" aria-labelledby="maqam-play-heading">
            <div className="maqam-panel__header">
              <h2 id="maqam-play-heading" className="maqam-panel__heading">
                Play it
              </h2>
              <p className="maqam-tuning-status" aria-live="polite">
                {bentKeys.length === 0
                  ? 'Every key in equal temperament'
                  : `${bentKeys.map((pc) => PITCH_CLASS_NAMES[pc]).join(' and ')} tuned ${formatCents(-50)}`}
                {!isPresetTuning && <span className="maqam-badge">Custom</span>}
              </p>
            </div>

            <MaqamKeyboard
              keyTunings={keyTunings}
              activeNotes={activeNotes}
              octaves={KEYBOARD_OCTAVES}
              onNoteOn={noteOn}
              onNoteOff={noteOff}
            />

            <p className="maqam-legend">
              <span className="maqam-legend__swatch maqam-legend__swatch--tonic" /> home
              <span className="maqam-legend__swatch maqam-legend__swatch--scale" /> in the maqam
              <span className="maqam-legend__swatch maqam-legend__swatch--microtonal" /> retuned
              {midiSupported && (
                <span className="maqam-legend__midi">
                  {connectedDevices.length > 0
                    ? `MIDI: ${connectedDevices.map((d) => d.name).join(', ')}`
                    : 'MIDI ready. Connect a keyboard.'}
                </span>
              )}
            </p>
          </section>

          <section className="maqam-panel maqam-panel--read" aria-labelledby="maqam-read-heading">
            <h2 id="maqam-read-heading" className="maqam-panel__heading">
              Read it
            </h2>

            <div className="maqam-staves">
              <figure className="maqam-stave-figure">
                <figcaption className="maqam-stave-figure__caption">
                  {preset ? preset.name : 'Scale'}
                </figcaption>
                <MaqamStaff notes={referenceNotes} />
              </figure>

              <figure className="maqam-stave-figure">
                <figcaption className="maqam-stave-figure__caption">
                  Last {RIBBON_LENGTH} notes
                  {ribbon.length > 0 && (
                    <button type="button" className="maqam-text-button" onClick={clearRibbon}>
                      Clear
                    </button>
                  )}
                </figcaption>
                <MaqamStaff notes={ribbonNotes} emptyMessage="Play a key and it appears here." />
              </figure>
            </div>
          </section>

          <section className="maqam-panel maqam-panel--build" aria-labelledby="maqam-build-heading">
            <div className="maqam-panel__header">
              <h2 id="maqam-build-heading" className="maqam-panel__heading">
                Build your own
              </h2>
              <div className="maqam-panel__actions">
                {!isPresetTuning && preset && (
                  <button type="button" className="maqam-text-button" onClick={resetTuning}>
                    Back to {preset.name}
                  </button>
                )}
                <button
                  type="button"
                  className="maqam-text-button"
                  aria-expanded={matrixOpen}
                  onClick={() => setMatrixOpen((open) => !open)}
                >
                  {matrixOpen ? 'Hide' : 'Show'} the 12 keys
                </button>
              </div>
            </div>

            {matrixOpen && (
              <DetuneMatrixBar matrix={matrix} keyTunings={keyTunings} onToggle={toggleSlot} />
            )}
          </section>

          {preset && preset.primaryAjnas.length > 0 && (
            <section className="maqam-panel" aria-labelledby="maqam-ajnas-heading">
              <h2 id="maqam-ajnas-heading" className="maqam-panel__heading">
                What it is made of
              </h2>
              <ul className="maqam-ajnas">
                {preset.primaryAjnas.map((jins) => (
                  <li key={jins.id} className="maqam-ajnas__item">
                    <span className="maqam-ajnas__name">{jins.name}</span>
                    <span className="maqam-ajnas__steps">
                      {jins.intervalsInCents.map((c) => `${c}`).join(' · ')} cents
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="maqam-panel" aria-labelledby="maqam-terms-heading">
            <h2 id="maqam-terms-heading" className="maqam-panel__heading">
              Words used here
            </h2>
            <TerminologyList />
          </section>
        </div>
      </AppShellLayout>
    </main>
  );
}
