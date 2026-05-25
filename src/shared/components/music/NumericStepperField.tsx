import React, { useEffect, useRef } from 'react';
import './bpmInput.css';

export interface NumericStepperFieldProps {
  /** Committed numeric value (arrow disabled state, hold-repeat baseline). */
  value: number;
  inputValue: string;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onInputFocus?: () => void;
  onInputBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onInputKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  inputAriaLabel: string;
  stepperAriaLabel: string;
  min: number;
  max: number;
  step?: number;
  /** Optional suffix rendered between the value and arrow buttons (e.g. "×"). */
  valueSuffix?: React.ReactNode;
  stepperClassName?: string;
  /** Apply one step in semitones/BPM units; parent clamps and updates state. */
  onBump: (delta: number) => void;
  incrementAriaLabel: string;
  decrementAriaLabel: string;
  disabled?: boolean;
  /** When true, press-and-hold on ▲/▼ repeats steps (tempo control). */
  enableHoldToStep?: boolean;
}

/**
 * Value + ▲▼ stepper row used inside {@link ./BpmInput.tsx} shells (`shared-bpm-stepper`, `shared-bpm-value`, `shared-bpm-arrows`).
 * BPM-agnostic chrome only — domain copy and clamping live in the parent.
 */
export function NumericStepperField({
  value,
  inputValue,
  onInputChange,
  onInputFocus,
  onInputBlur,
  onInputKeyDown,
  inputRef,
  inputMode = 'numeric',
  inputAriaLabel,
  stepperAriaLabel,
  min,
  max,
  step = 1,
  valueSuffix,
  stepperClassName,
  onBump,
  incrementAriaLabel,
  decrementAriaLabel,
  disabled = false,
  enableHoldToStep = false,
}: NumericStepperFieldProps): React.ReactElement {
  const valueRef = useRef(value);
  const holdTimeoutRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const stopHold = (): void => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const bump = (delta: number): void => {
    onBump(delta);
  };

  const startHold = (delta: number): void => {
    if (disabled || !enableHoldToStep) return;
    stopHold();
    suppressNextClickRef.current = true;
    bump(delta);
    holdTimeoutRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(() => bump(delta), 70);
    }, 260);
  };

  useEffect(() => () => stopHold(), []);

  const incDisabled = disabled || value >= max;
  const decDisabled = disabled || value <= min;

  return (
    <div
      className={[
        'shared-bpm-stepper',
        valueSuffix ? 'has-value-suffix' : '',
        stepperClassName,
      ]
        .filter(Boolean)
        .join(' ')}
      role="group"
      aria-label={stepperAriaLabel}
    >
      <input
        ref={inputRef}
        className="shared-bpm-value"
        type="text"
        inputMode={inputMode}
        aria-label={inputAriaLabel}
        value={inputValue}
        onChange={onInputChange}
        onFocus={onInputFocus}
        onBlur={onInputBlur}
        onKeyDown={onInputKeyDown}
        disabled={disabled}
      />
      {valueSuffix ? (
        <span className="shared-bpm-value-suffix" aria-hidden>
          {valueSuffix}
        </span>
      ) : null}
      <div className="shared-bpm-arrows">
        <button
          type="button"
          className="shared-bpm-arrow"
          aria-label={incrementAriaLabel}
          disabled={incDisabled}
          onMouseDown={
            enableHoldToStep
              ? (event) => {
                  event.preventDefault();
                  startHold(step);
                }
              : undefined
          }
          onMouseUp={enableHoldToStep ? stopHold : undefined}
          onMouseLeave={enableHoldToStep ? stopHold : undefined}
          onClick={() => {
            if (enableHoldToStep && suppressNextClickRef.current) {
              suppressNextClickRef.current = false;
              return;
            }
            bump(step);
          }}
        >
          <span className="material-symbols-outlined">arrow_drop_up</span>
        </button>
        <button
          type="button"
          className="shared-bpm-arrow"
          aria-label={decrementAriaLabel}
          disabled={decDisabled}
          onMouseDown={
            enableHoldToStep
              ? (event) => {
                  event.preventDefault();
                  startHold(-step);
                }
              : undefined
          }
          onMouseUp={enableHoldToStep ? stopHold : undefined}
          onMouseLeave={enableHoldToStep ? stopHold : undefined}
          onClick={() => {
            if (enableHoldToStep && suppressNextClickRef.current) {
              suppressNextClickRef.current = false;
              return;
            }
            bump(-step);
          }}
        >
          <span className="material-symbols-outlined">arrow_drop_down</span>
        </button>
      </div>
    </div>
  );
}
