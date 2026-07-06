import React, { useEffect, useMemo, useRef, useState } from 'react';
import AnchoredPopover from '../AnchoredPopover';
import AppSlider from '../AppSlider';
import {
  clampPlaybackRate,
  DEFAULT_PLAYBACK_RATE_MAX,
  DEFAULT_PLAYBACK_RATE_MIN,
  DEFAULT_PLAYBACK_RATE_STEP,
  DEFAULT_SPEED_MENU_PRESETS,
  formatPlaybackRateDraft,
  formatPlaybackRateLabel,
} from '../../music/playbackRateConstants';
import { NumericStepperField } from './NumericStepperField';
import { buildSliderMilestones } from './sliderMilestoneUtils';
import SliderMilestoneLabels from './sliderMilestoneLabels';
import './bpmInput.css';

export interface PlaybackSpeedControlProps {
  value: number;
  onChange: (rate: number) => void;
  min?: number;
  max?: number;
  step?: number;
  presets?: readonly number[];
  className?: string;
  disabled?: boolean;
  dropdownClassName?: string;
  dropdownOffsetPx?: number;
  sliderClassName?: string;
  presetPanelHorizontal?: 'left' | 'right';
  /** Compact chip with tune menu (Stanza toolbar). */
  variant?: 'default' | 'compact' | 'display';
  /** Slot after the stepper (e.g. reset-to-1×). */
  trailingActions?: React.ReactNode;
}

/**
 * Shared playback-speed input with stepper, slider, and preset chips.
 * Uses the same shell / dropdown tokens as {@link BpmInput}.
 */
