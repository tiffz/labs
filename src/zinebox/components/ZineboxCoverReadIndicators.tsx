import AppTooltip from '../../shared/components/AppTooltip';
import type { ZineboxCoverReadSummary } from '../utils/zineboxCoverReadSummary';

type ZineboxCoverReadIndicatorsProps = ZineboxCoverReadSummary;

export default function ZineboxCoverReadIndicators({
  readStatus,
  progressPercentage,
}: ZineboxCoverReadIndicatorsProps): React.ReactElement | null {
  if (readStatus === 'unread') {
    return (
      <AppTooltip title="Unread">
        <span className="zinebox-cover-card__unread-dot-wrap">
          <span className="zinebox-cover-card__unread-dot" aria-label="Unread" />
        </span>
      </AppTooltip>
    );
  }

  if (readStatus === 'in_progress') {
    const clamped = Math.min(100, Math.max(0, Math.round(progressPercentage)));
    return (
      <AppTooltip title={`${clamped}% read`}>
        <span
          className="zinebox-cover-card__progress"
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${clamped}% read`}
        >
          <span
            className="zinebox-cover-card__progress-fill"
            style={{ width: `${clamped}%` }}
          />
        </span>
      </AppTooltip>
    );
  }

  return null;
}
