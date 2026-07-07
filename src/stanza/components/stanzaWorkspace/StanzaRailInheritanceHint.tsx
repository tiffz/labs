import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import AppTooltip from '../../../shared/components/AppTooltip';
import type { StanzaScopeInheritanceMode } from '../../utils/stanzaScopePractice';
import type { ReactElement } from 'react';

export type StanzaRailInheritanceHintProps = {
  mode: StanzaScopeInheritanceMode;
  onResetToParent?: () => void;
  resetLabel?: string;
  inheritLabel?: string;
  customLabel?: string;
  /** When false, custom mode omits the status chip (reset control may still show). */
  showCustomStatus?: boolean;
  /** `embedded` sits inside a control chrome row (e.g. drum pattern toolbar). */
  variant?: 'field' | 'embedded';
};

export default function StanzaRailInheritanceHint({
  mode,
  onResetToParent,
  resetLabel = 'Use song value',
  inheritLabel = 'From whole song',
  customLabel = 'Custom for this section',
  showCustomStatus = true,
  variant = 'field',
}: StanzaRailInheritanceHintProps): ReactElement | null {
  if (mode === 'direct') return null;

  const hintClassName = [
    'stanza-rail-inheritance-hint',
    variant === 'embedded' ? 'stanza-rail-inheritance-hint--embedded' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (mode === 'custom' && !showCustomStatus) {
    if (!onResetToParent) return null;
    return (
      <div className={hintClassName}>
        <AppTooltip title={resetLabel}>
          <button
            type="button"
            className="stanza-rail-inheritance-reset"
            onClick={onResetToParent}
            aria-label={resetLabel}
          >
            <RestartAltOutlinedIcon sx={{ fontSize: 15 }} aria-hidden />
          </button>
        </AppTooltip>
      </div>
    );
  }

  return (
    <div className={hintClassName}>
      <span
        className={[
          'stanza-rail-inheritance-hint__status',
          mode === 'custom' ? 'stanza-rail-inheritance-hint__status--custom' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {mode === 'inherit' ? inheritLabel : customLabel}
      </span>
      {mode === 'custom' && onResetToParent ? (
        <AppTooltip title={resetLabel}>
          <button
            type="button"
            className="stanza-rail-inheritance-reset"
            onClick={onResetToParent}
            aria-label={resetLabel}
          >
            <RestartAltOutlinedIcon sx={{ fontSize: 15 }} aria-hidden />
          </button>
        </AppTooltip>
      ) : null}
    </div>
  );
}
