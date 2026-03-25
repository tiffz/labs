import React, { useEffect, useMemo, useRef, useState } from 'react';
import Popover from '@mui/material/Popover';
import { COMMON_BPMS, DEFAULT_BPM_MAX, DEFAULT_BPM_MIN } from '../../music/musicInputConstants';
import AppSlider from '../AppSlider';
import './bpmInput.css';

interface BpmInputProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  showRandomize?: boolean;
  showPresetDropdown?: boolean;
  showRateActions?: boolean;
  leadingActions?: React.ReactNode;
  trailingActions?: React.ReactNode;
  randomizeLabel?: string;
  dropdownClassName?: string;
  dropdownOffsetPx?: number;
  sliderClassName?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const BpmInput: React.FC<BpmInputProps> = ({
  value,
  onChange,
  min = DEFAULT_BPM_MIN,
  max = DEFAULT_BPM_MAX,
  step = 1,
  className,
  disabled = false,
  showRandomize = false,
  showPresetDropdown = true,
  showRateActions = true,
  leadingActions,
  trailingActions,
  randomizeLabel = 'Random',
  dropdownClassName,
  dropdownOffsetPx,
  sliderClassName,
}) => {
  const [draft, setDraft] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const dropdownPaperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const presets = useMemo(() => COMMON_BPMS.filter((candidate) => candidate >= min && candidate <= max), [max, min]);
  const filteredPresets = useMemo(() => presets, [presets]);
  const sliderMarkValues = useMemo(() => {
    const majorMilestones = [20, 50, 100, 150, 200, 300];
    const rawMarks = [...majorMilestones, min, max]
      .filter((mark) => mark >= min && mark <= max);
    return Array.from(new Set(rawMarks)).sort((a, b) => a - b);
  }, [max, min]);
  const sliderMarks = useMemo(
    () => sliderMarkValues.map((mark) => ({ value: mark })),
    [sliderMarkValues]
  );
  const milestoneLabels = useMemo(() => {
    const important = [min, 100, 200, max];
    return Array.from(new Set(important.filter((mark) => mark >= min && mark <= max))).sort((a, b) => a - b);
  }, [max, min]);

  useEffect(() => {
    if (isEditing) return;
    setDraft(String(Math.round(value)));
  }, [isEditing, value]);

  const commit = (raw: string): void => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const next = clamp(parsed, min, max);
    setDraft(String(next));
    if (next !== value) {
      onChange(next);
    }
  };

  const bump = (delta: number): void => {
    const next = clamp(value + delta, min, max);
    onChange(next);
    setDraft(String(next));
  };

  return (
    <div className={className}>
      <div className="shared-bpm-dropdown-anchor" ref={anchorRef}>
        <div className="shared-bpm-main-row">
          <div className={`shared-bpm-shell ${isEditing ? 'is-editing' : 'is-idle'}`}>
            {leadingActions ? (
              <div className="shared-bpm-leading-actions">{leadingActions}</div>
            ) : null}
            <div className="shared-bpm-stepper" role="group" aria-label="BPM stepper">
              <input
                className="shared-bpm-value"
                type="text"
                inputMode="numeric"
                aria-label="Tempo in BPM"
                value={draft}
                onFocus={() => {
                  if (disabled) return;
                  setDraft(String(Math.round(value)));
                  setIsEditing(true);
                  if (showPresetDropdown) {
                    setIsPresetOpen(true);
                  }
                }}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={(event) => {
                  if (disabled) return;
                  commit(draft);
                  const nextTarget = event.relatedTarget;
                  const movingIntoDropdown =
                    nextTarget instanceof Node &&
                    dropdownPaperRef.current?.contains(nextTarget) === true;
                  setIsEditing(movingIntoDropdown);
                  setIsPresetOpen(movingIntoDropdown);
                }}
                ref={inputRef}
                disabled={disabled}
                onKeyDown={(event) => {
                  if (disabled) return;
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commit(draft);
                    setIsEditing(false);
                    setIsPresetOpen(false);
                  }
                  if (event.key === 'Escape') {
                    setDraft(String(Math.round(value)));
                    setIsEditing(false);
                    setIsPresetOpen(false);
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    bump(step);
                  }
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    bump(-step);
                  }
                }}
              />
              <div className="shared-bpm-arrows">
                <button
                  type="button"
                  className="shared-bpm-arrow"
                  onClick={() => bump(step)}
                  aria-label="Increase BPM"
                  disabled={disabled || value >= max}
                >
                  <span className="material-symbols-outlined">arrow_drop_up</span>
                </button>
                <button
                  type="button"
                  className="shared-bpm-arrow"
                  onClick={() => bump(-step)}
                  aria-label="Decrease BPM"
                  disabled={disabled || value <= min}
                >
                  <span className="material-symbols-outlined">arrow_drop_down</span>
                </button>
              </div>
            </div>
            {showRateActions && (
              <div className="shared-bpm-rate-inline" role="group" aria-label="BPM scale actions">
                <button
                  type="button"
                  className="shared-bpm-rate-btn inline"
                  onClick={() => onChange(clamp(Math.round(value / 2), min, max))}
                  aria-label="Halve BPM"
                  disabled={disabled}
                >
                  ½×
                </button>
                <button
                  type="button"
                  className="shared-bpm-rate-btn inline"
                  onClick={() => onChange(clamp(Math.round(value * 2), min, max))}
                  aria-label="Double BPM"
                  disabled={disabled}
                >
                  2×
                </button>
              </div>
            )}
            {showRandomize && (
              <button
                type="button"
                className="shared-bpm-inline-action"
                onClick={() => {
                  const random = presets[Math.floor(Math.random() * presets.length)] ?? min;
                  onChange(random);
                  setDraft(String(random));
                }}
                disabled={disabled}
              >
                {randomizeLabel}
              </button>
            )}
            {trailingActions ? (
              <div className="shared-bpm-trailing-actions">{trailingActions}</div>
            ) : null}
          </div>
        </div>
        <Popover
          open={Boolean(showPresetDropdown && isPresetOpen && anchorRef.current && !disabled)}
          anchorEl={anchorRef.current}
          onClose={() => {
            setIsPresetOpen(false);
            setIsEditing(false);
          }}
          disableAutoFocus
          disableEnforceFocus
          disableRestoreFocus
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              className: ['shared-bpm-dropdown', dropdownClassName].filter(Boolean).join(' '),
              style: dropdownOffsetPx !== undefined ? { marginTop: `${dropdownOffsetPx}px` } : undefined,
              ref: dropdownPaperRef,
            },
          }}
        >
          <div className="shared-bpm-dropdown-list" aria-label="Common BPM options">
            <div className="shared-bpm-slider-wrap">
              <AppSlider
                className={['shared-bpm-slider', sliderClassName].filter(Boolean).join(' ')}
                min={min}
                max={max}
                step={step}
                value={Math.round(value)}
                marks={sliderMarks}
                aria-label="Tempo slider"
                onChange={(event) => {
                  const next = clamp(Number(event.target.value), min, max);
                  onChange(next);
                  setDraft(String(next));
                }}
              />
              <div className="shared-bpm-milestones" aria-hidden="true">
                {milestoneLabels.map((label) => (
                  <span key={`milestone-${label}`}>{label}</span>
                ))}
              </div>
            </div>
            <div className="shared-bpm-presets-section">
              <span className="shared-bpm-presets-label">Common BPMs</span>
              <div className="shared-bpm-presets-row" role="list" aria-label="Common BPM presets">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`shared-bpm-preset-chip ${Math.round(value) === preset ? 'active' : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(preset);
                      setDraft(String(preset));
                      setIsEditing(false);
                      setIsPresetOpen(false);
                      inputRef.current?.blur();
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Popover>
      </div>
    </div>
  );
};

export default BpmInput;
