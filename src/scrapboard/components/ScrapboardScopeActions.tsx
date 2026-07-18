import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import type { ReactElement } from 'react';

import AppTooltip from '../../shared/components/AppTooltip';
import DiceIcon from '../../shared/components/DiceIcon';

export type ScrapboardScopeActionsProps = {
  scopeLabel: string;
  locked: boolean;
  onToggleLock: () => void;
  onRandomize: () => void;
  /** `multiple` for page-level randomize-all. */
  diceVariant?: 'single' | 'multiple';
  testIdPrefix: string;
  className?: string;
  /**
   * `ghost` (default): quiet icon pair for embedding in chips/headers.
   * `plain`: even quieter (section titles).
   */
  density?: 'ghost' | 'plain';
};

/**
 * Shared dice + lock pair for Scrapboard section randomize (Chords / Words pattern).
 * Kept visually quiet so chips/headers stay the primary affordance.
 */
export function ScrapboardScopeActions({
  scopeLabel,
  locked,
  onToggleLock,
  onRandomize,
  diceVariant = 'single',
  testIdPrefix,
  className,
  density = 'ghost',
}: ScrapboardScopeActionsProps): ReactElement {
  const lockTip = locked
    ? `Unlock ${scopeLabel} to allow randomization`
    : `Lock ${scopeLabel} to prevent randomization`;
  const diceTip = locked ? `${scopeLabel} is locked` : `Randomize ${scopeLabel}`;

  return (
    <span
      className={[
        'scrapboard-scope-actions',
        `scrapboard-scope-actions--${density}`,
        locked ? 'scrapboard-scope-actions--locked' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <AppTooltip title={diceTip}>
        <span>
          <button
            type="button"
            className="scrapboard-scope-actions__btn"
            aria-label={diceTip}
            disabled={locked}
            data-testid={`${testIdPrefix}-randomize`}
            onClick={(event) => {
              event.stopPropagation();
              onRandomize();
            }}
          >
            <DiceIcon variant={diceVariant} size={15} opacity={0.92} />
          </button>
        </span>
      </AppTooltip>
      <AppTooltip title={lockTip}>
        <button
          type="button"
          className={[
            'scrapboard-scope-actions__btn',
            locked ? 'scrapboard-scope-actions__btn--locked' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label={lockTip}
          aria-pressed={locked}
          data-testid={`${testIdPrefix}-lock`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleLock();
          }}
        >
          {locked ? (
            <LockOutlinedIcon sx={{ fontSize: 14 }} />
          ) : (
            <LockOpenOutlinedIcon sx={{ fontSize: 14 }} />
          )}
        </button>
      </AppTooltip>
    </span>
  );
}
