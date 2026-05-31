import type { PhrasingMode } from '../utils/prosodyEngine';
import type { AlignmentStrength } from '../utils/prosodyEngine';
import AppTooltip from '../../shared/components/AppTooltip';

export const PHRASING_OPTIONS: Array<{ value: PhrasingMode; label: string; help: string }> = [
  { value: 'repeat', label: 'Repeat', help: 'The same rhythmic template repeats every measure, giving a steady, predictable feel.' },
  { value: 'halfMeasureVariations', label: 'A/B variations', help: 'Splits each measure into two halves and shuffles different half-measure combos across the song for more variety.' },
];

export const ALIGNMENT_HELP = {
  stress: 'Snap stressed syllables toward stronger beats.',
  wordStart: 'Nudge word starts toward beat anchors (can add small rests before words).',
} as const;

export const ALIGNMENT_STRENGTH_OPTIONS = ['light', 'strong'] as const satisfies readonly AlignmentStrength[];

type WordsSettingHelpLabelProps = {
  text: string;
  help: string;
};

/** Section heading + info tooltip (Words generation settings). */
export function WordsSettingHelpLabel({ text, help }: WordsSettingHelpLabelProps) {
  return (
    <span className="words-setting-label">
      {text}
      <AppTooltip title={help}>
        <button
          className="words-setting-help"
          type="button"
          tabIndex={-1}
          aria-label={`${text} help`}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            info
          </span>
        </button>
      </AppTooltip>
    </span>
  );
}
