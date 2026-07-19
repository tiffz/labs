import { useState, useCallback } from 'react';
import LabsDebugDock from '../../shared/components/LabsDebugDock';
import { practiceDebugMidiToName } from '../../shared/debug/practiceDebugPanelShared';
import { usePracticeDebugLogPoll } from '../../shared/debug/usePracticeDebugLogEffects';
import {
  PracticeDebugLogList,
  PracticeDebugToolbarActions,
} from '../../shared/debug/PracticeDebugLogPanel';
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

  const pollTick = useCallback(() => {
    setEvents(getRecentEvents(showPitch ? 60 : 30));
    setCounts(getEventCounts());
  }, [showPitch]);

  usePracticeDebugLogPoll(pollTick);

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
          <PracticeDebugToolbarActions
            accentColor={ACCENT}
            showPitch={showPitch}
            onShowPitchChange={setShowPitch}
            onDownload={downloadSnapshot}
            onClear={() => {
              clearDebugLog();
              setEvents([]);
              setCounts({ pitch: 0, noteOn: 0, noteOff: 0, eval: 0, miss: 0 });
            }}
          />
        </>
      }
    >
      <PracticeDebugLogList events={filtered} formatEvent={formatEvent} />
    </LabsDebugDock>
  );
}
