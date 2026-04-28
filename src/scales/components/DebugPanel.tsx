import { useState, useRef, useCallback, type CSSProperties } from 'react';
import LabsDebugDock from '../../shared/components/LabsDebugDock';
import {
  PRACTICE_DEBUG_CLEAR_BUTTON_STYLE,
  PRACTICE_DEBUG_EMPTY_MESSAGE,
  PRACTICE_DEBUG_EVENT_COLORS,
  practiceDebugMidiToName,
} from '../../shared/debug/practiceDebugPanelShared';
import { usePracticeDebugLogPoll, usePracticeDebugLogScrollToEnd } from '../../shared/debug/usePracticeDebugLogEffects';
import {
  getRecentEvents,
  getEventCounts,
  downloadSnapshot,
  clearDebugLog,
  type DebugEvent,
} from '../utils/practiceDebugLog';
import { useScalesSessionDebugBridge } from '../context/scalesSessionDebugBridge';
import type { ScalesDebugHelpSurface, ScalesSessionDebugApi } from '../context/scalesSessionDebugTypes';

function formatEvent(e: DebugEvent): string {
  const n = practiceDebugMidiToName;
  switch (e.type) {
    case 'pitch_raw':
      return e.midi !== null
        ? `pitch ${n(e.midi)} rms=${e.rms.toFixed(3)}${e.freq ? ` f=${e.freq.toFixed(1)}Hz` : ''}`
        : `silence rms=${e.rms.toFixed(3)}`;
    case 'note_on': {
      const delta = e.rawTimestamp - e.compensatedTimestamp;
      const tag = e.source === 'mic' ? `MIC (comp=${delta.toFixed(0)}ms)` : 'MIDI';
      return `NOTE ON [${tag}] ${n(e.midi)} (${e.midi})`;
    }
    case 'note_off':
      return `NOTE OFF [${e.source.toUpperCase()}] ${n(e.midi)} (${e.midi})`;
    case 'expected_change':
      return `EXPECT [${e.expected.map(ev => `${ev.hand}:${ev.pitches.map(n).join('+')}(${ev.noteId.slice(0, 8)})`).join(', ')}]`;
    case 'eval_attempt':
      return `EVAL ${e.noteId.slice(0, 8)} ${e.timing} pitch=${e.pitchCorrect} played=[${e.played.map(n)}] exp=[${e.expectedPitches.map(n)}] offset=${e.timingOffsetMs.toFixed(0)}ms`;
    case 'grace_miss':
      return `MISS ${e.noteId.slice(0, 8)} exp=[${e.expectedPitches.map(n)}]`;
    case 'active_notes_change':
      return `ACTIVE [${e.activeNotes.map(n).join(', ')}]`;
    case 'practice_start':
      return `START ${e.mode} bpm=${e.bpm} midi=${e.midiActive} mic=${e.micActive}`;
    case 'practice_end':
      return `END results=${e.resultCount} accuracy=${(e.accuracy * 100).toFixed(0)}%`;
  }
}

const ACCENT = '#059669';
const LOG_HEIGHT = 180;

const DEBUG_BTN: CSSProperties = {
  background: 'transparent',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: 3,
  padding: '2px 6px',
  fontSize: 10,
  cursor: 'pointer',
};

const DEBUG_BTN_PRIMARY: CSSProperties = {
  ...DEBUG_BTN,
  background: ACCENT,
  color: '#fff',
  border: 'none',
  fontWeight: 700,
};

function noteOnColor(e: DebugEvent): string {
  if (e.type !== 'note_on') return PRACTICE_DEBUG_EVENT_COLORS[e.type] || '#ccc';
  return e.source === 'midi' ? '#22c55e' : '#38bdf8';
}

