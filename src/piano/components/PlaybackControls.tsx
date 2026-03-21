import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePiano, type ActiveMode } from '../store';
import { SOUND_OPTIONS, type SoundType } from '../../chords/types/soundOptions';
import DrumAccompaniment, { type DrumScheduler } from '../../beat/components/DrumAccompaniment';
import type { NotationStyle } from '../../shared/notation/DrumNotationMini';
import { getScorePlaybackEngine } from '../utils/scorePlayback';

const PIANO_DRUM_STYLE: NotationStyle = {
  staffColor: '#94a3b8',
  noteColor: '#64748b',
  textColor: '#64748b',
  highlightColor: '#7c3aed',
};

const PART_LABELS: Record<string, string> = { rh: 'Treble', lh: 'Bass' };

interface SettingsDropdownProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  state: { masterVolume: number; masterMuted: boolean; metronomeVolume: number; metronomeEnabled: boolean; score: { parts: { id: string; name: string }[] } | null; trackMuted: Map<string, boolean>; trackVolume: Map<string, number>; soundType: string; activeMode: string; drumEnabled: boolean; drumVolume: number; countInEveryLoop: boolean };
  isActive: boolean;
  onMasterVolume: (v: number) => void;
  onMasterMute: () => void;
  onMetronomeVolume: (v: number) => void;
  onMetronomeToggle: () => void;
  onTrackMute: (id: string) => void;
  onTrackVolume: (id: string, v: number) => void;
  onSoundChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDrumVolume: (v: number) => void;
  onCountInEveryLoop: (enabled: boolean) => void;
}

