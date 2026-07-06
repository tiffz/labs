import React, { useState, useRef, useEffect } from 'react';
import type { TimeSignature } from '../types';
import LabsDisclosureChevron from '../../shared/components/LabsDisclosureChevron';
import {
  getPresetNotation,
  getRhythmPresetFamilies,
  RHYTHM_DATABASE,
} from '../../shared/rhythm/presetDatabase';
import { recognizeRhythm } from '../utils/rhythmRecognition';
import { useLabsDisclosureMenu } from '../../shared/a11y/useLabsDisclosureMenu';
import { useFocusMenuOnOpen } from '../../shared/a11y/useFocusMenuOnOpen';
import { getFocusableElements, handleMenuListKeyDown } from '../../shared/a11y/focusable';

interface RhythmPresetsProps {
  onSelectPreset: (notation: string, timeSignature: TimeSignature) => void;
  onImportTab?: () => void;
  currentNotation?: string;
  currentTimeSignature?: TimeSignature;
}

const RhythmPresets: React.FC<RhythmPresetsProps> = ({
  onSelectPreset,
  onImportTab,
  currentNotation = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { getMenuProps, getTriggerA11yProps } = useLabsDisclosureMenu({ hasPopup: 'menu' });
  const menuProps = getMenuProps();
  const families = getRhythmPresetFamilies();
  const recognized = recognizeRhythm(currentNotation);

  useFocusMenuOnOpen(isOpen, menuRef);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const closeMenu = (): void => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const items = getFocusableElements(event.currentTarget);
    handleMenuListKeyDown(event, items, { onEscape: closeMenu });
  };

  const handleSelectPreset = (presetId: string) => {
    const rhythm = RHYTHM_DATABASE[presetId];
    if (!rhythm) return;
    const targetTimeSignature = rhythm.timeSignature;
    const notation = getPresetNotation(rhythm, targetTimeSignature);
    onSelectPreset(notation, targetTimeSignature);
    closeMenu();
  };

  const handleImportTab = () => {
    closeMenu();
    onImportTab?.();
  };

  return (
    <div className="rhythm-presets-dropdown" ref={dropdownRef}>
      <button
        ref={triggerRef}
        className="load-rhythm-button"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
        {...getTriggerA11yProps(isOpen)}
      >
        <span className="load-rhythm-button__label">Load Rhythm</span>
        <LabsDisclosureChevron className="load-rhythm-button__chevron" />
      </button>

      {isOpen ? (
        <div
          ref={menuRef}
          className="labs-popover-surface drums-floating-menu rhythm-presets-menu dropdown-menu"
          role="menu"
          aria-label="Load Rhythm"
          onKeyDown={handleMenuKeyDown}
          tabIndex={-1}
          {...menuProps}
        >
          <div className="drums-floating-menu__body">
          {families.map((family) => (
            <section key={family.id} className="rhythm-presets-family">
              <h3 className="drums-floating-menu__section-label rhythm-presets-family__label">{family.label}</h3>
              <div className="rhythm-presets-family__meters">
                {family.meterGroups.map((meterGroup) => (
                  <section key={meterGroup.id} className="rhythm-presets-meter">
                    <div className="rhythm-presets-meter__label">{meterGroup.meterLabel}</div>
                    <div
                      className="rhythm-presets-meter__chips"
                      role="group"
                      aria-label={`${family.label} ${meterGroup.meterLabel}`}
                    >
                      {meterGroup.presetIds.map((presetId) => {
                        const rhythm = RHYTHM_DATABASE[presetId];
                        if (!rhythm) return null;
                        const isActive = recognized?.rhythm.id === presetId;
                        return (
                          <button
                            key={presetId}
                            type="button"
                            role="menuitem"
                            className={`drums-floating-menu__chip rhythm-presets-chip${isActive ? ' is-active rhythm-presets-chip--active' : ''}`}
                            onClick={() => handleSelectPreset(presetId)}
                          >
                            {rhythm.name}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ))}

          {onImportTab ? (
            <>
              <div className="drums-floating-menu__divider rhythm-presets-menu__divider" role="separator" />
              <button
                className="drums-floating-menu__action-row rhythm-presets-import"
                onClick={handleImportTab}
                type="button"
                role="menuitem"
              >
                <span className="material-symbols-outlined" aria-hidden>upload</span>
                Import tab…
              </button>
            </>
          ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RhythmPresets;
