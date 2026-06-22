import Box from '@mui/material/Box';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { TimeSignature } from '../../rhythm/types';
import {
  formatBeatGrouping,
  getDefaultBeatGrouping,
  isAsymmetricTimeSignature,
  parseBeatGrouping,
  validateBeatGrouping,
} from '../../rhythm/timeSignatureUtils';
import {
  COMMON_TIME_SIGNATURE_PRESETS,
  formatTimeSignatureDisplay,
  TIME_SIGNATURE_DENOMINATORS,
  TIME_SIGNATURE_NUMERATOR_MAX,
  TIME_SIGNATURE_NUMERATOR_MIN,
  timeSignaturesEqual,
} from '../../music/timeSignaturePresets';
import AnchoredPopover from '../AnchoredPopover';
import { NumericStepperField } from './NumericStepperField';
import './bpmInput.css';
import './timeSignatureInput.css';

export type TimeSignatureInputProps = {
  value: TimeSignature;
  onChange: (next: TimeSignature) => void;
  /** `inline` shows a compact trigger; `block` renders the picker panel only (e.g. inside a menu). */
  layout?: 'inline' | 'block';
  disabled?: boolean;
  className?: string;
  dropdownClassName?: string;
};

function clampNumerator(value: number): number {
  return Math.min(TIME_SIGNATURE_NUMERATOR_MAX, Math.max(TIME_SIGNATURE_NUMERATOR_MIN, Math.round(value)));
}

