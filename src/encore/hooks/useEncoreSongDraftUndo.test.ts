import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LabsUndoProvider, useLabsUndo } from '../../shared/undo/LabsUndoContext';
import type { EncoreSong } from '../types';
import { useEncoreSongDraftUndo } from './useEncoreSongDraftUndo';

function minimalSong(overrides: Partial<EncoreSong> = {}): EncoreSong {
  return {
    id: 's1',
    title: 'T',
    artist: 'A',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return createElement(LabsUndoProvider, null, children);
}

describe('useEncoreSongDraftUndo', () => {
  it('pushes undo for draft mutations and restores on undo', async () => {
    let draft: EncoreSong | null = minimalSong({ title: 'Before' });
    const setDraft = vi.fn((next: EncoreSong | null | ((prev: EncoreSong | null) => EncoreSong | null)) => {
      draft = typeof next === 'function' ? next(draft) : next;
    });
    const persist = vi.fn(async () => {});

    const { result } = renderHook(
      () => {
        const undo = useLabsUndo();
        const draftUndo = useEncoreSongDraftUndo({ draft, setDraft, persist });
        return { undo, draftUndo };
      },
      { wrapper },
    );

    act(() => {
      result.current.draftUndo.applySongDraftChange((s) => ({ ...s, title: 'After' }));
    });

    expect(draft?.title).toBe('After');

    await act(async () => {
      await result.current.undo.undo();
    });

    expect(draft?.title).toBe('Before');
    expect(persist).toHaveBeenCalled();
  });
});
