import { useEffect, useState, type ReactElement } from 'react';
import Typography from '@mui/material/Typography';
import { NumericStepperField } from '../../shared/components/music/NumericStepperField';

export type MidiIntStepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export function MidiIntStepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
}: MidiIntStepperProps): ReactElement {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (next: number) => {
    const clamped = Math.max(min, Math.min(max, Math.round(next)));
    onChange(clamped);
    setDraft(String(clamped));
  };

  const labelId = `${label.replace(/\s+/g, '-').toLowerCase()}-label`;

  return (
    <div className="midi-int-stepper">
      <Typography
        component="span"
        variant="caption"
        className="midi-field-label"
        id={labelId}
      >
        {label}
      </Typography>
      <div className="shared-bpm-input">
        <div className="shared-bpm-shell is-idle">
          <NumericStepperField
            value={value}
            inputValue={draft}
            onInputChange={(event) => setDraft(event.target.value)}
            onInputBlur={() => {
              const parsed = Number(draft);
              commit(Number.isFinite(parsed) ? parsed : value);
            }}
            onInputKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
            inputRef={undefined}
            min={min}
            max={max}
            step={step}
            onBump={(delta) => commit(value + delta)}
            incrementAriaLabel={`Increase ${label}`}
            decrementAriaLabel={`Decrease ${label}`}
            inputAriaLabel={label}
            stepperAriaLabel={label}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
