import { useState, useCallback, useMemo, useRef } from 'react';
import Popover from '@mui/material/Popover';
import type { TimeSignature } from '../../shared/rhythm/types';
import {
  parseBeatGrouping,
  validateBeatGrouping,
  getDefaultBeatGrouping,
  formatBeatGrouping,
} from '../../shared/rhythm/timeSignatureUtils';

interface TimeSignatureControlProps {
  timeSignature: TimeSignature;
  beatGrouping?: string;
  onChange: (ts: TimeSignature, grouping?: string) => void;
}

const PRESETS: Array<{ num: number; den: number; label: string; grouping?: string }> = [
  { num: 4, den: 4, label: '4/4' },
  { num: 3, den: 4, label: '3/4' },
  { num: 2, den: 4, label: '2/4' },
  { num: 6, den: 8, label: '6/8' },
  { num: 9, den: 8, label: '9/8' },
  { num: 12, den: 8, label: '12/8' },
  { num: 5, den: 8, label: '5/8', grouping: '3+2' },
  { num: 7, den: 8, label: '7/8', grouping: '3+2+2' },
  { num: 8, den: 8, label: '8/8', grouping: '3+3+2' },
];

const NUMERATORS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15];
const DENOMINATORS = [4, 8];

const PICKER_PAPER_SX = {
  bgcolor: 'var(--pulse-bg)',
  border: '1px solid var(--pulse-accent)',
  borderRadius: 0,
  boxShadow: '4px 4px 16px rgba(0,0,0,0.8)',
  p: '6px',
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '3px',
  maxWidth: 180,
};

export function TimeSignatureControl({
  timeSignature,
  beatGrouping,
  onChange,
}: TimeSignatureControlProps) {
  const [groupingInput, setGroupingInput] = useState(beatGrouping ?? '');
  const numBtnRef = useRef<HTMLButtonElement>(null);
  const denBtnRef = useRef<HTMLButtonElement>(null);
  const [numAnchor, setNumAnchor] = useState<HTMLElement | null>(null);
  const [denAnchor, setDenAnchor] = useState<HTMLElement | null>(null);

  const defaultGroupingStr = useMemo(() => {
    const g = getDefaultBeatGrouping(timeSignature);
    return formatBeatGrouping(g);
  }, [timeSignature]);

  const handlePreset = useCallback(
    (p: (typeof PRESETS)[number]) => {
      const ts: TimeSignature = { numerator: p.num, denominator: p.den };
      const newGrouping = p.grouping ?? '';
      setGroupingInput(newGrouping);
      setNumAnchor(null);
      setDenAnchor(null);
      onChange(ts, p.grouping);
    },
    [onChange],
  );

  const handleNumerator = useCallback(
    (num: number) => {
      const ts: TimeSignature = { numerator: num, denominator: timeSignature.denominator };
      setGroupingInput('');
      setNumAnchor(null);
      onChange(ts, undefined);
    },
    [timeSignature.denominator, onChange],
  );

  const handleDenominator = useCallback(
    (den: number) => {
      const ts: TimeSignature = { numerator: timeSignature.numerator, denominator: den };
      setGroupingInput('');
      setDenAnchor(null);
      onChange(ts, undefined);
    },
    [timeSignature.numerator, onChange],
  );

  const handleGroupingChange = useCallback(
    (value: string) => {
      setGroupingInput(value);
      const parsed = parseBeatGrouping(value);
      if (parsed && validateBeatGrouping(parsed, timeSignature)) {
        onChange(timeSignature, value);
      } else if (value === '') {
        onChange(timeSignature, undefined);
      }
    },
    [timeSignature, onChange],
  );

  const isPresetActive = (p: (typeof PRESETS)[number]) =>
    p.num === timeSignature.numerator &&
    p.den === timeSignature.denominator &&
    (p.grouping ?? '') === (beatGrouping ?? '');

  return (
    <div className="pulse-time-sig">
      <div className="pulse-time-sig-display">
        <button
          ref={numBtnRef}
          className="pulse-time-sig-num"
          onClick={() => { setNumAnchor(numAnchor ? null : numBtnRef.current); setDenAnchor(null); }}
          type="button"
          aria-label="Edit numerator"
          aria-haspopup="true"
          aria-expanded={Boolean(numAnchor)}
        >
          {timeSignature.numerator}
        </button>
        <div className="pulse-time-sig-divider" />
        <button
          ref={denBtnRef}
          className="pulse-time-sig-den"
          onClick={() => { setDenAnchor(denAnchor ? null : denBtnRef.current); setNumAnchor(null); }}
          type="button"
          aria-label="Edit denominator"
          aria-haspopup="true"
          aria-expanded={Boolean(denAnchor)}
        >
          {timeSignature.denominator}
        </button>
      </div>

      <Popover
        open={Boolean(numAnchor)}
        anchorEl={numAnchor}
        onClose={() => setNumAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: PICKER_PAPER_SX } }}
      >
        {NUMERATORS.map((n) => (
          <button
            key={n}
            className={`pulse-ts-btn ${n === timeSignature.numerator ? 'is-active' : ''}`}
            onClick={() => handleNumerator(n)}
            type="button"
          >
            {n}
          </button>
        ))}
      </Popover>

      <Popover
        open={Boolean(denAnchor)}
        anchorEl={denAnchor}
        onClose={() => setDenAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: PICKER_PAPER_SX } }}
      >
        {DENOMINATORS.map((d) => (
          <button
            key={d}
            className={`pulse-ts-btn ${d === timeSignature.denominator ? 'is-active' : ''}`}
            onClick={() => handleDenominator(d)}
            type="button"
          >
            {d}
          </button>
        ))}
      </Popover>

      <div className="pulse-time-sig-controls">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className={`pulse-ts-btn ${isPresetActive(p) ? 'is-active' : ''}`}
            onClick={() => handlePreset(p)}
            type="button"
          >
            {p.label}
          </button>
        ))}
      </div>

      {timeSignature.denominator !== 4 && (
        <div className="pulse-grouping-row">
          <span className="pulse-grouping-label">GROUPING</span>
          <input
            className="pulse-grouping-input"
            type="text"
            placeholder={defaultGroupingStr}
            value={groupingInput}
            onChange={(e) => handleGroupingChange(e.target.value)}
            aria-label="Beat grouping"
          />
          <button className="pulse-info-trigger" type="button" aria-label="Grouping info">
            ?
            <span className="pulse-info-tooltip">
              Split the measure into accent groups. For example, enter &quot;3+2&quot; for a 5/8 feel,
              or &quot;3+3+2&quot; for an Afro-Cuban 8/8 pattern. The numbers must add up to the
              time signature numerator.
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
