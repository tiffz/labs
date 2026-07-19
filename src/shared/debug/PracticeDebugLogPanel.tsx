import { useRef, type ReactElement } from 'react';
import {
  PRACTICE_DEBUG_CLEAR_BUTTON_STYLE,
  PRACTICE_DEBUG_EMPTY_MESSAGE,
  PRACTICE_DEBUG_EVENT_COLORS,
} from './practiceDebugPanelShared';
import { usePracticeDebugLogScrollToEnd } from './usePracticeDebugLogEffects';

type LoggedEvent = { type: string; t: number };

/**
 * Shared scrolling event-log viewer for the piano/scales practice debug docks.
 * Apps keep their own event types and `formatEvent`; the chrome (auto-scroll,
 * timestamps, per-type colors, empty state) lives here.
 */
export function PracticeDebugLogList<E extends LoggedEvent>({
  events,
  formatEvent,
  colorFor,
  height = 180,
}: {
  events: E[];
  formatEvent: (event: E) => string;
  /** Override per-event color (defaults to PRACTICE_DEBUG_EVENT_COLORS by type). */
  colorFor?: (event: E) => string;
  height?: number;
}): ReactElement {
  const logRef = useRef<HTMLDivElement>(null);
  usePracticeDebugLogScrollToEnd(logRef, events);

  return (
    <div
      ref={logRef}
      style={{
        height,
        overflowY: 'auto',
        padding: '4px 12px',
        boxSizing: 'border-box',
        fontSize: 11,
        color: '#e0e0e0',
        background: '#1a1a2e',
      }}
    >
      {events.map((event, i) => (
        <div
          key={i}
          style={{
            color: colorFor?.(event) ?? PRACTICE_DEBUG_EVENT_COLORS[event.type] ?? '#ccc',
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}
        >
          <span style={{ color: '#475569', marginRight: 6 }}>{event.t.toFixed(0)}</span>
          {formatEvent(event)}
        </div>
      ))}
      {events.length === 0 && <div style={{ color: '#475569' }}>{PRACTICE_DEBUG_EMPTY_MESSAGE}</div>}
    </div>
  );
}

/** Raw-pitch toggle + download + clear trio shared by the practice debug docks. */
export function PracticeDebugToolbarActions({
  accentColor,
  showPitch,
  onShowPitchChange,
  onDownload,
  onClear,
}: {
  accentColor: string;
  showPitch: boolean;
  onShowPitchChange: (next: boolean) => void;
  onDownload: () => void;
  onClear: () => void;
}): ReactElement {
  return (
    <>
      <label style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="checkbox"
          checked={showPitch}
          onChange={(e) => onShowPitchChange(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
        raw pitch
      </label>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDownload();
        }}
        style={{
          background: accentColor,
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
          onClear();
        }}
        style={{ ...PRACTICE_DEBUG_CLEAR_BUTTON_STYLE }}
      >
        Clear
      </button>
    </>
  );
}
