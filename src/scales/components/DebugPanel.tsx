import { useState, useEffect, useRef } from 'react';
import LabsDebugDock from '../../shared/components/LabsDebugDock';
import {
  getRecentEvents,
  getEventCounts,
  downloadSnapshot,
  clearDebugLog,
  type DebugEvent,
} from '../utils/practiceDebugLog';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

function formatEvent(e: DebugEvent): string {
  switch (e.type) {
    case 'pitch_raw':
      return e.midi !== null
        ? `pitch ${midiToName(e.midi)} rms=${e.rms.toFixed(3)}${e.freq ? ` f=${e.freq.toFixed(1)}Hz` : ''}`
        : `silence rms=${e.rms.toFixed(3)}`;
    case 'note_on': {
      const delta = e.rawTimestamp - e.compensatedTimestamp;
      const tag = e.source === 'mic' ? `MIC (comp=${delta.toFixed(0)}ms)` : 'MIDI';
      return `NOTE ON [${tag}] ${midiToName(e.midi)} (${e.midi})`;
    }
    case 'note_off':
      return `NOTE OFF [${e.source.toUpperCase()}] ${midiToName(e.midi)} (${e.midi})`;
    case 'expected_change':
      return `EXPECT [${e.expected.map(n => `${n.hand}:${n.pitches.map(midiToName).join('+')}(${n.noteId.slice(0, 8)})`).join(', ')}]`;
    case 'eval_attempt':
      return `EVAL ${e.noteId.slice(0, 8)} ${e.timing} pitch=${e.pitchCorrect} played=[${e.played.map(midiToName)}] exp=[${e.expectedPitches.map(midiToName)}] offset=${e.timingOffsetMs.toFixed(0)}ms`;
    case 'grace_miss':
      return `MISS ${e.noteId.slice(0, 8)} exp=[${e.expectedPitches.map(midiToName)}]`;
    case 'active_notes_change':
      return `ACTIVE [${e.activeNotes.map(midiToName).join(', ')}]`;
    case 'practice_start':
      return `START ${e.mode} bpm=${e.bpm} midi=${e.midiActive} mic=${e.micActive}`;
    case 'practice_end':
      return `END results=${e.resultCount} accuracy=${(e.accuracy * 100).toFixed(0)}%`;
  }
}

const EVENT_COLORS: Record<string, string> = {
  pitch_raw: '#666',
  note_on: '#22c55e',
  note_off: '#94a3b8',
  expected_change: '#8b5cf6',
  eval_attempt: '#f59e0b',
  grace_miss: '#ef4444',
  active_notes_change: '#3b82f6',
  practice_start: '#06b6d4',
  practice_end: '#06b6d4',
};

const ACCENT = '#059669';
const LOG_HEIGHT = 180;

function noteOnColor(e: DebugEvent): string {
  if (e.type !== 'note_on') return EVENT_COLORS[e.type] || '#ccc';
  return e.source === 'midi' ? '#22c55e' : '#38bdf8';
}

export default function DebugPanel() {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [counts, setCounts] = useState({ pitch: 0, midiOn: 0, micOn: 0, noteOff: 0, eval: 0, miss: 0 });
  const [showPitch, setShowPitch] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      setEvents(getRecentEvents(showPitch ? 60 : 30));
      setCounts(getEventCounts());
    }, 200);
    return () => clearInterval(iv);
  }, [showPitch]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

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
            style={{
              background: '#334155',
              color: '#94a3b8',
              border: 'none',
              borderRadius: 3,
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: 10,
            }}
          >
            Clear
          </button>
        </>
      }
    >
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
                e.type === 'note_on' || e.type === 'note_off' ? noteOnColor(e) : EVENT_COLORS[e.type] || '#ccc',
              whiteSpace: 'nowrap',
              lineHeight: 1.4,
            }}
          >
            <span style={{ color: '#475569', marginRight: 6 }}>{e.t.toFixed(0)}</span>
            {formatEvent(e)}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ color: '#475569' }}>No events yet. Start practicing to see debug output.</div>
        )}
      </div>
    </LabsDebugDock>
  );
}
