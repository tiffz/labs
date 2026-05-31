import type { RefObject } from 'react';
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
              className="words-button words-button-primary words-split-menu-trigger"
              type="button"
              onClick={onToggleRandomizeMenu}
              aria-label="Choose randomization mode"
            >
              {RANDOMIZE_MODE_OPTIONS.find((o) => o.mode === selectedRandomizeMode)?.label}
              <span className="material-symbols-outlined words-split-arrow">arrow_drop_down</span>
            </button>
          </div>
          <WordsRandomizeMenuPopover
            open={randomizeMenuOpen}
            anchorEl={randomizeButtonRef.current}
            onClose={onCloseRandomizeMenu}
            activeMode={selectedRandomizeMode}
            onSelect={onSelectRandomizeMode}
          />
        </div>
        <div className="words-generation-anchor">
          <button
            ref={generationButtonRef}
            className={`words-button words-gear-button${generationMenuOpen ? ' is-open' : ''}`}
            type="button"
            aria-label="Generation settings"
            onClick={onToggleGenerationMenu}
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          {generationMenuOpen ? (
            <div ref={generationMenuRef}>
              <WordsGenerationSettingsPanel
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
