import { useState, useCallback, useRef, useEffect } from 'react';
import { COMMON_BPMS } from '../../shared/music/musicInputConstants';

interface BpmControlProps {
  bpm: number;
  onChange: (bpm: number) => void;
}

const MIN_BPM = 20;
const MAX_BPM = 300;

const REPEAT_DELAY = 400;
const REPEAT_INTERVAL = 80;

/**
 * Hold a button to repeat its action.
 *
 * THE REPEAT MUST NOT OUTLIVE THE GESTURE THAT STARTED IT.
 *
 * It used to stop on `pointerup` and `pointerleave` only, and neither is
 * guaranteed to arrive. A browser fires `pointercancel` instead whenever it
 * takes the gesture over — a touch that becomes a scroll, a pointer whose
 * element is removed or moves out from under it, a system gesture. When that
 * happened nothing cleared the interval, so BPM kept climbing at one per 80ms
 * — 12.5 a second — until it hit the 300 cap. Measured: 120 to 177 in eight
 * seconds with no further input.
 *
 * It is a nasty failure to diagnose because the cause is a gesture the user has
 * already forgotten and the effect shows up on whatever they touch next, which
 * is how it got reported as a different control's fault.
 *
 * So the repeat is stopped by three things rather than one:
 *
 *  - `pointercancel` on the button, the specific event that was missing;
 *  - a `pointerup`/`pointercancel` listener on the WINDOW while the repeat is
 *    live, so a release anywhere ends it even if the button is gone by then;
 *  - `blur` and a hidden tab, because a backgrounded page still runs intervals
 *    and coming back to a tripled tempo is the same bug with a longer fuse.
 *
 * The window listeners are attached only while repeating, so the common case
 * costs nothing.
 */
function useRepeatPress(callback: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cbRef = useRef(callback);
  cbRef.current = callback;

  /* One `AbortController` per press detaches every window listener at once —
     and avoids holding the stop function in a ref written during render, which
     `react-hooks/refs` forbids as a React Compiler correctness rule. */
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    stop();
    // A release anywhere ends the repeat, not just one on the button itself.
    const controller = new AbortController();
    abortRef.current = controller;
    const until = { signal: controller.signal };
    window.addEventListener('pointerup', stop, until);
    window.addEventListener('pointercancel', stop, until);
    window.addEventListener('blur', stop, until);
    document.addEventListener('visibilitychange', stop, until);
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => cbRef.current(), REPEAT_INTERVAL);
    }, REPEAT_DELAY);
  }, [stop]);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
  };
}

const TEMPO_MARKINGS: Array<{ min: number; max: number; italian: string; english: string }> = [
  { min: 0,   max: 40,  italian: 'Larghissimo', english: 'Very broad' },
  { min: 40,  max: 52,  italian: 'Largo',        english: 'Broad' },
  { min: 52,  max: 60,  italian: 'Lento',        english: 'Slow' },
  { min: 60,  max: 76,  italian: 'Adagio',       english: 'At ease' },
  { min: 76,  max: 88,  italian: 'Andante',      english: 'Flowing' },
  { min: 88,  max: 100, italian: 'Moderato',     english: 'Moderate' },
  { min: 100, max: 112, italian: 'Allegretto',   english: 'Slightly lively' },
  { min: 112, max: 140, italian: 'Allegro',      english: 'Lively' },
  { min: 140, max: 168, italian: 'Vivace',       english: 'Fast' },
  { min: 168, max: 188, italian: 'Presto',       english: 'Hurried' },
  { min: 188, max: Infinity, italian: 'Prestissimo', english: 'Very fast' },
];

function getTempoMarking(bpm: number): { italian: string; english: string } {
  return TEMPO_MARKINGS.find((t) => bpm >= t.min && bpm < t.max) ?? TEMPO_MARKINGS[TEMPO_MARKINGS.length - 1];
}

function clamp(v: number) {
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(v * 10) / 10));
}

export function BpmControl({ bpm, onChange }: BpmControlProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(clamp(parseFloat(e.target.value)));
    },
    [onChange],
  );

  const decRepeat = useRepeatPress(useCallback(() => onChange(clamp(bpmRef.current - 1)), [onChange]));
  const incRepeat = useRepeatPress(useCallback(() => onChange(clamp(bpmRef.current + 1)), [onChange]));

  const startEdit = () => {
    setEditValue(String(Math.round(bpm)));
    setEditing(true);
  };

  const commitEdit = () => {
    setEditing(false);
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) onChange(clamp(parsed));
  };

  return (
    <div className="pulse-bpm">
      <div className="pulse-tempo-marking" title={getTempoMarking(bpm).english}>
        {getTempoMarking(bpm).italian}
      </div>
      <div className="pulse-bpm-top">
        {editing ? (
          <input
            className="pulse-bpm-input"
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
            min={MIN_BPM}
            max={MAX_BPM}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            aria-label="BPM value"
          />
        ) : (
          <button
            className="pulse-bpm-display"
            onClick={startEdit}
            title="Click to type a BPM"
            type="button"
          >
            {bpm.toFixed(0)}
          </button>
        )}
        <span className="pulse-bpm-label">BPM</span>
      </div>

      <input
        type="range"
        className="pulse-bpm-slider"
        min={MIN_BPM}
        max={MAX_BPM}
        step={1}
        value={bpm}
        onChange={handleSlider}
        aria-label="BPM slider"
      />

      <div className="pulse-bpm-actions">
        <button className="pulse-bpm-btn" onClick={() => onChange(clamp(bpm / 2))} type="button" title="Halve BPM">÷2</button>
        <button className="pulse-bpm-btn" onClick={() => onChange(clamp(bpm - 1))} {...decRepeat} type="button" title="Decrease by 1 (hold to repeat)">−1</button>
        <button className="pulse-bpm-btn" onClick={() => onChange(clamp(bpm + 1))} {...incRepeat} type="button" title="Increase by 1 (hold to repeat)">+1</button>
        <button className="pulse-bpm-btn" onClick={() => onChange(clamp(bpm * 2))} type="button" title="Double BPM">×2</button>
      </div>

      <div className="pulse-bpm-presets">
        {COMMON_BPMS.map((v) => (
          <button
            key={v}
            className={`pulse-bpm-preset ${bpm === v ? 'is-active' : ''}`}
            onClick={() => onChange(v)}
            type="button"
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
