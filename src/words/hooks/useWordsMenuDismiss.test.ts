import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createRef } from 'react';

import { useWordsMenuDismiss } from './useWordsMenuDismiss';

describe('useWordsMenuDismiss', () => {
  it('does not close section settings when clicking the portaled drum pattern edit menu', () => {
    const sectionSettingsMenu = document.createElement('div');
    document.body.appendChild(sectionSettingsMenu);
    const drumMenu = document.createElement('div');
    drumMenu.className = 'labs-popover-surface drum-pattern-edit-menu';
    document.body.appendChild(drumMenu);
    const chip = document.createElement('button');
    // Text-node targets are common for label clicks; closest() only works on Elements.
    const chipLabel = document.createTextNode('Maqsum');
    chip.appendChild(chipLabel);
    drumMenu.appendChild(chip);

    const sectionSettingsMenuRef = createRef<HTMLDivElement | null>();
    sectionSettingsMenuRef.current = sectionSettingsMenu;

    const setOpenSectionSettingsId = vi.fn();
    const setSoundMenuOpen = vi.fn();
    const noop = vi.fn();

    renderHook(() =>
      useWordsMenuDismiss(
        {
          generationMenuRef: createRef(),
          generationButtonRef: createRef(),
          soundMenuRef: createRef(),
          soundButtonRef: createRef(),
          sectionSettingsMenuRef,
          sectionRandomizeMenuRef: createRef(),
          sectionChorusLinkMenuRef: createRef(),
          exportButtonRef: createRef(),
          randomizeButtonRef: createRef(),
        },
        {
          setGenerationMenuOpen: noop,
          setSoundMenuOpen,
          setOpenSectionSettingsId,
          setSectionRandomizeMenuId: noop,
          setSectionChorusLinkMenuId: noop,
          setExportMenuOpen: noop,
          setRandomizeMenuOpen: noop,
        },
        {
          generationMenuOpen: false,
          soundMenuOpen: false,
          openSectionSettingsId: 'section-1',
          sectionRandomizeMenuId: null,
          sectionChorusLinkMenuId: null,
          exportMenuOpen: false,
          randomizeMenuOpen: false,
        },
      ),
    );

    chipLabel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(setOpenSectionSettingsId).not.toHaveBeenCalled();

    sectionSettingsMenu.remove();
    drumMenu.remove();
  });

  it('does not close sound settings when clicking the portaled drum pattern edit menu', () => {
    const soundMenu = document.createElement('div');
    document.body.appendChild(soundMenu);
    const drumMenu = document.createElement('div');
    drumMenu.className = 'drum-pattern-edit-menu';
    document.body.appendChild(drumMenu);
    const chip = document.createElement('button');
    drumMenu.appendChild(chip);

    const soundMenuRef = createRef<HTMLDivElement | null>();
    soundMenuRef.current = soundMenu;

    const setSoundMenuOpen = vi.fn();
    const setOpenSectionSettingsId = vi.fn();
    const noop = vi.fn();

    renderHook(() =>
      useWordsMenuDismiss(
        {
          generationMenuRef: createRef(),
          generationButtonRef: createRef(),
          soundMenuRef,
          soundButtonRef: createRef(),
          sectionSettingsMenuRef: createRef(),
          sectionRandomizeMenuRef: createRef(),
          sectionChorusLinkMenuRef: createRef(),
          exportButtonRef: createRef(),
          randomizeButtonRef: createRef(),
        },
        {
          setGenerationMenuOpen: noop,
          setSoundMenuOpen,
          setOpenSectionSettingsId,
          setSectionRandomizeMenuId: noop,
          setSectionChorusLinkMenuId: noop,
          setExportMenuOpen: noop,
          setRandomizeMenuOpen: noop,
        },
        {
          generationMenuOpen: false,
          soundMenuOpen: true,
          openSectionSettingsId: null,
          sectionRandomizeMenuId: null,
          sectionChorusLinkMenuId: null,
          exportMenuOpen: false,
          randomizeMenuOpen: false,
        },
      ),
    );

    chip.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(setSoundMenuOpen).not.toHaveBeenCalled();

    soundMenu.remove();
    drumMenu.remove();
  });
});
