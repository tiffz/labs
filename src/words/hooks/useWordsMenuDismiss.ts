import { useEffect } from 'react';
import type { RefObject } from 'react';
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

export function useWordsMenuDismiss(
  refs: WordsMenuDismissRefs,
  actions: WordsMenuDismissActions
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
      if (!inSoundMenu && !inSoundButton && !isPlaybackFieldSelectPopoverTarget(target)) {
        actions.setSoundMenuOpen(false);
      }
      const inSectionSettingsAnchor =
        target instanceof Element &&
        target.closest('.words-section-settings-anchor');
      const inSectionSettingsMenu = refs.sectionSettingsMenuRef.current?.contains(target);
      const inSectionChordPopover =
        target instanceof Element &&
        Boolean(
          target.closest('.words-section-chord-dropdown-root') ||
          target.closest('.words-section-style-dropdown-root')
        );
      if (!inSectionSettingsAnchor && !inSectionSettingsMenu && !inSectionChordPopover) {
        actions.setOpenSectionSettingsId(null);
      }
      const inSectionRandomizeAnchor =
        target instanceof Element &&
        target.closest('.words-section-randomize-anchor');
      const inSectionRandomizeMenu = refs.sectionRandomizeMenuRef.current?.contains(target);
      if (!inSectionRandomizeAnchor && !inSectionRandomizeMenu) {
        actions.setSectionRandomizeMenuId(null);
      }
      const inSectionChorusLinkAnchor =
        target instanceof Element &&
        target.closest('.words-section-chorus-link-anchor');
      const inSectionChorusLinkMenu = refs.sectionChorusLinkMenuRef.current?.contains(target);
      if (!inSectionChorusLinkAnchor && !inSectionChorusLinkMenu) {
        actions.setSectionChorusLinkMenuId(null);
      }
      const inExportButton = refs.exportButtonRef.current?.contains(target);
      if (!inExportButton) {
        actions.setExportMenuOpen(false);
      }
      const inRandomizeButton = refs.randomizeButtonRef.current?.contains(target);
      const inRandomizeMenu =
        target instanceof Element &&
        Boolean(target.closest('.words-randomize-menu'));
      if (!inRandomizeButton && !inRandomizeMenu) {
        actions.setRandomizeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
    // Refs and setState dispatchers are stable; read .current inside handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
