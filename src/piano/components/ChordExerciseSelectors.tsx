import React from 'react';
import {
  CHORD_STYLE_OPTIONS,
  COMMON_CHORD_PROGRESSIONS,
  type ChordStyleId,
} from '../data/chordExercises';
import type { Key } from '../types';
import ChordProgressionInput from '../../shared/components/music/ChordProgressionInput';
import ChordStyleInput from '../../shared/components/music/ChordStyleInput';

interface ChordProgressionSelectorProps {
  value: string;
  selectedProgression: number | null;
  listId: string;
  error?: string;
  warning?: string;
  onInputChange: (value: string) => void;
  onSelectPreset: (index: number) => void;
  onEnter?: () => void;
  keyContext?: Key;
  inputInDropdown?: boolean;
  showInputInPopover?: boolean;
  menuMode?: 'popover' | 'inline';
  appearance?: 'default' | 'piano' | 'words' | 'chords';
  presetColumns?: 1 | 2 | 'auto';
  inlineMenuClassName?: string;
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
  keyContext,
  inputInDropdown = false,
  showInputInPopover = false,
  menuMode = 'popover',
  appearance = 'piano',
  presetColumns = 2,
  inlineMenuClassName,
}) => {
  void listId;
  return (
    <>
      <ChordProgressionInput
        value={value}
        onChange={onInputChange}
        onCommit={() => onEnter?.()}
        selectedPresetIndex={selectedProgression}
        onSelectPreset={onSelectPreset}
        presets={COMMON_CHORD_PROGRESSIONS}
        keyContext={keyContext}
        inputClassName="ep-custom-prog-input"
        dropdownClassName="ep-prog-dropdown"
        showResolvedForKey
        inputInDropdown={inputInDropdown}
        showInputInPopover={showInputInPopover}
        menuMode={menuMode}
        appearance={appearance}
        presetColumns={presetColumns}
        inlineMenuClassName={inlineMenuClassName}
      />
      {error ? <p className="ep-custom-prog-error">{error}</p> : null}
      {!error && warning ? <p className="ep-custom-prog-warning">{warning}</p> : null}
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
    <ChordStyleInput
      value={selectedStyle}
      onChange={(styleId) => onSelectStyle(styleId as ChordStyleId)}
      options={CHORD_STYLE_OPTIONS}
      appearance="piano"
      menuMode="inline"
      inlineMenuClassName="np-chord-style-inline-menu"
      menuColumns={2}
    />
  );
};
