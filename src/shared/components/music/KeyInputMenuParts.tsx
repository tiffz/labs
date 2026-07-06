import React from 'react';
import { DISPLAY_KEYS_12, type MusicKey } from '../../music/musicInputConstants';
import type { HarmonicMode } from '../../music/chordTheory';
import {
  formatSongKey,
  relativeParallelKey,
} from '../../music/songKeyFormat';

const ENHARMONIC_TO_DISPLAY: Record<string, MusicKey> = {
  'C#': 'Db',
  'D#': 'Eb',
  Gb: 'F#',
  'G#': 'Ab',
  'A#': 'Bb',
};

function normalizeToDisplayKey(key: MusicKey): MusicKey {
  return ENHARMONIC_TO_DISPLAY[key] ?? key;
}

export interface KeyInputMenuProps {
  value: MusicKey;
  onSelect: (next: MusicKey) => void;
  keys?: ReadonlyArray<MusicKey>;
  className?: string;
  itemClassName?: string;
}

export const KeyInputMenu: React.FC<KeyInputMenuProps> = ({
  value,
  onSelect,
  keys = DISPLAY_KEYS_12,
  className,
  itemClassName,
}) => {
  const active = normalizeToDisplayKey(value);
  return (
    <div className={['shared-key-grid', className].filter(Boolean).join(' ')}>
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          className={[
            'shared-key-grid-item',
            itemClassName,
            normalizeToDisplayKey(key) === active ? 'active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(key)}
        >
          {key}
        </button>
      ))}
    </div>
  );
};

export interface KeyModeToggleProps {
  mode: HarmonicMode;
  onChange: (next: HarmonicMode) => void;
  className?: string;
}

export const KeyModeToggle: React.FC<KeyModeToggleProps> = ({ mode, onChange, className }) => (
  <div className={['shared-key-mode-toggle', className].filter(Boolean).join(' ')} role="group" aria-label="Key quality">
    {(['major', 'minor'] as const).map((option) => (
      <button
        key={option}
        type="button"
        className={['shared-key-mode-toggle-btn', mode === option ? 'active' : ''].filter(Boolean).join(' ')}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onChange(option)}
      >
        {option}
      </button>
    ))}
  </div>
);

export interface KeyRelativeSwitchProps {
  value: string;
  modeFormat?: 'short' | 'long';
  onSelect: (next: string) => void;
  className?: string;
}

const RELATIVE_KEY_WIKI_URL = 'https://en.wikipedia.org/wiki/Relative_key';

/** Switch to the relative major/minor partner (same key signature, new tonic). */
export const KeyRelativeSwitch: React.FC<KeyRelativeSwitchProps> = ({
  value,
  modeFormat = 'short',
  onSelect,
  className,
}) => {
  const relative = relativeParallelKey(value);
  const relativeLabel = formatSongKey(relative.root, relative.mode, modeFormat);
  const relativeKind = relative.mode === 'major' ? 'major' : 'minor';

  return (
    <div className={['shared-key-relative-switch', className].filter(Boolean).join(' ')}>
      <div className="shared-key-relative-switch-head">
        <p className="shared-key-relative-switch-label">Relative key</p>
        <a
          href={RELATIVE_KEY_WIKI_URL}
          target="_blank"
          rel="noreferrer"
          className="shared-key-relative-switch-link"
          aria-label="Learn more about relative keys (Wikipedia)"
        >
          Learn more
        </a>
      </div>
      <button
        type="button"
        className="shared-key-relative-switch-btn"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onSelect(formatSongKey(relative.root, relative.mode, modeFormat))}
      >
        Use relative {relativeKind}: {relativeLabel}
      </button>
    </div>
  );
};
