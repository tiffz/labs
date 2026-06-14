import AppTooltip from '../../shared/components/AppTooltip';

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
