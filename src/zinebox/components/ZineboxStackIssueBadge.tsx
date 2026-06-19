import { zineboxStackIssueCountLabel } from '../utils/zineboxCoverReadSummary';

type ZineboxStackIssueBadgeProps = {
  count: number;
};

export default function ZineboxStackIssueBadge({
  count,
}: ZineboxStackIssueBadgeProps): React.ReactElement {
  const label = zineboxStackIssueCountLabel(count);

  return (
    <span className="zinebox-stack-card__issue-badge" title={label} aria-label={label}>
      <span className="material-symbols-outlined" aria-hidden>
        layers
      </span>
      <span className="zinebox-stack-card__issue-count">{count}</span>
    </span>
  );
}
