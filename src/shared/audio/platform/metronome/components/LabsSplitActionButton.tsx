import LabsDisclosureChevron from '../../../../components/LabsDisclosureChevron';
import React from 'react';
import AppTooltip from '../../../../components/AppTooltip';
import {
  resolveMetronomeAppearance,
  type MetronomeAppearance,
} from '../metronomeAppearance';
import '../../styles/metronome-control.css';

export type LabsSplitActionButtonProps = {
  appearance?: MetronomeAppearance | string;
  className?: string;
  primaryAction: {
    onClick: () => void;
    ariaLabel: string;
    children: React.ReactNode;
    className?: string;
    pressed?: boolean;
    tooltip?: string;
  };
  menuAction: {
    onClick: () => void;
    ariaLabel: string;
    ariaExpanded: boolean;
    ariaControls?: string;
    children?: React.ReactNode;
    className?: string;
    tooltip?: string;
  };
  primaryFlex?: number;
  menuFlex?: number;
};

function wrapWithTooltip(
  tooltip: string | undefined,
  node: React.ReactElement,
): React.ReactElement {
  if (!tooltip) return node;
  return (
    <AppTooltip title={tooltip} placement="top">
      {node}
    </AppTooltip>
  );
}

export default function LabsSplitActionButton({
  appearance = 'default',
  className = '',
  primaryAction,
  menuAction,
  primaryFlex = 5,
  menuFlex = 1,
}: LabsSplitActionButtonProps) {
  const resolvedAppearance = resolveMetronomeAppearance(appearance);

  const primaryButton = (
    <button
      type="button"
      className={`labs-split-action-button__primary ${primaryAction.className ?? ''}`.trim()}
      onClick={primaryAction.onClick}
      aria-label={primaryAction.ariaLabel}
      aria-pressed={primaryAction.pressed}
    >
      {primaryAction.children}
    </button>
  );

  const menuButton = (
    <button
      type="button"
      className={`labs-split-action-button__menu ${menuAction.className ?? ''}`.trim()}
      onClick={menuAction.onClick}
      aria-label={menuAction.ariaLabel}
      aria-haspopup="menu"
      aria-expanded={menuAction.ariaExpanded}
      aria-controls={menuAction.ariaControls}
    >
      {menuAction.children ?? (
        <LabsDisclosureChevron className="labs-split-action-button__chevron" />
      )}
    </button>
  );

  return (
    <div
      className={`labs-split-action-button labs-split-action-button--${resolvedAppearance} ${className}`.trim()}
      style={{
        ['--labs-split-primary-flex' as string]: primaryFlex,
        ['--labs-split-menu-flex' as string]: menuFlex,
      }}
    >
      <div className="labs-split-action-button__half labs-split-action-button__half--primary">
        {wrapWithTooltip(primaryAction.tooltip, primaryButton)}
      </div>
      <div className="labs-split-action-button__half labs-split-action-button__half--menu">
        {wrapWithTooltip(menuAction.tooltip, menuButton)}
      </div>
    </div>
  );
}
