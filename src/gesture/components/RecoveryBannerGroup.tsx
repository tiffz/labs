import { useState, type ReactNode } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LabsDisclosureChevron from '../../shared/components/LabsDisclosureChevron';

type RecoveryBannerGroupProps = {
  /** One entry per interrupted item. Rendered as-is once expanded. */
  banners: ReactNode[];
};

/**
 * Collapses several recovery banners into one summary.
 *
 * Collections rendered a full banner per interrupted upload or merge, so
 * coming back to five of them buried the toolbar and the library under a wall
 * of near-identical warnings. Someone in that state wants to know how much is
 * unfinished and resume it — not triage each item before they can see the page.
 *
 * A single interruption still shows its own banner: there is nothing to
 * summarise, and the detail is what that person needs.
 */
export default function RecoveryBannerGroup({ banners }: RecoveryBannerGroupProps) {
  const [expanded, setExpanded] = useState(false);

  if (banners.length === 0) return null;
  if (banners.length === 1) return <>{banners[0]}</>;

  return (
    <div className="gesture-recovery-group">
      <div className="gesture-banner gesture-banner--warning gesture-recovery-summary" role="status">
        <div className="gesture-recovery-summary-text">
          <Typography className="gesture-recovery-summary-title" component="p">
            {banners.length} collections need attention
          </Typography>
          <Typography className="gesture-recovery-summary-copy" variant="body2">
            These collections stopped before finishing. Your photos are safe. Pick up
            where each one left off, or remove it.
          </Typography>
        </div>
        <Button
          className="gesture-recovery-summary-toggle"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          size="small"
        >
          {expanded ? 'Hide' : 'Review'}
          <LabsDisclosureChevron
            className={expanded ? 'is-expanded' : 'is-collapsed'}
          />
        </Button>
      </div>
      {expanded ? <div className="gesture-recovery-group-items">{banners}</div> : null}
    </div>
  );
}
