import { useEffect } from 'react';
import type { RefObject } from 'react';
import { resolveEventTargetElement } from '../../shared/dom/resolveEventTargetElement';
import { isDrumPatternEditMenuTarget } from '../../shared/components/music/drumPatternEditMenu';
import { isPlaybackFieldSelectPopoverTarget } from '../../shared/components/music/playbackFieldSelect';

export type WordsMenuDismissRefs = {
  generationMenuRef: RefObject<HTMLDivElement | null>;
  generationButtonRef: RefObject<HTMLButtonElement | null>;
  soundMenuRef: RefObject<HTMLDivElement | null>;
  soundButtonRef: RefObject<HTMLButtonElement | null>;
  sectionSettingsMenuRef: RefObject<HTMLDivElement | null>;
  sectionRandomizeMenuRef: RefObject<HTMLDivElement | null>;
  sectionChorusLinkMenuRef: RefObject<HTMLDivElement | null>;
  exportButtonRef: RefObject<HTMLButtonElement | null>;
  randomizeButtonRef: RefObject<HTMLDivElement | null>;
};

export type WordsMenuDismissActions = {
  setGenerationMenuOpen: (open: boolean) => void;
  setSoundMenuOpen: (open: boolean) => void;
  setOpenSectionSettingsId: (id: string | null) => void;
  setSectionRandomizeMenuId: (id: string | null) => void;
  setSectionChorusLinkMenuId: (id: string | null) => void;
  setExportMenuOpen: (open: boolean) => void;
  setRandomizeMenuOpen: (open: boolean) => void;
};

export type WordsMenuDismissState = {
  generationMenuOpen: boolean;
  soundMenuOpen: boolean;
  openSectionSettingsId: string | null;
  sectionRandomizeMenuId: string | null;
  sectionChorusLinkMenuId: string | null;
  exportMenuOpen: boolean;
  randomizeMenuOpen: boolean;
};

export function useWordsMenuDismiss(
  refs: WordsMenuDismissRefs,
  actions: WordsMenuDismissActions,
  state: WordsMenuDismissState,
): void {
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const inGenerationMenu = refs.generationMenuRef.current?.contains(target);
      const inGenerationButton = refs.generationButtonRef.current?.contains(target);
      if (!inGenerationMenu && !inGenerationButton) {
        actions.setGenerationMenuOpen(false);
      }
      const inSoundMenu = refs.soundMenuRef.current?.contains(target);
      const inSoundButton = refs.soundButtonRef.current?.contains(target);
      const inDrumPatternEditMenu = isDrumPatternEditMenuTarget(target);
      if (
        !inSoundMenu &&
        !inSoundButton &&
        !isPlaybackFieldSelectPopoverTarget(target) &&
        !inDrumPatternEditMenu
      ) {
        actions.setSoundMenuOpen(false);
      }
      const targetEl = resolveEventTargetElement(target);
      const inSectionSettingsAnchor = Boolean(targetEl?.closest('.words-section-settings-anchor'));
      const inSectionSettingsMenu = refs.sectionSettingsMenuRef.current?.contains(target);
      const inSectionChordPopover = Boolean(
        targetEl?.closest('.words-section-chord-dropdown-root') ||
          targetEl?.closest('.words-section-style-dropdown-root'),
      );
      // Drum edit menu portals to body — treat it as still "inside" section settings.
      if (
        !inSectionSettingsAnchor &&
        !inSectionSettingsMenu &&
        !inSectionChordPopover &&
        !inDrumPatternEditMenu
      ) {
        actions.setOpenSectionSettingsId(null);
      }
      const inSectionRandomizeAnchor = Boolean(targetEl?.closest('.words-section-randomize-anchor'));
      const inSectionRandomizeMenu = refs.sectionRandomizeMenuRef.current?.contains(target);
      if (!inSectionRandomizeAnchor && !inSectionRandomizeMenu) {
        actions.setSectionRandomizeMenuId(null);
      }
      const inSectionChorusLinkAnchor = Boolean(
        targetEl?.closest('.words-section-chorus-link-anchor'),
      );
      const inSectionChorusLinkMenu = refs.sectionChorusLinkMenuRef.current?.contains(target);
      if (!inSectionChorusLinkAnchor && !inSectionChorusLinkMenu) {
        actions.setSectionChorusLinkMenuId(null);
      }
      const inExportButton = refs.exportButtonRef.current?.contains(target);
      if (!inExportButton) {
        actions.setExportMenuOpen(false);
      }
      const inRandomizeButton = refs.randomizeButtonRef.current?.contains(target);
      const inRandomizeMenu = Boolean(targetEl?.closest('.words-randomize-menu'));
      if (!inRandomizeButton && !inRandomizeMenu) {
        actions.setRandomizeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
    // Refs and setState dispatchers are stable; read .current inside handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (state.generationMenuOpen) {
        event.preventDefault();
        actions.setGenerationMenuOpen(false);
        refs.generationButtonRef.current?.focus();
        return;
      }
      if (state.soundMenuOpen) {
        event.preventDefault();
        actions.setSoundMenuOpen(false);
        refs.soundButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [
    actions,
    refs.generationButtonRef,
    refs.soundButtonRef,
    state.generationMenuOpen,
    state.soundMenuOpen,
  ]);
}
