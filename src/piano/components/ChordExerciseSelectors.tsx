import React from 'react';
import {
  CHORD_STYLE_OPTIONS,
  COMMON_CHORD_PROGRESSIONS,
  type ChordStyleId,
} from '../data/chordExercises';

interface ChordProgressionSelectorProps {
  value: string;
  selectedProgression: number | null;
  listId: string;
  error?: string;
  warning?: string;
  onInputChange: (value: string) => void;
  onSelectPreset: (index: number) => void;
  onEnter?: () => void;
}

export const ChordProgressionSelector: React.FC<ChordProgressionSelectorProps> = ({
  value,
  selectedProgression,
  listId,
  error,
  warning,
  onInputChange,
  onSelectPreset,
  onEnter,
}) => {
  return (
    <>
      <input
        type="text"
        className="ep-custom-prog-input"
        value={value}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onEnter?.();
          }
        }}
        placeholder="I–V–vi–IV or C–G–Am–F"
      />
      {error ? <p className="ep-custom-prog-error">{error}</p> : null}
      {!error && warning ? <p className="ep-custom-prog-warning">{warning}</p> : null}
      <div className="ep-prog-grid">
        {COMMON_CHORD_PROGRESSIONS.map((progression, index) => (
          <button
            key={`${listId}-preset-${progression.name}`}
            className={`ep-prog-item ${selectedProgression === index ? 'active' : ''}`}
            onClick={() => onSelectPreset(index)}
            type="button"
          >
            <span className="ep-prog-name">{progression.name}</span>
            {progression.description ? (
              <span className="ep-prog-desc">{progression.description}</span>
            ) : null}
          </button>
        ))}
      </div>
    </>
  );
};

interface ChordStyleSelectorProps {
  selectedStyle: ChordStyleId;
  onSelectStyle: (styleId: ChordStyleId) => void;
}

export const ChordStyleSelector: React.FC<ChordStyleSelectorProps> = ({
  selectedStyle,
  onSelectStyle,
}) => {
  return (
    <div className="ep-style-grid">
      {CHORD_STYLE_OPTIONS.map((styleOption) => (
        <button
          key={styleOption.id}
          className={`ep-style-item ${selectedStyle === styleOption.id ? 'active' : ''}`}
          onClick={() => onSelectStyle(styleOption.id)}
          type="button"
        >
          <span className="ep-style-name">{styleOption.label}</span>
          {styleOption.description ? (
            <span className="ep-style-desc">{styleOption.description}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
};
