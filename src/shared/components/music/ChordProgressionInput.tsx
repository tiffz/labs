import React, { useMemo, useRef, useState } from 'react';
import Popover from '@mui/material/Popover';
import type { Key } from '../../music/chordTypes';
import { progressionToChords } from '../../music/chordTheory';
import { COMMON_CHORD_PROGRESSIONS, type CommonChordProgression } from '../../music/commonChordProgressions';
import { parseProgressionText } from '../../music/chordProgressionText';
import './chordProgressionInput.css';

interface ChordProgressionInputProps {
  value: string;
  onChange: (next: string) => void;
  onCommit?: (next: string) => void;
  onSelectPreset?: (index: number) => void;
  selectedPresetIndex?: number | null;
  presets?: CommonChordProgression[];
  keyContext?: Key;
  showResolvedForKey?: boolean;
  keyAware?: boolean;
  inferKey?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  inlineMenuClassName?: string;
  inputInDropdown?: boolean;
  showInputInPopover?: boolean;
  menuMode?: 'popover' | 'inline';
  appearance?: 'default' | 'piano' | 'words' | 'chords';
  presetColumns?: 1 | 2 | 'auto';
  error?: string;
  warning?: string;
  disabled?: boolean;
}

const QUALITY_SUFFIX: Record<string, string> = {
  major: '',
  minor: 'm',
  diminished: 'dim',
  augmented: 'aug',
  sus2: 'sus2',
  sus4: 'sus4',
  dominant7: '7',
  major7: 'maj7',
  minor7: 'm7',
};

function progressionToChordLabel(progression: CommonChordProgression, key: Key): string {
  const chords = progressionToChords(progression.progression, key);
  return chords
    .map((chord) => `${chord.root}${QUALITY_SUFFIX[chord.quality] ?? ''}`)
    .join('–');
}

function normalizeProgressionText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[–—−-]/g, '-');
}

/**
 * Shared chord progression editor with preset picking and key-aware resolution.
 */
