import React from 'react';

interface MetronomeToggleButtonProps {
  enabled: boolean;
  onToggle: () => void;
  className?: string;
  activeClassName?: string;
  label?: string;
  iconName?: string;
  tooltipOn?: string;
  tooltipOff?: string;
  dataTooltipOn?: string;
  dataTooltipOff?: string;
  showOnLabel?: boolean;
  onLabelText?: string;
  ariaLabel?: string;
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLButtonElement>;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  includeNativeTitle?: boolean;
  includeDataTooltip?: boolean;
  [key: string]: unknown;
}

const MetronomeToggleButton = React.forwardRef<
  HTMLButtonElement,
  MetronomeToggleButtonProps
>(
  (
    {
      enabled,
      onToggle,
      className = '',
      activeClassName = 'active',
      label,
      iconName = 'timer',
      tooltipOn = 'Metronome: On',
      tooltipOff = 'Metronome: Off',
      dataTooltipOn,
      dataTooltipOff,
      showOnLabel = true,
      onLabelText = 'On',
      ariaLabel = 'Toggle metronome',
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      includeNativeTitle = true,
      includeDataTooltip = true,
      ...rest
    },
    ref
  ) => {
    const classes = `${className}${enabled ? ` ${activeClassName}` : ''}`.trim();
    return (
      <button
        ref={ref}
        type="button"
        className={classes}
        onClick={onToggle}
        aria-label={ariaLabel}
        title={includeNativeTitle ? (enabled ? tooltipOn : tooltipOff) : undefined}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        {...rest}
        data-tooltip={
          includeDataTooltip && (dataTooltipOn || dataTooltipOff)
            ? enabled
              ? dataTooltipOn ?? tooltipOn
              : dataTooltipOff ?? tooltipOff
            : undefined
        }
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {iconName}
        </span>
        {label ? <span className="metronome-label">{label}</span> : null}
        {showOnLabel && enabled ? (
          <span className="metronome-on-label">{onLabelText}</span>
        ) : null}
      </button>
    );
  }
);

MetronomeToggleButton.displayName = 'MetronomeToggleButton';

export default MetronomeToggleButton;