const PlaybackSpeedControl: React.FC<PlaybackSpeedControlProps> = ({
  value,
  onChange,
  min = DEFAULT_PLAYBACK_RATE_MIN,
  max = DEFAULT_PLAYBACK_RATE_MAX,
  step = DEFAULT_PLAYBACK_RATE_STEP,
  presets = DEFAULT_SPEED_MENU_PRESETS,
  className,
  disabled = false,
  dropdownClassName,
  dropdownOffsetPx,
  sliderClassName,
  presetPanelHorizontal = 'left',
  variant = 'default',
  trailingActions,
}) => {
  const isDisplay = variant === 'display';
  const isCompact = variant === 'compact';
  const showPresetPanel = !isDisplay;
  const [draft, setDraft] = useState(() => formatPlaybackRateDraft(value));
  const [isEditing, setIsEditing] = useState(false);
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const dropdownPaperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const valueRef = useRef(value);

  const filteredPresets = useMemo(
    () => presets.filter((candidate) => candidate >= min && candidate <= max),
    [max, min, presets],
  );

  const sliderMarkValues = useMemo(() => {
    const marks = [min, 0.5, 1, 1.5, max].filter((mark) => mark >= min && mark <= max);
    return Array.from(new Set(marks)).sort((a, b) => a - b);
  }, [max, min]);

  const sliderMarks = useMemo(
    () => sliderMarkValues.map((mark) => ({ value: mark })),
    [sliderMarkValues],
  );

  const milestoneLabels = useMemo(() => {
    const important = [min, 1, max];
    const marks = Array.from(new Set(important.filter((mark) => mark >= min && mark <= max))).sort(
      (a, b) => a - b,
    );
    return buildSliderMilestones(marks, min, max);
  }, [max, min]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (isEditing) return;
    setDraft(formatPlaybackRateDraft(value));
  }, [isEditing, value]);

  const commit = (raw: string): void => {
    const parsed = parseFloat(raw.replace(/×/g, '').trim());
    if (!Number.isFinite(parsed)) {
      setDraft(formatPlaybackRateDraft(value));
      return;
    }
    const next = clampPlaybackRate(parsed, min, max, step);
    setDraft(formatPlaybackRateDraft(next));
    if (Math.abs(next - value) > 1e-5) {
      onChange(next);
    }
  };

  const commitValue = (next: number): void => {
    const clamped = clampPlaybackRate(next, min, max, step);
    onChange(clamped);
    setDraft(formatPlaybackRateDraft(clamped));
  };

  const bump = (delta: number): void => {
    commitValue(valueRef.current + delta);
  };

  const openPanel = (): void => {
    if (disabled) return;
    setIsPresetOpen(true);
    setIsEditing(true);
  };

  const closePanel = (): void => {
    setIsPresetOpen(false);
    setIsEditing(false);
  };

  const presetOpen = Boolean(showPresetPanel && isPresetOpen && anchorRef.current && !disabled);

  return (
    <div className={className}>
      <div className="shared-bpm-dropdown-anchor" ref={anchorRef}>
        <div className="shared-bpm-main-row">
          <div
            className={[
              'shared-bpm-shell',
              isCompact || isDisplay ? 'shared-bpm-shell--compact' : '',
              isEditing ? 'is-editing' : 'is-idle',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {isDisplay ? (
              <span className="shared-bpm-compact-display shared-bpm-compact-display--readonly" aria-label={`Playback speed ${formatPlaybackRateLabel(value)}`}>
                {formatPlaybackRateLabel(value)}
              </span>
            ) : isCompact ? (
              <button
                type="button"
                className="shared-bpm-compact-display"
                disabled={disabled}
                aria-label={`Playback speed ${formatPlaybackRateLabel(value)}. Open menu to change speed.`}
                aria-haspopup="true"
                aria-expanded={presetOpen}
                onClick={openPanel}
              >
                {formatPlaybackRateLabel(value)}
              </button>
            ) : (
              <NumericStepperField
                  value={value}
                  inputValue={isEditing ? draft : formatPlaybackRateLabel(value)}
                  onInputChange={(event) => setDraft(event.target.value)}
                  onInputFocus={() => {
                    if (disabled) return;
                    setDraft(formatPlaybackRateDraft(value));
                    setIsEditing(true);
                    inputRef.current?.select();
                    setIsPresetOpen(true);
                  }}
                  onInputBlur={(event) => {
                    if (disabled) return;
                    commit(draft);
                    const nextTarget = event.relatedTarget;
                    const movingIntoDropdown =
                      nextTarget instanceof Node &&
                      dropdownPaperRef.current?.contains(nextTarget) === true;
                    setIsEditing(movingIntoDropdown);
                    setIsPresetOpen(movingIntoDropdown);
                  }}
                  inputRef={inputRef}
                  disabled={disabled}
                  onInputKeyDown={(event) => {
                    if (disabled) return;
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commit(draft);
                      closePanel();
                    }
                    if (event.key === 'Escape') {
                      setDraft(formatPlaybackRateDraft(value));
                      closePanel();
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
                  min={min}
                  max={max}
                  step={step}
                  onBump={bump}
                  inputMode="decimal"
                  stepperClassName="shared-bpm-stepper--playback-speed"
                  incrementAriaLabel="Increase playback speed"
                  decrementAriaLabel="Decrease playback speed"
                  inputAriaLabel="Playback speed multiplier"
                  stepperAriaLabel="Playback speed stepper"
                  enableHoldToStep
                />
            )}
            {trailingActions ? (
              <div className="shared-bpm-trailing-actions">{trailingActions}</div>
            ) : null}
          </div>
        </div>
        {showPresetPanel ? (
        <AnchoredPopover
          open={presetOpen}
          anchorEl={anchorRef.current}
          onClose={closePanel}
          placement={presetPanelHorizontal === 'right' ? 'bottom-end' : 'bottom-start'}
          paperClassName={[
            'shared-bpm-dropdown',
            'shared-bpm-dropdown--speed',
            dropdownClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          slotProps={{
            paper: {
              style:
                dropdownOffsetPx !== undefined
                  ? { marginTop: `${dropdownOffsetPx}px` }
                  : undefined,
              ref: dropdownPaperRef,
            },
          }}
        >
          <div className="shared-bpm-dropdown-list" aria-label="Common playback speed options">
            <div className="shared-bpm-slider-wrap">
              <AppSlider
                className={['shared-bpm-slider', sliderClassName].filter(Boolean).join(' ')}
                min={min}
                max={max}
                step={step}
                value={value}
                marks={sliderMarks}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v}×`}
                aria-label="Playback speed"
                onChange={(event) => {
                  commitValue(Number(event.target.value));
                }}
              />
              <SliderMilestoneLabels
                milestones={milestoneLabels}
                format={(value) => `${value}×`}
              />
            </div>
            <div className="shared-bpm-presets-section">
              <span className="shared-bpm-presets-label">Common speeds</span>
              <div
                className="shared-bpm-presets-row shared-speed-presets-row"
                role="list"
                aria-label="Common playback speed presets"
              >
                {filteredPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`shared-bpm-preset-chip ${Math.abs(value - preset) < 0.0001 ? 'active' : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      commitValue(preset);
                      closePanel();
                      inputRef.current?.blur();
                    }}
                  >
                    {preset}×
                  </button>
                ))}
              </div>
            </div>
          </div>
        </AnchoredPopover>
        ) : null}
      </div>
    </div>
  );
};

export default PlaybackSpeedControl;