function TimeSignaturePickerPanel({
  value,
  onChange,
  onPick,
}: {
  value: TimeSignature;
  onChange: (next: TimeSignature) => void;
  onPick?: () => void;
}): ReactElement {
  const [numeratorDraft, setNumeratorDraft] = useState(String(value.numerator));
  const [groupingDraft, setGroupingDraft] = useState(() =>
    value.beatGrouping?.length ? formatBeatGrouping(value.beatGrouping) : '',
  );
  const [groupingError, setGroupingError] = useState('');
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    setNumeratorDraft(String(value.numerator));
    setGroupingDraft(value.beatGrouping?.length ? formatBeatGrouping(value.beatGrouping) : '');
    setGroupingError('');
  }, [value.numerator, value.denominator, value.beatGrouping]);

  const defaultGroupingLabel = useMemo(
    () => formatBeatGrouping(getDefaultBeatGrouping(value)),
    [value],
  );

  const showGrouping = isAsymmetricTimeSignature(value);

  const applyPreset = useCallback(
    (next: TimeSignature) => {
      onChange(next);
      onPick?.();
    },
    [onChange, onPick],
  );

  const applyNumerator = useCallback(
    (nextNumerator: number) => {
      const next = clampNumerator(nextNumerator);
      setNumeratorDraft(String(next));
      onChange({
        numerator: next,
        denominator: valueRef.current.denominator,
        beatGrouping: undefined,
      });
    },
    [onChange],
  );

  const applyDenominator = useCallback(
    (denominator: number) => {
      onChange({
        numerator: valueRef.current.numerator,
        denominator,
        beatGrouping: undefined,
      });
    },
    [onChange],
  );

  const handleGroupingChange = useCallback(
    (raw: string) => {
      setGroupingDraft(raw);
      if (!raw.trim()) {
        setGroupingError('');
        onChange({ ...valueRef.current, beatGrouping: undefined });
        return;
      }
      const parsed = parseBeatGrouping(raw);
      if (!parsed || !validateBeatGrouping(parsed, valueRef.current)) {
        setGroupingError(`Grouping must add up to ${valueRef.current.numerator}`);
        return;
      }
      setGroupingError('');
      onChange({ ...valueRef.current, beatGrouping: parsed });
    },
    [onChange],
  );

  return (
    <Box className="shared-time-sig-dropdown-list shared-bpm-dropdown-list" aria-label="Time signature">
      <Box className="shared-time-sig-preview" aria-hidden>
        <span className="shared-time-sig-preview-num">{value.numerator}</span>
        <span className="shared-time-sig-preview-bar" />
        <span className="shared-time-sig-preview-den">{value.denominator}</span>
      </Box>

      <Box className="shared-time-sig-presets-block">
        <span className="shared-bpm-presets-label">Common meters</span>
        <Box className="shared-bpm-presets-row" role="group" aria-label="Common time signatures">
          {COMMON_TIME_SIGNATURE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-label={preset.label}
              aria-pressed={timeSignaturesEqual(value, preset.timeSignature)}
              className={`shared-bpm-preset-chip ${timeSignaturesEqual(value, preset.timeSignature) ? 'active' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyPreset(preset.timeSignature)}
            >
              {preset.label}
            </button>
          ))}
        </Box>
      </Box>

      <Box className="shared-time-sig-custom-section shared-bpm-presets-section">
        <span className="shared-bpm-presets-label">Custom</span>
        <Box className="shared-time-sig-custom-panel">
          <Box className="shared-bpm-shell">
            <NumericStepperField
              value={value.numerator}
              inputValue={numeratorDraft}
              onInputChange={(event) => setNumeratorDraft(event.target.value)}
              onInputBlur={() => {
                const parsed = Number(numeratorDraft);
                applyNumerator(Number.isFinite(parsed) ? parsed : value.numerator);
              }}
              onInputKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const parsed = Number(numeratorDraft);
                  applyNumerator(Number.isFinite(parsed) ? parsed : value.numerator);
                }
              }}
              min={TIME_SIGNATURE_NUMERATOR_MIN}
              max={TIME_SIGNATURE_NUMERATOR_MAX}
              onBump={(delta) => applyNumerator(value.numerator + delta)}
              incrementAriaLabel="Increase beats per measure"
              decrementAriaLabel="Decrease beats per measure"
              inputAriaLabel="Beats per measure"
              stepperAriaLabel="Beats per measure stepper"
            />
          </Box>
          <span className="shared-time-sig-slash" aria-hidden>
            /
          </span>
          <Box className="shared-time-sig-den-toggle" role="group" aria-label="Beat unit">
            {TIME_SIGNATURE_DENOMINATORS.map((denominator) => (
              <button
                key={denominator}
                type="button"
                className={`shared-time-sig-den-btn ${value.denominator === denominator ? 'is-active' : ''}`}
                onClick={() => applyDenominator(denominator)}
                aria-pressed={value.denominator === denominator}
              >
                {denominator}
              </button>
            ))}
          </Box>
        </Box>
      </Box>

      {showGrouping ? (
        <Box className="shared-time-sig-grouping-row">
          <label htmlFor="shared-time-sig-grouping" className="shared-bpm-presets-label">
            Beat grouping
          </label>
          <input
            id="shared-time-sig-grouping"
            className="shared-time-sig-grouping-input"
            type="text"
            value={groupingDraft}
            placeholder={defaultGroupingLabel}
            onChange={(event) => handleGroupingChange(event.target.value)}
            aria-invalid={groupingError ? true : undefined}
          />
          <span className={`shared-time-sig-grouping-hint ${groupingError ? 'is-error' : ''}`}>
            {groupingError ||
              `Use + notation (e.g. ${defaultGroupingLabel}). Must add up to ${value.numerator}.`}
          </span>
        </Box>
      ) : null}
    </Box>
  );
}

function TimeSignatureDropdownShell({
  value,
  onChange,
  onPick,
  className,
  dropdownClassName,
}: {
  value: TimeSignature;
  onChange: (next: TimeSignature) => void;
  onPick?: () => void;
  className?: string;
  dropdownClassName?: string;
}): ReactElement {
  return (
    <Box
      className={[
        'shared-time-sig-dropdown',
        'shared-bpm-dropdown',
        dropdownClassName,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <TimeSignaturePickerPanel value={value} onChange={onChange} onPick={onPick} />
    </Box>
  );
}

/** Shared meter picker — preset grid plus custom numerator/denominator and optional asymmetric grouping. */
export default function TimeSignatureInput({
  value,
  onChange,
  layout = 'inline',
  disabled = false,
  className,
  dropdownClassName,
}: TimeSignatureInputProps): ReactElement {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const dropdownPaperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  if (layout === 'block') {
    return (
      <TimeSignatureDropdownShell
        value={value}
        onChange={onChange}
        className={className}
        dropdownClassName={dropdownClassName}
      />
    );
  }

  return (
    <Box
      className={['shared-time-sig-input', 'shared-time-sig-input--inline', className].filter(Boolean).join(' ')}
    >
      <Box ref={anchorRef} className="shared-bpm-dropdown-anchor">
        <button
          type="button"
          className="shared-time-sig-trigger"
          disabled={disabled}
          aria-label="Change time signature"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => !disabled && setOpen(true)}
        >
          {formatTimeSignatureDisplay(value)}
        </button>
        <AnchoredPopover
          open={Boolean(open && anchorRef.current && !disabled)}
          anchorEl={anchorRef.current}
          onClose={() => setOpen(false)}
          disableAutoFocus
          disableEnforceFocus
          disableRestoreFocus
          placement="bottom-start"
          paperClassName={[
            'shared-time-sig-dropdown',
            'shared-bpm-dropdown',
            dropdownClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          slotProps={{
            paper: {
              ref: dropdownPaperRef,
            },
          }}
        >
          <TimeSignaturePickerPanel
            value={value}
            onChange={onChange}
            onPick={() => setOpen(false)}
          />
        </AnchoredPopover>
      </Box>
    </Box>
  );
}
