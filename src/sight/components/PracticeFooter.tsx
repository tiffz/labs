import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

interface PracticeFooterProps {
  onSubmit: () => void;
  onSkipAdvance?: () => void;
  awaitingFeedback: boolean;
  progressHint?: string | null;
  hideSubmit?: boolean;
}

function actionHidden(hidden: boolean): string {
  return hidden ? 'sight-footer-action sight-footer-action--hidden' : 'sight-footer-action';
}

export default function PracticeFooter({
  onSubmit,
  onSkipAdvance,
  awaitingFeedback = false,
  progressHint = null,
  hideSubmit = false,
}: PracticeFooterProps): React.ReactElement {
  const showSubmit = !hideSubmit;
  const showContinue = Boolean(onSkipAdvance);

  return (
    <footer className="sight-footer">
      <Stack direction="column" spacing={0.25} sx={{ marginRight: 'auto', minWidth: 0 }}>
        {progressHint && (
          <span className="sight-metrics">{progressHint}</span>
        )}
      </Stack>
      {(showSubmit || showContinue) && (
        <div className="sight-footer-actions">
          {showSubmit && (
            <Button
              variant="contained"
              onClick={onSubmit}
              disabled={awaitingFeedback}
              tabIndex={awaitingFeedback ? -1 : 0}
              aria-hidden={awaitingFeedback}
              className={actionHidden(awaitingFeedback)}
            >
              Submit
            </Button>
          )}
          {showContinue && (
            <Button
              variant="text"
              onClick={onSkipAdvance}
              disabled={!awaitingFeedback}
              tabIndex={awaitingFeedback ? 0 : -1}
              aria-hidden={!awaitingFeedback}
              className={actionHidden(!awaitingFeedback)}
            >
              Continue
            </Button>
          )}
        </div>
      )}
    </footer>
  );
}