function SessionGodModeStrip({ sessionApi }: { sessionApi: ScalesSessionDebugApi }) {
  const fire = (surface: ScalesDebugHelpSurface) => {
    sessionApi.setHelpPreview(surface);
  };

  return (
    <div
      role="toolbar"
      aria-label="Session QA controls"
      style={{
        padding: '6px 12px 8px',
        borderBottom: '1px solid #1e293b',
        background: '#0f172a',
        maxHeight: 200,
        overflowY: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ color: '#94a3b8', fontSize: 10, marginBottom: 6, fontWeight: 700 }}>
        Session QA (Escape closes overlays)
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', marginBottom: 6 }}>
        <button type="button" style={DEBUG_BTN} onClick={() => sessionApi.clearHelpPreview()}>
          Close overlay
        </button>
      </div>
      <div style={{ color: '#64748b', fontSize: 9, marginBottom: 4 }}>Guidance & tips</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        <button type="button" style={DEBUG_BTN} onClick={() => fire('guidance')}>Onboarding modal</button>
        <button type="button" style={DEBUG_BTN} onClick={() => fire('practice_tip')}>Practice tip</button>
        <button type="button" style={DEBUG_BTN} onClick={() => fire('shaky_timing')}>Shaky · timing</button>
        <button type="button" style={DEBUG_BTN} onClick={() => fire('shaky_pitch')}>Shaky · pitch</button>
        <button type="button" style={DEBUG_BTN} onClick={() => fire('shaky_few_notes')}>Shaky · few notes</button>
      </div>
      <div style={{ color: '#64748b', fontSize: 9, marginBottom: 4 }}>Stuck dialogs</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        <button type="button" style={DEBUG_BTN} onClick={() => fire('stuck_drill')}>Drill pause</button>
        <button type="button" style={DEBUG_BTN} onClick={() => fire('stuck_regular')}>Stepping-stone</button>
        <button type="button" style={DEBUG_BTN} onClick={() => fire('stuck_tip')}>Jump-coaching tip</button>
      </div>
      <div style={{ color: '#64748b', fontSize: 9, marginBottom: 4 }}>Other</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <button type="button" style={DEBUG_BTN} onClick={() => fire('wrong_note')}>Wrong-note flash</button>
        <button type="button" style={DEBUG_BTN} onClick={() => fire('drill_how_it_works')}>Drill tooltip copy</button>
      </div>
    </div>
  );
}

export default function DebugPanel() {
  const { sessionApi } = useScalesSessionDebugBridge();
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [counts, setCounts] = useState({ pitch: 0, midiOn: 0, micOn: 0, noteOff: 0, eval: 0, miss: 0 });
  const [showPitch, setShowPitch] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const pollTick = useCallback(() => {
    setEvents(getRecentEvents(showPitch ? 60 : 30));
    setCounts(getEventCounts());
  }, [showPitch]);

  usePracticeDebugLogPoll(pollTick);
  usePracticeDebugLogScrollToEnd(logRef, events);

  const filtered = showPitch ? events : events.filter(e => e.type !== 'pitch_raw');

  return (
    <LabsDebugDock
      appId="scales"
      title="Practice debug"
      accentColor={ACCENT}
      defaultCollapsed
      layout="log-first"
      reportOuterHeightCssVar="--debug-panel-height"
      toolbar={
        <>
          {sessionApi ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                sessionApi.completeExercisePerfect();
              }}
              style={{
                ...DEBUG_BTN_PRIMARY,
                padding: '3px 10px',
              }}
            >
              Complete exercise
            </button>
          ) : null}
          <span style={{ color: '#94a3b8', fontSize: 10 }}>
            pitch:{counts.pitch}
            {' '}
            <span style={{ color: '#22c55e' }}>midi:{counts.midiOn}</span>
            {' '}
            <span style={{ color: '#38bdf8' }}>mic:{counts.micOn}</span>
            {' '}
            eval:{counts.eval} miss:{counts.miss}
          </span>
          <label style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={showPitch}
              onChange={(e) => setShowPitch(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
            raw pitch
          </label>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              downloadSnapshot();
            }}
            style={{
              background: ACCENT,
              color: '#fff',
              border: 'none',
              borderRadius: 3,
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 'bold',
            }}
          >
            Download snapshot
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearDebugLog();
              setEvents([]);
              setCounts({ pitch: 0, midiOn: 0, micOn: 0, noteOff: 0, eval: 0, miss: 0 });
            }}
            style={{ ...PRACTICE_DEBUG_CLEAR_BUTTON_STYLE }}
          >
            Clear
          </button>
        </>
      }
    >
      {sessionApi ? <SessionGodModeStrip sessionApi={sessionApi} /> : null}
      <div
        ref={logRef}
        style={{
          height: LOG_HEIGHT,
          overflowY: 'auto',
          padding: '4px 12px',
          boxSizing: 'border-box',
          fontSize: 11,
          color: '#e0e0e0',
          background: '#1a1a2e',
        }}
      >
        {filtered.map((e, i) => (
          <div
            key={i}
            style={{
              color:
                e.type === 'note_on' || e.type === 'note_off' ? noteOnColor(e) : PRACTICE_DEBUG_EVENT_COLORS[e.type] || '#ccc',
              whiteSpace: 'nowrap',
              lineHeight: 1.4,
            }}
          >
            <span style={{ color: '#475569', marginRight: 6 }}>{e.t.toFixed(0)}</span>
            {formatEvent(e)}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ color: '#475569' }}>{PRACTICE_DEBUG_EMPTY_MESSAGE}</div>
        )}
      </div>
    </LabsDebugDock>
  );
}
