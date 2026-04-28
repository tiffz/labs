/**
 * Shared UI bits for piano/scales practice debug docks (jscpd dedupe target).
 */

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

export function practiceDebugMidiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

export const PRACTICE_DEBUG_EVENT_COLORS: Record<string, string> = {
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

export const PRACTICE_DEBUG_CLEAR_BUTTON_STYLE = {
  background: '#334155',
  color: '#94a3b8',
  border: 'none',
  borderRadius: 3,
  padding: '2px 8px',
  cursor: 'pointer',
  fontSize: 10,
} as const;

export const PRACTICE_DEBUG_EMPTY_MESSAGE =
  'No events yet. Start practicing to see debug output.';
