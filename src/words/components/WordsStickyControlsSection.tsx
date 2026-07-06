import type { RefObject } from 'react';
import { useCallback, useRef } from 'react';
import { useFocusMenuOnOpen } from '../../shared/a11y/useFocusMenuOnOpen';
import { useLabsDisclosureMenu } from '../../shared/a11y/useLabsDisclosureMenu';
import type { WordRhythmGenerationSettings } from '../utils/prosodyEngine';
import type { RandomizeMode } from '../utils/randomizeModes';
import { RANDOMIZE_MODE_OPTIONS } from '../utils/randomizeModes';
import WordsGenerationSettingsPanel from './WordsGenerationSettingsPanel';
import WordsRandomizeMenuPopover from './WordsRandomizeMenuPopover';
import WordsPlaybackRail from './WordsPlaybackRail';

export type WordsStickyControlsSectionProps = {
  sectionRef: RefObject<HTMLElement | null>;
  isStuck: boolean;
  randomizeButtonRef: RefObject<HTMLDivElement | null>;
  randomizeMenuOpen: boolean;
  selectedRandomizeMode: RandomizeMode;
  onRandomize: () => void;
  onToggleRandomizeMenu: () => void;
  onCloseRandomizeMenu: () => void;
  onSelectRandomizeMode: (mode: RandomizeMode) => void;
  generationButtonRef: RefObject<HTMLButtonElement | null>;
  generationMenuRef: RefObject<HTMLDivElement | null>;
  generationMenuOpen: boolean;
  onToggleGenerationMenu: () => void;
  generationSettings: WordRhythmGenerationSettings;
  onResetGenerationSettings: () => void;
  onSelectAllRules: () => void;
  onClearAllRules: () => void;
  onSetRule: React.ComponentProps<typeof WordsGenerationSettingsPanel>['onSetRule'];
  onSetNoteValueBias: React.ComponentProps<typeof WordsGenerationSettingsPanel>['onSetNoteValueBias'];
  onSetStressAlignment: React.ComponentProps<typeof WordsGenerationSettingsPanel>['onSetStressAlignment'];
  onSetWordStartAlignment: React.ComponentProps<typeof WordsGenerationSettingsPanel>['onSetWordStartAlignment'];
  onGenerationSettingsChange: React.ComponentProps<typeof WordsGenerationSettingsPanel>['onSettingsChange'];
  playbackRailProps: React.ComponentProps<typeof WordsPlaybackRail>;
};

export default function WordsStickyControlsSection({
  sectionRef,
  isStuck,
  randomizeButtonRef,
  randomizeMenuOpen,
  selectedRandomizeMode,
  onRandomize,
  onToggleRandomizeMenu,
  onCloseRandomizeMenu,
  onSelectRandomizeMode,
  generationButtonRef,
  generationMenuRef,
  generationMenuOpen,
  onToggleGenerationMenu,
  generationSettings,
  onResetGenerationSettings,
  onSelectAllRules,
  onClearAllRules,
  onSetRule,
  onSetNoteValueBias,
  onSetStressAlignment,
  onSetWordStartAlignment,
  onGenerationSettingsChange,
  playbackRailProps,
}: WordsStickyControlsSectionProps) {
  const randomizeMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const randomizeDisclosure = useLabsDisclosureMenu({ menuId: 'words-randomize-mode-menu' });
  const generationDisclosure = useLabsDisclosureMenu({
    menuId: 'words-generation-settings-menu',
    hasPopup: 'dialog',
  });

  useFocusMenuOnOpen(generationMenuOpen, generationMenuRef);

  const closeRandomizeMenu = useCallback(() => {
    onCloseRandomizeMenu();
    randomizeMenuTriggerRef.current?.focus();
  }, [onCloseRandomizeMenu]);

  const randomizeTriggerA11y = randomizeDisclosure.getTriggerA11yProps(randomizeMenuOpen);
  const generationTriggerA11y = generationDisclosure.getTriggerA11yProps(generationMenuOpen);

  return (
    <section
      ref={sectionRef}
      className={`words-sticky-controls${isStuck ? ' is-stuck' : ''}`}
    >
      <div className="words-regenerate-row">
        <div className="words-randomize-anchor">
          <div className="words-split-button" ref={randomizeButtonRef}>
            <button
              className="words-button words-button-primary words-split-action"
              type="button"
              onClick={onRandomize}
            >
              Randomize
            </button>
            <button
              {...randomizeTriggerA11y}
              ref={randomizeMenuTriggerRef}
              className="words-button words-button-primary words-split-menu-trigger"
              type="button"
              aria-label="Choose randomization mode"
              onClick={onToggleRandomizeMenu}
            >
              {RANDOMIZE_MODE_OPTIONS.find((o) => o.mode === selectedRandomizeMode)?.label}
              <span className="material-symbols-outlined words-split-arrow" aria-hidden="true">
                arrow_drop_down
              </span>
            </button>
          </div>
          <WordsRandomizeMenuPopover
            open={randomizeMenuOpen}
            anchorEl={randomizeButtonRef.current}
            onClose={closeRandomizeMenu}
            menuId={randomizeDisclosure.menuId}
            activeMode={selectedRandomizeMode}
            onSelect={onSelectRandomizeMode}
          />
        </div>
        <div className="words-generation-anchor">
          <button
            ref={generationButtonRef}
            {...generationTriggerA11y}
            className={`words-button words-gear-button${generationMenuOpen ? ' is-open' : ''}`}
            type="button"
            aria-label="Generation settings"
            onClick={onToggleGenerationMenu}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              settings
            </span>
          </button>
          {generationMenuOpen ? (
            <div ref={generationMenuRef}>
              <WordsGenerationSettingsPanel
                menuId={generationDisclosure.menuId}
                settings={generationSettings}
                onReset={onResetGenerationSettings}
                onSelectAll={onSelectAllRules}
                onClearAll={onClearAllRules}
                onSetRule={onSetRule}
                onSetNoteValueBias={onSetNoteValueBias}
                onSetStressAlignment={onSetStressAlignment}
                onSetWordStartAlignment={onSetWordStartAlignment}
                onSettingsChange={onGenerationSettingsChange}
              />
            </div>
          ) : null}
        </div>
      </div>
      <WordsPlaybackRail {...playbackRailProps} />
    </section>
  );
}
