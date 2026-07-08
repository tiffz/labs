import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LabsUndoProvider, useLabsUndo } from '../../shared/undo/LabsUndoContext';
import { createBlankOriginalSong } from '../originals/types';
import { useEncoreOriginalDraftUndo } from './useEncoreOriginalDraftUndo';

function wrapper({ children }: { children: ReactNode }) {
  return createElement(LabsUndoProvider, null, children);
}

describe('useEncoreOriginalDraftUndo', () => {
  it('pushes undo for draft mutations and restores on undo', async () => {
    let draft = createBlankOriginalSong();
    draft = { ...draft, title: 'Before' };
    const setDraft = vi.fn((next: typeof draft | null | ((prev: typeof draft | null) => typeof draft | null)) => {
      draft = typeof next === 'function' ? next(draft) : next ?? draft;
    });
    const persist = vi.fn(async () => {});

    const { result } = renderHook(
      () => {
        const undo = useLabsUndo();
        const draftUndo = useEncoreOriginalDraftUndo({ draft, setDraft, persist });
        return { undo, draftUndo };
      },
      { wrapper },
    );

    act(() => {
      result.current.draftUndo.applyOriginalDraftChange((s) => ({ ...s, title: 'After' }));
    });

    expect(draft?.title).toBe('After');

    await act(async () => {
      await result.current.undo.undo();
    });

    expect(draft?.title).toBe('Before');
    expect(persist).toHaveBeenCalled();
  });
});
