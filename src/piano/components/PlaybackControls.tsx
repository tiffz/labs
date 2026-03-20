import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePiano, type ActiveMode } from '../store';
import { SOUND_OPTIONS, type SoundType } from '../../chords/types/soundOptions';
import DrumAccompaniment from '../../beat/components/DrumAccompaniment';
import type { NotationStyle } from '../../shared/notation/DrumNotationMini';

const PIANO_DRUM_STYLE: NotationStyle = {
  staffColor: '#94a3b8',
  noteColor: '#64748b',
  textColor: '#64748b',
  highlightColor: '#7c3aed',
};

const PART_LABELS: Record<string, string> = { rh: 'Treble', lh: 'Bass' };

interface SettingsDropdownProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  state: { masterVolume: number; masterMuted: boolean; metronomeVolume: number; metronomeEnabled: boolean; score: { parts: { id: string; name: string }[] } | null; trackMuted: Map<string, boolean>; trackVolume: Map<string, number>; soundType: string; activeMode: string };
  isActive: boolean;
  onMasterVolume: (v: number) => void;
  onMasterMute: () => void;
  onMetronomeVolume: (v: number) => void;
  onMetronomeToggle: () => void;
  onTrackMute: (id: string) => void;
  onTrackVolume: (id: string, v: number) => void;
  onSoundChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SettingsDropdown = React.forwardRef<HTMLDivElement, SettingsDropdownProps>(
  ({ anchorRef, state, isActive, onMasterVolume, onMasterMute, onMetronomeVolume, onMetronomeToggle, onTrackMute, onTrackVolume, onSoundChange }, ref) => {
    const [pos, setPos] = useState({ top: 0, right: 0 });

    useEffect(() => {
      const update = () => {
        if (!anchorRef.current) return;
        const r = anchorRef.current.getBoundingClientRect();
        setPos({
          top: r.bottom + 6,
          right: Math.max(8, window.innerWidth - r.right),
        });
      };
      update();
      window.addEventListener('scroll', update, true);
      window.addEventListener('resize', update);
      return () => {
        window.removeEventListener('scroll', update, true);
        window.removeEventListener('resize', update);
      };
    }, [anchorRef]);

    return (
      <div className="sb-settings-dropdown" ref={ref} style={{ top: pos.top, right: pos.right }}>
        <div className="sb-settings-section">
          <div className="sb-settings-row">
            <button className="btn btn-small" onClick={onMasterMute} title={state.masterMuted ? 'Unmute all' : 'Mute all'}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {state.masterMuted ? 'volume_off' : 'volume_up'}
              </span>
            </button>
            <span className="sb-settings-label">Master</span>
            <input type="range" min={0} max={1} step={0.01} value={state.masterVolume}
              onChange={e => onMasterVolume(parseFloat(e.target.value))}
              className={`volume-slider ${state.masterMuted ? 'disabled-slider' : ''}`}
              disabled={state.masterMuted} />
          </div>
          <div className="sb-settings-row">
            <button className="btn btn-small" onClick={onMetronomeToggle}
              title={state.metronomeEnabled ? 'Mute metronome' : 'Unmute metronome'}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {state.metronomeEnabled ? 'timer' : 'timer_off'}
              </span>
            </button>
            <span className="sb-settings-label">Metronome</span>
            <input type="range" min={0} max={1} step={0.01} value={state.metronomeVolume}
              onChange={e => onMetronomeVolume(parseFloat(e.target.value))}
              className={`volume-slider ${!state.metronomeEnabled ? 'disabled-slider' : ''}`}
              disabled={!state.metronomeEnabled} />
          </div>
        </div>
        <div className="sb-settings-divider" />
        <div className="sb-settings-section">
          {state.score?.parts.map(part => {
            const muted = state.trackMuted.get(part.id) ?? false;
            return (
              <div key={part.id} className="sb-settings-row">
                <button className="btn btn-small" onClick={() => onTrackMute(part.id)}
                  title={`${muted ? 'Unmute' : 'Mute'} ${PART_LABELS[part.id] ?? part.name}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {muted ? 'volume_off' : 'volume_up'}
                  </span>
                </button>
                <span className="sb-settings-label">{PART_LABELS[part.id] ?? part.name}</span>
                <input type="range" min={0} max={1} step={0.01}
                  value={state.trackVolume.get(part.id) ?? 1}
                  onChange={e => onTrackVolume(part.id, parseFloat(e.target.value))}
                  className={`volume-slider ${muted ? 'disabled-slider' : ''}`}
                  disabled={muted} />
              </div>
            );
          })}
        </div>
        <div className="sb-settings-divider" />
        <div className="sb-settings-section">
          <label className="sb-settings-label" style={{ marginBottom: 4, display: 'block' }}>Instrument</label>
          <select value={state.soundType} onChange={onSoundChange} className="sb-full sound-select" disabled={isActive}>
            {SOUND_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }
);
SettingsDropdown.displayName = 'SettingsDropdown';

const PlaybackControls: React.FC = () => {
  const { state, dispatch, engine, startMode, stopMode } = usePiano();
  const hasVocalPart = useMemo(() => state.score?.parts.some(p => p.hand === 'voice') ?? false, [state.score]);
  const [tempoInput, setTempoInput] = useState(String(state.tempo));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempoInput(String(state.tempo));
  }, [state.tempo]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        settingsRef.current && !settingsRef.current.contains(e.target as Node) &&
        settingsBtnRef.current && !settingsBtnRef.current.contains(e.target as Node)
      ) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [settingsOpen]);

  const commitTempo = (raw: string) => {
    const parsed = parseInt(raw);
    if (!isNaN(parsed)) {
      const clamped = Math.max(20, Math.min(300, parsed));
      dispatch({ type: 'SET_TEMPO', tempo: clamped });
      engine.setTempo(clamped);
      setTempoInput(String(clamped));
    } else {
      setTempoInput(String(state.tempo));
    }
  };

  const handleTempoBlur = () => commitTempo(tempoInput);
  const handleTempoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitTempo(tempoInput);
  };

  const setTempoMultiplied = (factor: number) => {
    const newTempo = Math.max(20, Math.min(300, Math.round(state.tempo * factor)));
    dispatch({ type: 'SET_TEMPO', tempo: newTempo });
    engine.setTempo(newTempo);
  };

  const handleMetronomeToggle = () => {
    const enabled = !state.metronomeEnabled;
    dispatch({ type: 'SET_METRONOME', enabled });
    engine.setMetronome(enabled);
  };

  const handleLoopToggle = () => {
    const newEnabled = !state.loopingEnabled;
    dispatch({ type: 'SET_LOOPING', enabled: newEnabled });
    engine.setLoop(newEnabled);
  };

  const handleSoundChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const soundType = e.target.value as SoundType;
    dispatch({ type: 'SET_SOUND_TYPE', soundType });
    if (soundType === 'piano-sampled') {
      dispatch({ type: 'SET_SAMPLE_LOADING', progress: { loaded: 0, total: 1 } });
      await engine.prepareSoundType(soundType, (loaded, total) => {
        dispatch({ type: 'SET_SAMPLE_LOADING', progress: { loaded, total } });
      });
      dispatch({ type: 'SET_SAMPLE_LOADING', progress: null });
    }
  };

  const handleTrackMute = (partId: string) => {
    const muted = !(state.trackMuted.get(partId) ?? false);
    dispatch({ type: 'SET_TRACK_MUTED', partId, muted });
    engine.setTrackMuted(partId, muted);
  };

  const handleTrackVolume = (partId: string, value: number) => {
    dispatch({ type: 'SET_TRACK_VOLUME', partId, volume: value });
    engine.setTrackVolume(partId, value);
  };

  const handleMasterVolume = (value: number) => {
    dispatch({ type: 'SET_MASTER_VOLUME', volume: value });
    engine.setMasterVolume(state.masterMuted ? 0 : value);
  };

  const handleMasterMute = () => {
    const muted = !state.masterMuted;
    dispatch({ type: 'SET_MASTER_MUTED', muted });
    engine.setMasterVolume(muted ? 0 : state.masterVolume);
  };

  const handleMetronomeVolume = (value: number) => {
    dispatch({ type: 'SET_METRONOME_VOLUME', volume: value });
    engine.setMetronomeVolume(value);
  };

  const handleModeToggle = (mode: ActiveMode) => {
    if (state.activeMode === mode) {
      stopMode();
    } else {
      startMode(mode);
    }
  };

  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const showTip = useCallback((e: React.MouseEvent, text: string) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({ text, x: r.left + r.width / 2, y: r.top });
  }, []);
  const hideTip = useCallback(() => setTip(null), []);

  const isActive = state.activeMode !== 'none';
  const isPracticing = state.activeMode === 'practice' || state.activeMode === 'free-practice';

  return (
    <div className="sidebar-playback">
      <div className="sb-mode-buttons">
        <button
          className={`sb-mode-btn practice-primary ${state.activeMode === 'practice' ? 'active practice' : ''}`}
          onClick={() => handleModeToggle('practice')}
          disabled={!state.score || (!state.midiConnected && state.activeMode !== 'practice')}
          onMouseEnter={e => showTip(e, !state.midiConnected ? 'Connect a MIDI controller to practice' : 'Play along with the metronome and get timing feedback')}
          onMouseLeave={hideTip}
        >
          <span className="material-symbols-outlined">{state.activeMode === 'practice' ? 'pause' : 'play_arrow'}</span>
          <span className="sb-mode-label">{state.activeMode === 'practice' ? 'Stop' : 'Practice'}</span>
        </button>
        <button
          className={`sb-mode-btn ${state.activeMode === 'free-practice' ? 'active free-practice' : ''}`}
          onClick={() => handleModeToggle('free-practice')}
          disabled={!state.score || (!state.midiConnected && state.activeMode !== 'free-practice')}
          onMouseEnter={e => showTip(e, !state.midiConnected ? 'Connect a MIDI controller for free tempo' : 'Play at your own pace — notes advance as you play correctly')}
          onMouseLeave={hideTip}
        >
          <span className="material-symbols-outlined">{state.activeMode === 'free-practice' ? 'pause' : 'slow_motion_video'}</span>
          <span className="sb-mode-label">{state.activeMode === 'free-practice' ? 'Stop' : 'Free Tempo'}</span>
        </button>
        <button
          className={`sb-mode-btn ${state.activeMode === 'play' ? 'active play' : ''}`}
          onClick={() => handleModeToggle('play')}
          disabled={!state.score}
          onMouseEnter={e => showTip(e, 'Listen to the score without practice tracking')}
          onMouseLeave={hideTip}
        >
          <span className="material-symbols-outlined">{state.activeMode === 'play' ? 'pause' : 'play_circle'}</span>
          <span className="sb-mode-label">{state.activeMode === 'play' ? 'Stop' : 'Play'}</span>
        </button>
      </div>

      {state.countingIn && (
        <div className="sb-counting-in">
          <span className="material-symbols-outlined sb-counting-icon">timer</span>
          Count-in...
        </div>
      )}

      {isPracticing && state.currentRunStartTime && (
        <div className="sb-live-stats">
          <span className="sb-live-label">Run #{(state.practiceSession?.runs.length ?? 0) + 1}</span>
          {state.practiceResults.length > 0 && (
            <span className="sb-live-accuracy">
              {Math.round(
                (state.practiceResults.filter(r => r.timing === 'perfect' && r.pitchCorrect).length /
                  state.practiceResults.length) * 100
              )}%
            </span>
          )}
        </div>
      )}

      <div className="sb-play-row">
        <div className="sb-tempo">
          <label className="sb-label">BPM</label>
          <input
            type="text"
            inputMode="numeric"
            value={tempoInput}
            onChange={e => setTempoInput(e.target.value)}
            onBlur={handleTempoBlur}
            onKeyDown={handleTempoKeyDown}
            className="sb-tempo-input"
            disabled={isActive}
          />
          <button
            className="btn btn-small sb-tempo-adj"
            onClick={() => setTempoMultiplied(0.5)}
            disabled={isActive}
            title="Half tempo"
          >
            ½×
          </button>
          <button
            className="btn btn-small sb-tempo-adj"
            onClick={() => setTempoMultiplied(2)}
            disabled={isActive}
            title="Double tempo"
          >
            2×
          </button>
        </div>
      </div>

      <div className="sb-icon-row">
        <button
          className={`metronome-btn ${state.metronomeEnabled ? 'active' : ''}`}
          onClick={handleMetronomeToggle}
          onMouseEnter={e => showTip(e, `Metronome ${state.metronomeEnabled ? '(on)' : '(off)'}`)}
          onMouseLeave={hideTip}
        >
          <span className="material-symbols-outlined">timer</span>
        </button>
        <button
          className={`metronome-btn ${state.loopingEnabled ? 'active' : ''}`}
          onClick={handleLoopToggle}
          onMouseEnter={e => showTip(e, `Loop ${state.loopingEnabled ? '(on)' : '(off)'}`)}
          onMouseLeave={hideTip}
        >
          <span className="material-symbols-outlined">repeat</span>
        </button>
        <button
          ref={settingsBtnRef}
          className={`metronome-btn ${settingsOpen ? 'active' : ''}`}
          onClick={() => setSettingsOpen(v => !v)}
          onMouseEnter={e => showTip(e, 'Sound settings')}
          onMouseLeave={hideTip}
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>

      <div className="sb-options-section">
        <div className="sb-section-title">Systems to practice</div>
        <div className="sb-systems-grid">
          <div className="sb-system-row sb-system-header">
            <span className="sb-system-label" />
            <span className="sb-col-header">Show</span>
            <span className="sb-col-header">Practice</span>
            <span className="sb-col-header">Sound</span>
          </div>
          {hasVocalPart && (
            <div className="sb-system-row">
              <span className="sb-system-label">Vocal Melody</span>
              <label className="sb-toggle-label">
                <input type="checkbox" checked={state.showVocalPart}
                  onChange={e => dispatch({ type: 'SET_SHOW_VOCAL', show: e.target.checked })}
                />
              </label>
              <label className="sb-toggle-label">
                <input type="checkbox" checked={state.practiceVoice}
                  onChange={e => dispatch({ type: 'SET_PRACTICE_VOICE', enabled: e.target.checked })}
                  disabled={isActive || !state.showVocalPart}
                />
              </label>
              <label className="sb-toggle-label">
                <input type="checkbox" checked={!(state.trackMuted.get('voice') ?? false)}
                  onChange={() => handleTrackMute('voice')}
                />
              </label>
            </div>
          )}
          <div className="sb-system-row">
            <span className="sb-system-label">Right Hand / Treble</span>
            <label className="sb-toggle-label">
              <input type="checkbox" checked={state.showRightHand}
                onChange={e => dispatch({ type: 'SET_SHOW_RIGHT_HAND', show: e.target.checked })}
              />
            </label>
            <label className="sb-toggle-label">
              <input type="checkbox" checked={state.practiceRightHand}
                onChange={e => dispatch({ type: 'SET_PRACTICE_RIGHT_HAND', enabled: e.target.checked })}
                disabled={isActive || !state.showRightHand}
              />
            </label>
            <label className="sb-toggle-label">
              <input type="checkbox" checked={!(state.trackMuted.get('rh') ?? false)}
                onChange={() => handleTrackMute('rh')}
              />
            </label>
          </div>
          <div className="sb-system-row">
            <span className="sb-system-label">Left Hand / Bass</span>
            <label className="sb-toggle-label">
              <input type="checkbox" checked={state.showLeftHand}
                onChange={e => dispatch({ type: 'SET_SHOW_LEFT_HAND', show: e.target.checked })}
              />
            </label>
            <label className="sb-toggle-label">
              <input type="checkbox" checked={state.practiceLeftHand}
                onChange={e => dispatch({ type: 'SET_PRACTICE_LEFT_HAND', enabled: e.target.checked })}
                disabled={isActive || !state.showLeftHand}
              />
            </label>
            <label className="sb-toggle-label">
              <input type="checkbox" checked={!(state.trackMuted.get('lh') ?? false)}
                onChange={() => handleTrackMute('lh')}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="sb-drum-section">
        <label className="sb-drum-toggle">
          <input
            type="checkbox"
            checked={state.drumEnabled}
            onChange={e => dispatch({ type: 'SET_DRUM_ENABLED', enabled: e.target.checked })}
          />
          <span>Add drums</span>
        </label>
        {state.drumEnabled && (
          <DrumAccompaniment
            bpm={state.tempo}
            timeSignature={state.score?.timeSignature ?? { numerator: 4, denominator: 4 }}
            isPlaying={state.isPlaying && state.activeMode !== 'free-practice' && !state.countingIn}
            currentBeatTime={state.currentBeat * (60 / state.tempo)}
            currentBeat={state.score?.timeSignature
              ? Math.floor(state.currentBeat / (4 / (state.score.timeSignature.denominator))) % state.score.timeSignature.numerator
              : Math.floor(state.currentBeat) % 4
            }
            volume={state.drumVolume}
            notationStyle={PIANO_DRUM_STYLE}
            notationWidth={250}
          />
        )}
      </div>

      {state.sampleLoadingProgress && (
        <div className="loading-bar">
          <div
            className="loading-fill"
            style={{ width: `${(state.sampleLoadingProgress.loaded / state.sampleLoadingProgress.total) * 100}%` }}
          />
        </div>
      )}

      {tip && createPortal(
        <div
          className="mat-tooltip"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </div>,
        document.body,
      )}

      {settingsOpen && createPortal(
        <SettingsDropdown
          ref={settingsRef}
          anchorRef={settingsBtnRef}
          state={state}
          isActive={isActive}
          onMasterVolume={handleMasterVolume}
          onMasterMute={handleMasterMute}
          onMetronomeVolume={handleMetronomeVolume}
          onMetronomeToggle={handleMetronomeToggle}
          onTrackMute={handleTrackMute}
          onTrackVolume={handleTrackVolume}
          onSoundChange={handleSoundChange}
        />,
        document.body,
      )}
    </div>
  );
};

export default PlaybackControls;
