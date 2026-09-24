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
import { MAQAM_PRESETS, PITCH_CLASS_NAMES } from './data/maqamPresets';
import { highlightedDegreeIndices, referenceStaffNotes } from './notation/maqamSpelling';
import { bentPitchClasses, formatCents } from './state/maqamTuning';
import { useMaqamState } from './state/useMaqamState';

/** Written octave the reference scale starts in. */
const REFERENCE_OCTAVE = 4;
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
        </header>

        <div className="maqam-stage">
          <section className="maqam-stage__staff" aria-labelledby="maqam-scale-heading">
            <div className="maqam-stage__head">
              <h2 id="maqam-scale-heading" className="maqam-eyebrow">
                The scale
              </h2>
              <p className="maqam-stage__hint">press a key to light its note</p>
            </div>
            <Paper elevation={0} className="maqam-staff-surface">
              <MaqamStaff notes={scaleNotes} highlighted={litDegrees} />
            </Paper>
            {preset && <p className="maqam-description">{preset.description}</p>}
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
            <p className="maqam-legend" aria-live="polite">
              <span className="maqam-legend__item">
                <span className="maqam-legend__swatch maqam-legend__swatch--tonic" />
                Home
              </span>
              <span className="maqam-legend__item">
                <span className="maqam-legend__swatch maqam-legend__swatch--scale" />
                In the maqam
              </span>
              {bentKeys.length > 0 && (
                <span className="maqam-legend__item">
                  <span className="maqam-legend__swatch maqam-legend__swatch--microtonal" />
                  {bentKeys.map((pc) => PITCH_CLASS_NAMES[pc]).join(' and ')} tuned{' '}
                  {formatCents(-50)}
                </span>
              )}
              {!isPresetTuning && <span className="maqam-badge">Custom tuning</span>}
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
