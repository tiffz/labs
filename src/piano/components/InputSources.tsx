import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePiano } from '../store';
import { midiToNoteName } from '../../shared/music/scoreTypes';
import './inputSources.css';

const InputSources: React.FC = () => {
  const { state, toggleMicrophone, setSelectedMicrophoneDevice, toggleMidiInput } = usePiano();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open, close]);

  const midiEnabled = state.midiInputEnabled;
  const hasMidi = state.midiConnected && midiEnabled;
  const hasMic = state.microphoneActive;
  const hasAny = hasMidi || hasMic;

  const label = hasMidi && hasMic
    ? 'Keyboard + Mic'
    : hasMidi
      ? 'Keyboard'
      : hasMic
        ? 'Mic'
        : 'No input';

  return (
    <div className="pi-input" ref={ref}>
      <button className={`pi-input-trigger${hasAny ? ' active' : ''}`} onClick={() => setOpen(v => !v)}>
        <span className={`pi-input-dot${hasAny ? ' on' : ''}`} />
        <span className="pi-input-label">{label}</span>
        {state.activeMidiNotes.size > 0 && (
          <span className="pi-input-notes">
            {Array.from(state.activeMidiNotes).slice(0, 4).map(n => (
              <span key={n} className="pi-input-badge">{midiToNoteName(n)}</span>
            ))}
          </span>
        )}
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="pi-input-dropdown">
          {/* Keyboard */}
          <div className="pi-input-section">
            <div className="pi-input-row">
              <span className="material-symbols-outlined pi-input-icon">piano</span>
              <div className="pi-input-meta">
                <span className="pi-input-name">Keyboard</span>
                <span className={`pi-input-status${hasMidi ? ' on' : ''}`}>
                  {state.midiConnected ? (midiEnabled ? 'Connected' : 'Paused') : 'Not detected'}
                </span>
              </div>
              {state.midiConnected && (
                <button className={`pi-input-btn${midiEnabled ? ' on' : ''}`} onClick={() => toggleMidiInput()}>
                  {midiEnabled ? 'On' : 'Off'}
                </button>
              )}
            </div>
            {state.midiConnected && state.midiDevices.length > 0 && (
              <p className="pi-input-detail">{state.midiDevices[0].name}</p>
            )}
            {!state.midiConnected && (
              <p className="pi-input-hint">Connect a MIDI keyboard via USB.</p>
            )}
          </div>

          <hr className="pi-input-divider" />

          {/* Microphone */}
          <div className="pi-input-section">
            <div className="pi-input-row">
              <span className="material-symbols-outlined pi-input-icon">{hasMic ? 'mic' : 'mic_off'}</span>
              <div className="pi-input-meta">
                <span className="pi-input-name">Microphone</span>
                <span className={`pi-input-status${hasMic ? ' on' : ''}`}>
                  {hasMic ? 'Listening' : 'Off'}
                </span>
              </div>
              <button className={`pi-input-btn${hasMic ? ' on' : ''}`} onClick={toggleMicrophone}>
                {hasMic ? 'On' : 'Off'}
              </button>
            </div>
            {!hasMic && (
              <p className="pi-input-hint">For acoustic pianos. Works best in a quiet room.</p>
            )}
            {state.microphoneDevices && state.microphoneDevices.length > 0 && setSelectedMicrophoneDevice && (
              <div className="pi-input-select-row">
                <label className="pi-input-select-label" htmlFor="pi-mic-select">Device</label>
                <select
                  id="pi-mic-select"
                  className="pi-input-select"
                  value={state.selectedMicrophoneDeviceId}
                  onChange={(e) => setSelectedMicrophoneDevice(e.target.value)}
                >
                  {state.microphoneDevices.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
            {hasMic && state.activeMicrophoneLabel && (
              <p className="pi-input-detail">Using: {state.activeMicrophoneLabel}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InputSources;
