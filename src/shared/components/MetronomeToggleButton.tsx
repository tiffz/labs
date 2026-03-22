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
}

const MetronomeToggleButton: React.FC<MetronomeToggleButtonProps> = ({
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
}) => {
  const classes = `${className}${enabled ? ` ${activeClassName}` : ''}`.trim();
  return (
    <button
      type="button"
      className={classes}
      onClick={onToggle}
      aria-label={ariaLabel}
      title={enabled ? tooltipOn : tooltipOff}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-tooltip={
        dataTooltipOn || dataTooltipOff
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
};

export default MetronomeToggleButton;