const SettingsDropdown = React.forwardRef<HTMLDivElement, SettingsDropdownProps>(
  ({ anchorRef, state, isActive, onMasterVolume, onMasterMute, onMetronomeVolume, onMetronomeToggle, onTrackMute, onTrackVolume, onSoundChange, onDrumVolume, onCountInEveryLoop }, ref) => {
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
          {state.drumEnabled && (
            <div className="sb-settings-row">
              <button className="btn btn-small"
                onClick={() => onDrumVolume(state.drumVolume > 0 ? 0 : 0.7)}
                title={state.drumVolume === 0 ? 'Unmute drums' : 'Mute drums'}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {state.drumVolume === 0 ? 'volume_off' : 'volume_up'}
                </span>
              </button>
              <span className="sb-settings-label">Drums</span>
              <input type="range" min={0} max={1} step={0.01} value={state.drumVolume}
                onChange={e => onDrumVolume(parseFloat(e.target.value))}
                className={`volume-slider ${state.drumVolume === 0 ? 'disabled-slider' : ''}`}
                disabled={state.drumVolume === 0} />
            </div>
          )}
          <div className="sb-settings-row" style={{ marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--piano-text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={state.countInEveryLoop}
                onChange={e => onCountInEveryLoop(e.target.checked)}
                style={{ margin: 0 }} />
              Count-in on every loop
            </label>
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
  const hasChordSymbols = useMemo(() => {
    if (!state.score) return false;
    return state.score.parts.some(p => p.measures.some(m => m.notes.some(n => !!n.chordSymbol)));
  }, [state.score]);
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

  const handleDrumVolume = (value: number) => {
    dispatch({ type: 'SET_DRUM_VOLUME', volume: value });
  };

  const handleModeToggle = (mode: ActiveMode) => {
    if (state.activeMode === mode) {
      stopMode();
    } else {
      startMode(mode);
    }
  };

  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [systemsExpanded, setSystemsExpanded] = useState(true);
  const showTip = useCallback((e: React.MouseEvent, text: string) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const clamped = Math.max(120, Math.min(cx, window.innerWidth - 120));
    setTip({ text, x: clamped, y: r.top });
  }, []);
  const hideTip = useCallback(() => setTip(null), []);

  const drumScheduler = useMemo<DrumScheduler>(() => {
    const eng = getScorePlaybackEngine();
    return {
      loadSound: (name, url) => eng.loadDrumSound(name, url),
      playAt: (name, time, vol) => eng.playDrumAt(name, time, vol),
      setCallback: (cb) => eng.setDrumCallback(cb),
    };
  }, []);

  const isActive = state.activeMode !== 'none';
  const isPracticing = state.activeMode === 'practice' || state.activeMode === 'free-practice';

  return (
    <div className="sidebar-playback">
      <div className="sb-mode-buttons">
        <button
          className={`sb-mode-btn practice-primary ${state.activeMode === 'practice' ? 'active practice' : ''}`}
          onClick={() => handleModeToggle('practice')}
          disabled={!state.score || ((!state.midiConnected && !state.microphoneActive) && state.activeMode !== 'practice')}
          onMouseEnter={e => showTip(e, (!state.midiConnected && !state.microphoneActive) ? 'Connect a MIDI controller or enable mic to practice' : 'Play along with the metronome and get timing feedback')}
          onMouseLeave={hideTip}
        >
          <span className="material-symbols-outlined">{state.activeMode === 'practice' ? 'pause' : 'play_arrow'}</span>
          <span className="sb-mode-label">{state.activeMode === 'practice' ? 'Stop' : 'Practice'}</span>
        </button>
        <button
          className={`sb-mode-btn ${state.activeMode === 'free-practice' ? 'active free-practice' : ''}`}
          onClick={() => handleModeToggle('free-practice')}
          disabled={!state.score || ((!state.midiConnected && !state.microphoneActive) && state.activeMode !== 'free-practice')}
          onMouseEnter={e => showTip(e, (!state.midiConnected && !state.microphoneActive) ? 'Connect a MIDI controller or enable mic for free tempo' : 'Play at your own pace — notes advance as you play correctly')}
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
          <div className="ex-stepper sb-bpm-stepper">
            <input
              type="text"
              inputMode="numeric"
              value={tempoInput}
              onChange={e => setTempoInput(e.target.value)}
              onBlur={handleTempoBlur}
              onKeyDown={handleTempoKeyDown}
              className="ex-stepper-input"
              disabled={isActive}
            />
            <div className="ex-stepper-arrows">
              <button
                className="ex-stepper-arrow"
                onClick={() => { const n = Math.min(300, state.tempo + 1); dispatch({ type: 'SET_TEMPO', tempo: n }); engine.setTempo(n); }}
                disabled={isActive || state.tempo >= 300}
                aria-label="Increase BPM"
              >
                <span className="material-symbols-outlined">arrow_drop_up</span>
              </button>
              <button
                className="ex-stepper-arrow"
                onClick={() => { const n = Math.max(20, state.tempo - 1); dispatch({ type: 'SET_TEMPO', tempo: n }); engine.setTempo(n); }}
                disabled={isActive || state.tempo <= 20}
                aria-label="Decrease BPM"
              >
                <span className="material-symbols-outlined">arrow_drop_down</span>
              </button>
            </div>
          </div>
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
        <button className="sb-section-toggle" onClick={() => setSystemsExpanded(v => !v)}>
          <span className="material-symbols-outlined sb-toggle-arrow" style={{ transform: systemsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
            expand_more
          </span>
          <span className="sb-section-title">Systems to practice</span>
        </button>
        {systemsExpanded && (
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
            {hasChordSymbols && (
              <div className="sb-system-row">
                <span className="sb-system-label">
                  Chords
                  <span
                    className="material-symbols-outlined sb-help-icon"
                    onMouseEnter={e => showTip(e, 'When enabled, you\'ll be scored on playing the correct chord at the right time. Any voicing or inversion of the chord is accepted.')}
                    onMouseLeave={hideTip}
                  >help</span>
                </span>
                <label className="sb-toggle-label">
                  <input type="checkbox" checked={state.showChords}
                    onChange={e => dispatch({ type: 'SET_SHOW_CHORDS', show: e.target.checked })}
                  />
                </label>
                <label className="sb-toggle-label">
                  <input type="checkbox" checked={state.practiceChords}
                    onChange={e => dispatch({ type: 'SET_PRACTICE_CHORDS', enabled: e.target.checked })}
                    disabled={isActive || !state.showChords}
                  />
                </label>
                <label className="sb-toggle-label" />
              </div>
            )}
          </div>
        )}
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
            volume={state.drumVolume * (state.masterMuted ? 0 : state.masterVolume) * 100}
            notationStyle={PIANO_DRUM_STYLE}
            notationWidth={250}
            scheduler={drumScheduler}
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
          onDrumVolume={handleDrumVolume}
          onCountInEveryLoop={(enabled) => dispatch({ type: 'SET_COUNT_IN_EVERY_LOOP', enabled })}
        />,
        document.body,
      )}
    </div>
  );
};

export default PlaybackControls;
