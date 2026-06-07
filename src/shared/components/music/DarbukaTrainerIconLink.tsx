import AppTooltip from '../AppTooltip';
import { resolveDarbukaTrainerHref, type DarbukaTrainerLinkParams } from '../../rhythm/buildDarbukaEditUrl';
import { DARBUKA_TRAINER_LINK_TOOLTIP } from '../../rhythm/buildDarbukaEditUrl';
import './darbukaTrainerIconLink.css';

export type { DarbukaTrainerLinkParams };
export { DARBUKA_TRAINER_LINK_TOOLTIP, resolveDarbukaTrainerHref };

export type DarbukaTrainerIconLinkProps = {
  href?: string | null;
  params?: DarbukaTrainerLinkParams;
  className?: string;
  tooltip?: string;
};

/** Compact external link to Darbuka Trainer (`/drums/`) with shared tooltip + icon styling. */
export default function DarbukaTrainerIconLink({
  href,
  params,
  className,
  tooltip = DARBUKA_TRAINER_LINK_TOOLTIP,
}: DarbukaTrainerIconLinkProps) {
  const resolvedHref = resolveDarbukaTrainerHref(href, params);
  if (!resolvedHref) return null;

  return (
    <AppTooltip title={tooltip}>
      <a
        href={resolvedHref}
        target="_blank"
        rel="noreferrer noopener"
        className={['darbuka-trainer-icon-link', className].filter(Boolean).join(' ')}
        aria-label={tooltip}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          open_in_new
        </span>
      </a>
    </AppTooltip>
  );
}
