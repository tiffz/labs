import React, { useId, useRef, useState } from 'react';
import AnchoredPopover from '../../../../components/AnchoredPopover';
import type { TimeSignature } from '../../../../rhythm/types';
import type { MetronomePreferences } from '../preferences';
import {
  metronomeSettingsPopoverClass,
  resolveMetronomeAppearance,
  type MetronomeAppearance,
} from '../metronomeAppearance';
import LabsSplitActionButton from './LabsSplitActionButton';
import MetronomeAdvancedSettingsPanel from './MetronomeAdvancedSettingsPanel';
import { useFocusMenuOnOpen } from '../../../../a11y/useFocusMenuOnOpen';
import '../../styles/metronome-control.css';

export type MetronomeSplitControlProps = {
  enabled: boolean;
  onToggle: () => void;
  preferences: MetronomePreferences;
  onPreferencesChange: (next: MetronomePreferences) => void;
  timeSignature: TimeSignature;
  /** @deprecated Non-default indicator removed from UI; prop ignored. */
  isNonDefault?: boolean;
  appearance?: MetronomeAppearance | string;
  toggleClassName?: string;
  toggleActiveClassName?: string;
  ariaLabel?: string;
  iconName?: string;
  tooltipOn?: string;
  tooltipOff?: string;
  menuTooltip?: string;
  showStateIndicator?: boolean;
  showTooltip?: boolean;
};

export default function MetronomeSplitControl({
  enabled,
  onToggle,
  preferences,
  onPreferencesChange,
  timeSignature,
  appearance = 'default',
  toggleClassName = '',
  toggleActiveClassName = 'active',
  ariaLabel = 'Toggle metronome',
  iconName = 'timer',
  tooltipOn = 'Metronome on',
  tooltipOff = 'Metronome off',
  menuTooltip = 'Metronome settings',
  showStateIndicator = false,
  showTooltip = true,
}: MetronomeSplitControlProps) {
  const resolvedAppearance = resolveMetronomeAppearance(appearance);
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  useFocusMenuOnOpen(menuOpen, menuPanelRef);

  const closeMenu = (restoreFocus = true): void => {
    setMenuOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        anchorRef.current
          ?.querySelector<HTMLButtonElement>('.labs-split-action-button__primary')
          ?.focus();
      });
    }
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
    }
  };

  const toggleClasses = `${toggleClassName}${enabled ? ` ${toggleActiveClassName}` : ''}`.trim();
  const resolvedAriaLabel = ariaLabel === 'Toggle metronome'
    ? enabled
      ? tooltipOn
      : tooltipOff
    : ariaLabel;

  return (
    <>
      <div ref={anchorRef} className={`labs-metronome-split-control labs-focus-ring-host labs-metronome-split-control--${resolvedAppearance}`}>
        <LabsSplitActionButton
          appearance={resolvedAppearance}
          primaryFlex={5}
          menuFlex={1}
          primaryAction={{
            onClick: onToggle,
            ariaLabel: resolvedAriaLabel,
            pressed: enabled,
            tooltip: showTooltip ? (enabled ? tooltipOn : tooltipOff) : undefined,
            className: toggleClasses,
            children: (
              <span className="labs-metronome-toggle-content">
                <span className="material-symbols-outlined labs-metronome-toggle-icon" aria-hidden="true">
                  {iconName}
                </span>
                {showStateIndicator ? (
                  <span
                    className={`labs-metronome-state-pill${enabled ? ' is-on' : ''}`}
                    aria-hidden="true"
                  >
                    {enabled ? 'On' : 'Off'}
                  </span>
                ) : null}
              </span>
            ),
          }}
          menuAction={{
            onClick: () => setMenuOpen((open) => !open),
            ariaLabel: menuTooltip,
            tooltip: showTooltip ? menuTooltip : undefined,
            ariaExpanded: menuOpen,
            ariaControls: panelId,
          }}
        />
      </div>
      <AnchoredPopover
        open={menuOpen}
        anchorEl={anchorRef.current}
        onClose={(_, reason) => {
          closeMenu(reason === 'escapeKeyDown');
        }}
        paperClassName={metronomeSettingsPopoverClass(resolvedAppearance)}
        slotProps={{
          paper: {
            id: panelId,
            role: 'menu',
            onKeyDownCapture: handleMenuKeyDown,
          },
        }}
      >
        <div ref={menuPanelRef}>
          <MetronomeAdvancedSettingsPanel
            appearance={resolvedAppearance}
            preferences={preferences}
            timeSignature={timeSignature}
            onChange={onPreferencesChange}
            enabled={enabled}
            onEnabledChange={(next) => {
              if (next !== enabled) onToggle();
            }}
          />
        </div>
      </AnchoredPopover>
    </>
  );
}
