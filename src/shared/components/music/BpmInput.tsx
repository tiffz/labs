import React, { useEffect, useMemo, useState } from 'react';
import { COMMON_BPMS, DEFAULT_BPM_MAX, DEFAULT_BPM_MIN } from '../../music/musicInputConstants';

interface BpmInputProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  showRandomize?: boolean;
  showPresetDropdown?: boolean;
  showRateActions?: boolean;
  trailingActions?: React.ReactNode;
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
  showRandomize = false,
  showPresetDropdown = true,
  showRateActions = true,
  trailingActions,
}) => {
  const [draft, setDraft] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);

  const presets = useMemo(() => COMMON_BPMS.filter((candidate) => candidate >= min && candidate <= max), [max, min]);
  const filteredPresets = useMemo(() => presets, [presets]);

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
    onChange(next);
  };

  const bump = (delta: number): void => {
    const next = clamp(value + delta, min, max);
    onChange(next);
    setDraft(String(next));
  };

  return (
    <div className={className}>
      <div className="shared-bpm-dropdown-anchor">
        <div className="shared-bpm-main-row">
          <div className="shared-bpm-shell">
            <div className="shared-bpm-stepper" role="group" aria-label="BPM stepper">
              <input
                className="shared-bpm-value"
                type="text"
                inputMode="numeric"
                value={draft}
                onFocus={() => {
                  setDraft(String(Math.round(value)));
                  setIsEditing(true);
                }}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => {
                  commit(draft);
                  setIsEditing(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    commit(draft);
                    setIsEditing(false);
                  }
                  if (event.key === 'Escape') {
                    setDraft(String(Math.round(value)));
                    setIsEditing(false);
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
                  disabled={value >= max}
                >
                  <span className="material-symbols-outlined">arrow_drop_up</span>
                </button>
                <button
                  type="button"
                  className="shared-bpm-arrow"
                  onClick={() => bump(-step)}
                  aria-label="Decrease BPM"
                  disabled={value <= min}
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
                >
                  ½×
                </button>
                <button
                  type="button"
                  className="shared-bpm-rate-btn inline"
                  onClick={() => onChange(clamp(Math.round(value * 2), min, max))}
                  aria-label="Double BPM"
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
              >
                Random
              </button>
            )}
            {trailingActions}
          </div>
        </div>
        {showPresetDropdown && isEditing && (
          <div className="shared-bpm-dropdown" aria-label="Common BPMs">
            <button
              type="button"
              className="shared-bpm-dropdown-trigger"
              onMouseDown={(event) => event.preventDefault()}
            >
              Common BPMs
            </button>
            <div className="shared-bpm-dropdown-list" role="list" aria-label="Common BPM options">
              {filteredPresets.length > 0 ? (
                filteredPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`shared-bpm-dropdown-item ${Math.round(value) === preset ? 'active' : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(preset);
                      setDraft(String(preset));
                      setIsEditing(false);
                    }}
                  >
                    {preset}
                  </button>
                ))
              ) : (
                <span className="shared-bpm-dropdown-empty">No matching common BPMs</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BpmInput;
