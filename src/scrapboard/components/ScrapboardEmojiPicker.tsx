import { useState, type ReactElement } from 'react';

const CURATED_EMOJIS = [
  '🧑',
  '👩',
  '🧒',
  '👨',
  '👧',
  '👦',
  '🧓',
  '👮',
  '🧑‍🚀',
  '🧙',
  '🧛',
  '🦸',
  '🐱',
  '🐶',
  '🦊',
  '🐻',
  '🐸',
  '👻',
  '🤖',
  '👽',
  '🙂',
  '😎',
  '🤓',
  '😈',
];

export type ScrapboardEmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
};

export function ScrapboardEmojiPicker({ value, onChange }: ScrapboardEmojiPickerProps): ReactElement {
  const [custom, setCustom] = useState('');

  return (
    <div className="scrapboard-emoji-picker" data-testid="scrapboard-emoji-picker">
      <div className="scrapboard-emoji-picker__grid" role="listbox" aria-label="Emoji">
        {CURATED_EMOJIS.map((emoji) => {
          const active = emoji === value;
          return (
            <button
              key={emoji}
              type="button"
              role="option"
              aria-selected={active}
              className={[
                'scrapboard-emoji-picker__option',
                active ? 'scrapboard-emoji-picker__option--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onChange(emoji)}
            >
              <span className="scrapboard-emoji scrapboard-emoji--sm" aria-hidden>
                {emoji}
              </span>
            </button>
          );
        })}
      </div>
      <label className="scrapboard-emoji-picker__custom">
        <span>Any emoji</span>
        <input
          type="text"
          value={custom}
          placeholder="Paste emoji"
          maxLength={8}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            const next = custom.trim();
            if (!next) return;
            onChange([...next][0] ?? next);
            setCustom('');
          }}
        />
        <button
          type="button"
          className="scrapboard-btn scrapboard-btn--ghost"
          onClick={() => {
            const next = custom.trim();
            if (!next) return;
            onChange([...next][0] ?? next);
            setCustom('');
          }}
        >
          Apply
        </button>
      </label>
    </div>
  );
}
