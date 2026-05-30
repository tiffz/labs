import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import type { ReactElement, ReactNode } from 'react';
import {
  playbackFieldSelectRootClass,
  type PlaybackFieldSelectAppearance,
} from './playbackFieldSelect';
import './playbackFieldSelect.css';

export type PlaybackFieldSelectTriggerProps = {
  appearance?: PlaybackFieldSelectAppearance;
  valueLabel: ReactNode;
  trailing?: ReactNode;
  /** Extra class on the `<button>` trigger (app-specific tweaks). */
  triggerClassName?: string;
  /** Extra class on the outer wrapper (layout hooks). */
  className?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  onClick?: () => void;
};

export function PlaybackFieldSelectTrigger({
  appearance = 'default',
  valueLabel,
  trailing,
  triggerClassName,
  className,
  disabled = false,
  id,
  'aria-label': ariaLabel,
  'aria-expanded': ariaExpanded,
  'aria-controls': ariaControls,
  onClick,
}: PlaybackFieldSelectTriggerProps): ReactElement {
  return (
    <div className={playbackFieldSelectRootClass(appearance, className)}>
      <button
        type="button"
        id={id}
        className={['shared-playback-field-select__trigger', triggerClassName]
          .filter(Boolean)
          .join(' ')}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        aria-haspopup="listbox"
      >
        <span className="shared-playback-field-select__value">
          {valueLabel}
          {trailing}
        </span>
        <KeyboardArrowDownIcon className="shared-playback-field-select__chevron" aria-hidden />
      </button>
    </div>
  );
}
