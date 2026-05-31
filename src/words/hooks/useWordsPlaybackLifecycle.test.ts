import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useWordsKeyboardShortcuts,
  useWordsPlaybackLifecycle,
  useWordsTimeSignatureTemplateReset,
} from './useWordsPlaybackLifecycle';
import { DEFAULT_SECTIONS } from '../utils/wordsAppDefaults';

function keyDown(init: KeyboardEventInit & { target?: HTMLElement }) {
  const { target, ...rest } = init;
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...rest });
  Object.defineProperty(event, 'target', { value: target ?? document.body });
  window.dispatchEvent(event);
  return event;
}

describe('useWordsKeyboardShortcuts', () => {
  it('Escape closes open menus', () => {
    const setGenerationMenuOpen = vi.fn();
    const setSoundMenuOpen = vi.fn();
    const setOpenSectionSettingsId = vi.fn();
    const setSectionRandomizeMenuId = vi.fn();
    const setRandomizeMenuOpen = vi.fn();
    const setExportMenuOpen = vi.fn();

    renderHook(() =>
      useWordsKeyboardShortcuts({
        isPlaying: false,
        stopPlaybackImmediately: vi.fn(),
        setActiveSectionLoopId: vi.fn(),
        setPlaybackSelectionRange: vi.fn(),
        setPendingPlaybackStartMode: vi.fn(),
        setGenerationMenuOpen,
        setSoundMenuOpen,
        setOpenSectionSettingsId,
        setSectionRandomizeMenuId,
        setRandomizeMenuOpen,
        setExportMenuOpen,
        undoSectionsChange: () => false,
      })
    );

    keyDown({ key: 'Escape' });

    expect(setGenerationMenuOpen).toHaveBeenCalledWith(false);
    expect(setSoundMenuOpen).toHaveBeenCalledWith(false);
    expect(setOpenSectionSettingsId).toHaveBeenCalledWith(null);
    expect(setSectionRandomizeMenuId).toHaveBeenCalledWith(null);
    expect(setRandomizeMenuOpen).toHaveBeenCalledWith(false);
    expect(setExportMenuOpen).toHaveBeenCalledWith(false);
  });

  it('Space toggles playback intent outside editable fields', () => {
    const stopPlaybackImmediately = vi.fn();
    const setPendingPlaybackStartMode = vi.fn();
    const setPlaybackSelectionRange = vi.fn();

    const { rerender } = renderHook(
      ({ isPlaying }) =>
        useWordsKeyboardShortcuts({
          isPlaying,
          stopPlaybackImmediately,
          setActiveSectionLoopId: vi.fn(),
          setPlaybackSelectionRange,
          setPendingPlaybackStartMode,
          setGenerationMenuOpen: vi.fn(),
          setSoundMenuOpen: vi.fn(),
          setOpenSectionSettingsId: vi.fn(),
          setSectionRandomizeMenuId: vi.fn(),
          setRandomizeMenuOpen: vi.fn(),
          setExportMenuOpen: vi.fn(),
          undoSectionsChange: () => false,
        }),
      { initialProps: { isPlaying: false } }
    );

    const startEvent = keyDown({ code: 'Space' });
    expect(startEvent.defaultPrevented).toBe(true);
    expect(setPendingPlaybackStartMode).toHaveBeenCalledWith('all');
    expect(setPlaybackSelectionRange).toHaveBeenCalledWith(null);

    rerender({ isPlaying: true });
    keyDown({ code: 'Space' });
    expect(stopPlaybackImmediately).toHaveBeenCalledOnce();
  });

  it('Cmd+Z calls undoSectionsChange when it succeeds', () => {
    const undoSectionsChange = vi.fn(() => true);
    renderHook(() =>
      useWordsKeyboardShortcuts({
        isPlaying: false,
        stopPlaybackImmediately: vi.fn(),
        setActiveSectionLoopId: vi.fn(),
        setPlaybackSelectionRange: vi.fn(),
        setPendingPlaybackStartMode: vi.fn(),
        setGenerationMenuOpen: vi.fn(),
        setSoundMenuOpen: vi.fn(),
        setOpenSectionSettingsId: vi.fn(),
        setSectionRandomizeMenuId: vi.fn(),
        setRandomizeMenuOpen: vi.fn(),
        setExportMenuOpen: vi.fn(),
        undoSectionsChange,
      })
    );

    const event = keyDown({ key: 'z', metaKey: true });
    expect(event.defaultPrevented).toBe(true);
    expect(undoSectionsChange).toHaveBeenCalledOnce();
  });
});

describe('useWordsPlaybackLifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts playback on the next animation frame when pending mode is set', () => {
    const handlePlay = vi.fn();
    const stopPlaybackImmediately = vi.fn();
    const setPendingPlaybackStartMode = vi.fn();

    renderHook(() =>
      useWordsPlaybackLifecycle({
        isPlaying: false,
        pendingPlaybackStartMode: 'all',
        playbackSelectionRange: null,
        notation: 'D---D---',
        timeSignature: { numerator: 4, denominator: 4 },
        handlePlay,
        stopPlaybackImmediately,
        setPendingPlaybackStartMode,
      })
    );

    expect(setPendingPlaybackStartMode).toHaveBeenCalledWith(null);
    expect(stopPlaybackImmediately).toHaveBeenCalledOnce();
    expect(handlePlay).not.toHaveBeenCalled();

    act(() => {
      vi.runAllTimers();
    });
    expect(handlePlay).toHaveBeenCalledOnce();
  });

  it('stops playback when notation changes during play', () => {
    const stopPlaybackImmediately = vi.fn();
    const { rerender } = renderHook(
      ({ notation }) =>
        useWordsPlaybackLifecycle({
          isPlaying: true,
          pendingPlaybackStartMode: null,
          playbackSelectionRange: null,
          notation,
          timeSignature: { numerator: 4, denominator: 4 },
          handlePlay: vi.fn(),
          stopPlaybackImmediately,
          setPendingPlaybackStartMode: vi.fn(),
        }),
      { initialProps: { notation: 'D---D---' } }
    );

    stopPlaybackImmediately.mockClear();
    rerender({ notation: 'T---T---' });
    expect(stopPlaybackImmediately).toHaveBeenCalledOnce();
  });
});

describe('useWordsTimeSignatureTemplateReset', () => {
  it('updates section templates when time signature changes', () => {
    const setSections = vi.fn();
    const setBackingBeatNotation = vi.fn();
    const templatePresets = [{ notation: 'D-T-__T-D---T---' }, { notation: 'D---D---D---D---' }];

    const { rerender } = renderHook(
      ({ timeSignature }) =>
        useWordsTimeSignatureTemplateReset({
          timeSignature,
          templatePresets,
          setSections,
          setBackingBeatNotation,
        }),
      {
        initialProps: {
          timeSignature: { numerator: 4, denominator: 4 },
        },
      }
    );

    rerender({ timeSignature: { numerator: 6, denominator: 8 } });

    expect(setBackingBeatNotation).toHaveBeenCalledWith('D-T-__T-D---T---');
    expect(setSections).toHaveBeenCalledOnce();
    const updater = setSections.mock.calls[0]?.[0];
    expect(typeof updater).toBe('function');
    if (typeof updater === 'function') {
      const next = updater(DEFAULT_SECTIONS);
      expect(next.every((section) => section.templateNotation === 'D-T-__T-D---T---')).toBe(true);
    }
  });
});
