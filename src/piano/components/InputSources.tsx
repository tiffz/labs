import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePiano } from '../store';
import { midiToNoteName } from '../types';

const InputSources: React.FC = () => {
  const { state, toggleMicrophone, setSelectedMicrophoneDevice, toggleMidiInput } = usePiano();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const midiEnabled = state.midiInputEnabled;
  const hasMidi = state.midiConnected && midiEnabled;
  const hasMic = state.microphoneActive;
  const hasAny = hasMidi || hasMic;
  const activeNotes = state.activeMidiNotes;
  const selectedMicrophone = state.microphoneDevices.find(
    (device) => device.id === state.selectedMicrophoneDeviceId
  );
  const selectedMicrophoneName = selectedMicrophone?.name ?? 'System default';

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [open, close]);

  const statusLabel = hasAny
    ? [hasMidi && 'MIDI', hasMic && 'Mic'].filter(Boolean).join(' + ')
    : 'No input';

  return (
    <div className="input-sources" ref={ref}>
      <button className={`is-trigger ${hasAny ? 'connected' : ''}`} onClick={() => setOpen(v => !v)}>
        <span className={`is-dot ${hasAny ? 'on' : ''}`} />
        <span className="is-label">{statusLabel}</span>
        {activeNotes.size > 0 && (
          <span className="is-notes">
            {Array.from(activeNotes).slice(0, 4).map(n => (
              <span key={n} className="is-note-badge">{midiToNoteName(n)}</span>
            ))}
          </span>
        )}
        <span className="material-symbols-outlined is-arrow" style={{ fontSize: 16 }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="is-dropdown">
          <div className="is-section">
            <div className="is-row">
              <span className="material-symbols-outlined is-icon">piano</span>
              <div className="is-info">
                <span className="is-source-name">MIDI Controller</span>
                <span className={`is-status ${hasMidi ? 'ok' : 'off'}`}>
                  {state.midiConnected
                    ? (midiEnabled ? 'Connected' : 'Disabled')
                    : 'Not detected'}
                </span>
              </div>
              <button className={`is-toggle ${midiEnabled ? 'active' : ''}`} onClick={toggleMidiInput}>
                {midiEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>
            {!state.midiConnected && (
              <p className="is-help">
                Connect a MIDI keyboard or controller via USB, then refresh the page. Your browser will ask for permission to use MIDI devices.
              </p>
            )}
            {state.midiConnected && state.midiDevices.length > 0 && (
              <p className="is-device">{state.midiDevices[0].name}</p>
            )}
          </div>

          <div className="is-divider" />

          <div className="is-section">
            <div className="is-row">
              <span className="material-symbols-outlined is-icon">{hasMic ? 'mic' : 'mic_off'}</span>
              <div className="is-info">
                <span className="is-source-name">Microphone</span>
                <span className={`is-status ${hasMic ? 'ok' : 'off'}`}>
                  {hasMic ? 'Listening' : 'Off'}
                </span>
              </div>
              <button className={`is-toggle ${hasMic ? 'active' : ''}`} onClick={toggleMicrophone}>
                {hasMic ? 'Disable' : 'Enable'}
              </button>
            </div>
            {!hasMic && (
              <p className="is-help">
                Enable microphone input to practice with an acoustic piano. Works best in a quiet environment with a single instrument.
              </p>
            )}
            {state.microphoneDevices.length > 0 && (
              <div className="is-select-row">
                <label className="is-select-label" htmlFor="mic-device-select">Input device</label>
                <select
                  id="mic-device-select"
                  className="is-select"
                  value={state.selectedMicrophoneDeviceId}
                  onChange={(e) => setSelectedMicrophoneDevice(e.target.value)}
                >
                  {state.microphoneDevices.map((device) => (
                    <option key={device.id} value={device.id}>{device.name}</option>
                  ))}
                </select>
              </div>
            )}
            {!hasMic && (
              <p className="is-device">Selected: {selectedMicrophoneName}</p>
            )}
            {hasMic && state.activeMicrophoneLabel && (
              <p className="is-device">Using: {state.activeMicrophoneLabel}</p>
            )}
            {hasMic && state.detectedPitch !== null && (
              <p className="is-device">Detected: {midiToNoteName(state.detectedPitch)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InputSources;
