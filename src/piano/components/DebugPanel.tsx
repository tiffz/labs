import { useState, useRef, useCallback } from 'react';
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

function formatEvent(e: DebugEvent): string {
  const n = practiceDebugMidiToName;
  switch (e.type) {
    case 'pitch_raw':
      return e.midi !== null ? `pitch ${n(e.midi)} (${e.midi}) rms=${e.rms.toFixed(3)}` : `silence rms=${e.rms.toFixed(3)}`;
    case 'note_on':
      return `NOTE ON ${n(e.midi)} (${e.midi})`;
    case 'note_off':
      return `NOTE OFF ${n(e.midi)} (${e.midi})`;
    case 'expected_change':
      return `EXPECT [${e.expected.map(ev => `${ev.hand}:${ev.pitches.map(n).join('+')}(${ev.noteId.slice(0, 8)})`).join(', ')}]`;
    case 'eval_attempt':
      return `EVAL ${e.noteId.slice(0, 8)} ${e.timing} pitch=${e.pitchCorrect} played=[${e.played.map(n)}] exp=[${e.expectedPitches.map(n)}] offset=${e.timingOffsetMs.toFixed(0)}ms`;
    case 'grace_miss':
      return `MISS ${e.noteId.slice(0, 8)} exp=[${e.expectedPitches.map(n)}]`;
    case 'active_notes_change':
      return `ACTIVE [${e.activeNotes.map(n).join(', ')}]`;
    case 'practice_start':
      return `START ${e.mode} tempo=${e.tempo} mic=${e.micActive}`;
    case 'practice_end':
      return `END results=${e.resultCount}`;
  }
}

const ACCENT = '#e94560';

export default function DebugPanel() {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [counts, setCounts] = useState({ pitch: 0, noteOn: 0, noteOff: 0, eval: 0, miss: 0 });
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
      appId="piano"
      title="Practice debug"
      accentColor={ACCENT}
      defaultCollapsed={false}
      toolbar={
        <>
          <span style={{ color: '#94a3b8', fontSize: 10 }}>
            pitch:{counts.pitch} noteOn:{counts.noteOn} eval:{counts.eval} miss:{counts.miss}
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
              setCounts({ pitch: 0, noteOn: 0, noteOff: 0, eval: 0, miss: 0 });
            }}
            style={{ ...PRACTICE_DEBUG_CLEAR_BUTTON_STYLE }}
          >
            Clear
          </button>
        </>
      }
    >
      <div
        ref={logRef}
        style={{
          maxHeight: 180,
          overflowY: 'auto',
          padding: '4px 12px',
          fontSize: 11,
          color: '#e0e0e0',
          background: '#1a1a2e',
        }}
      >
        {filtered.map((e, i) => (
          <div key={i} style={{ color: PRACTICE_DEBUG_EVENT_COLORS[e.type] || '#ccc', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
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
