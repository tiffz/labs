import AppTooltip from '../../shared/components/AppTooltip';

interface SightQuestionHelpProps {
  text: string;
}

/** Optional context for drills that need induction or axis explanation. */
export default function SightQuestionHelp({ text }: SightQuestionHelpProps): React.ReactElement {
  return (
    <AppTooltip title={text} placement="bottom">
      <button type="button" className="sight-prompt-help" aria-label="About this question">
        <span className="material-symbols-outlined" aria-hidden>
          help
        </span>
      </button>
    </AppTooltip>
  );
}