const ChordProgressionInput: React.FC<ChordProgressionInputProps> = ({
  value,
  onChange,
  onCommit,
  onSelectPreset,
  selectedPresetIndex = null,
  presets = COMMON_CHORD_PROGRESSIONS,
  keyContext,
  showResolvedForKey = false,
  keyAware = true,
  inferKey = true,
  placeholder = 'I–V–vi–IV or C–G–Am–F',
  className,
  inputClassName,
  dropdownClassName,
  inlineMenuClassName,
  inputInDropdown = false,
  showInputInPopover = false,
  menuMode = 'popover',
  appearance = 'default',
  presetColumns = 'auto',
  error,
  warning,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownInputRef = useRef<HTMLInputElement | null>(null);
  const parsed = useMemo(
    () => parseProgressionText(value, keyContext ?? 'C', { keyAware, inferKey }),
    [inferKey, keyAware, keyContext, value],
  );
  const resolvedKey = keyContext ?? parsed.inferredKey ?? null;
  const query = value.trim().toLowerCase();
  const orderedPresets = useMemo(() => {
    if (!query) return presets;
    const score = (preset: CommonChordProgression): number => {
      const name = preset.name.toLowerCase();
      const progression = preset.progression.join('–').toLowerCase();
      if (name === query || progression === query) return 0;
      if (name.startsWith(query) || progression.startsWith(query)) return 1;
      if (name.includes(query) || progression.includes(query)) return 2;
      return 3;
    };
    return [...presets].sort((a, b) => {
      const sa = score(a);
      const sb = score(b);
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });
  }, [presets, query]);
  const selectedByValueIndex = useMemo(() => {
    if (selectedPresetIndex !== null) return selectedPresetIndex;
    const normalizedValue = normalizeProgressionText(value);
    if (!normalizedValue) return null;
    const matchedIndex = presets.findIndex(
      (preset) => normalizeProgressionText(preset.progression.join('–')) === normalizedValue,
    );
    return matchedIndex >= 0 ? matchedIndex : null;
  }, [presets, selectedPresetIndex, value]);

  const commit = () => {
    onCommit?.(value);
  };
  const useInputInDropdown = inputInDropdown && menuMode === 'popover';
  const showPopoverInput = menuMode === 'popover' && (useInputInDropdown || showInputInPopover);

  const openMenu = () => {
    if (disabled) return;
    setOpen(true);
    window.setTimeout(() => {
      if (showPopoverInput) dropdownInputRef.current?.focus();
    }, 0);
  };

  return (
    <div
      className={[
        'shared-chord-progression-input',
        `shared-chord-progression-input--${appearance}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="shared-chord-progression-anchor" ref={anchorRef}>
        {useInputInDropdown ? (
          <button
            type="button"
            className="shared-chord-progression-trigger"
            onClick={openMenu}
            disabled={disabled}
          >
            <span className="shared-chord-progression-trigger-text">{value || placeholder}</span>
            <span className="material-symbols-outlined">expand_more</span>
          </button>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={value}
            className={['shared-chord-progression-text', inputClassName].filter(Boolean).join(' ')}
            onFocus={() => {
              if (menuMode === 'popover') openMenu();
            }}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commit();
                if (menuMode === 'popover') setOpen(false);
              }
              if (event.key === 'Escape' && menuMode === 'popover') setOpen(false);
            }}
            onBlur={() => commit()}
            placeholder={placeholder}
            disabled={disabled}
          />
        )}
      </div>
      {menuMode === 'popover' ? (
        <Popover
          open={Boolean(open && anchorRef.current)}
          anchorEl={anchorRef.current}
          onClose={() => setOpen(false)}
          disableAutoFocus
          disableEnforceFocus
          disableRestoreFocus
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            root: {
              className: dropdownClassName ? `${dropdownClassName}-root` : undefined,
            },
            paper: {
              className: [
                'shared-chord-progression-dropdown',
                `shared-chord-progression-dropdown--${appearance}`,
                dropdownClassName,
              ]
                .filter(Boolean)
                .join(' '),
            },
          }}
        >
          <div className="shared-chord-progression-dropdown-list">
            {showPopoverInput ? (
              <input
                ref={dropdownInputRef}
                type="text"
                className={['shared-chord-progression-text', inputClassName].filter(Boolean).join(' ')}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commit();
                    setOpen(false);
                  }
                }}
                placeholder={placeholder}
                disabled={disabled}
              />
            ) : null}
            <div
              className={[
                'shared-chord-progression-preset-list',
                presetColumns === 1
                  ? 'shared-chord-progression-preset-list--cols-1'
                  : presetColumns === 2
                    ? 'shared-chord-progression-preset-list--cols-2'
                    : null,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {orderedPresets.map((preset) => {
                const presetIndex = presets.findIndex((entry) => entry.name === preset.name);
                const isSelected = selectedByValueIndex === presetIndex;
                const resolvedText =
                  showResolvedForKey && resolvedKey
                    ? progressionToChordLabel(preset, resolvedKey)
                    : null;
                return (
                  <button
                    key={`${preset.name}-${preset.progression.join('-')}`}
                    type="button"
                    className={`shared-chord-progression-preset ${isSelected ? 'active' : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (disabled) return;
                      if (presetIndex >= 0) {
                        onSelectPreset?.(presetIndex);
                        if (!onSelectPreset) {
                          onChange(preset.progression.join('–'));
                        }
                      }
                      setOpen(false);
                    }}
                  >
                    <span className="shared-chord-progression-name">{preset.name}</span>
                    {preset.description ? (
                      <span className="shared-chord-progression-description">{preset.description}</span>
                    ) : null}
                    {resolvedText ? (
                      <span className="shared-chord-progression-resolved">{resolvedText}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </Popover>
      ) : (
        <div
          className={[
            'shared-chord-progression-inline-content',
            `shared-chord-progression-inline-content--${appearance}`,
            inlineMenuClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="shared-chord-progression-inline-list">
            <div
              className={[
                'shared-chord-progression-preset-list',
                presetColumns === 1
                  ? 'shared-chord-progression-preset-list--cols-1'
                  : presetColumns === 2
                    ? 'shared-chord-progression-preset-list--cols-2'
                    : null,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {orderedPresets.map((preset) => {
                const presetIndex = presets.findIndex((entry) => entry.name === preset.name);
                const isSelected = selectedByValueIndex === presetIndex;
                const resolvedText =
                  showResolvedForKey && resolvedKey
                    ? progressionToChordLabel(preset, resolvedKey)
                    : null;
                return (
                  <button
                    key={`${preset.name}-${preset.progression.join('-')}`}
                    type="button"
                    className={`shared-chord-progression-preset ${isSelected ? 'active' : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (disabled) return;
                      if (presetIndex >= 0) {
                        onSelectPreset?.(presetIndex);
                        if (!onSelectPreset) {
                          onChange(preset.progression.join('–'));
                        }
                      }
                    }}
                  >
                    <span className="shared-chord-progression-name">{preset.name}</span>
                    {preset.description ? (
                      <span className="shared-chord-progression-description">{preset.description}</span>
                    ) : null}
                    {resolvedText ? (
                      <span className="shared-chord-progression-resolved">{resolvedText}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {error ? <p className="shared-chord-progression-error">{error}</p> : null}
      {!error && warning ? <p className="shared-chord-progression-warning">{warning}</p> : null}
    </div>
  );
};

export default ChordProgressionInput;
