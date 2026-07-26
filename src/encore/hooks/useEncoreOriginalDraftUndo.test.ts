import 'fake-indexeddb/auto';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LabsUndoProvider, useLabsUndo } from '../../shared/undo/LabsUndoContext';
import { encoreDb } from '../db/encoreDb';
import {
  createBlankOriginalSong,
  type EncoreOriginalSong,
  type OriginalAudioTake,
} from '../originals/types';
import { useEncoreOriginalDraftUndo } from './useEncoreOriginalDraftUndo';

function wrapper({ children }: { children: ReactNode }) {
  return createElement(LabsUndoProvider, null, children);
}

describe('useEncoreOriginalDraftUndo', () => {
  it('pushes undo for draft mutations and restores on undo', async () => {
    let draft: EncoreOriginalSong | null = createBlankOriginalSong();
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

  it('persists the forward structural change immediately (added take survives reload)', async () => {
    await encoreDb.originals.clear();

    // A song already saved in Dexie, opened on the Record takes screen.
    const seeded: EncoreOriginalSong = { ...createBlankOriginalSong(), id: 'song-1', title: 'Meet me' };
    await encoreDb.originals.put(seeded);

    let draft: EncoreOriginalSong | null = seeded;
    const setDraft = vi.fn(
      (next: typeof draft | null | ((prev: typeof draft | null) => typeof draft | null)) => {
        draft = typeof next === 'function' ? next(draft) : (next ?? draft);
      },
    );
    // Mirrors OriginalSongPage's persistOriginalNow → Dexie write.
    const persist = async (song: EncoreOriginalSong) => {
      await encoreDb.originals.put(song);
    };

    const { result } = renderHook(
      () => useEncoreOriginalDraftUndo({ draft, setDraft, persist }),
      { wrapper },
    );

    // User uploads a take: blob is stored separately; the take row is added structurally.
    const take: OriginalAudioTake = {
      id: 'take-1',
      label: 'Take 1.m4a',
      timestamp: Date.now(),
      source: 'imported',
      hasLocalAudio: true,
      mimeType: 'audio/mp4',
    };

    await act(async () => {
      result.current.applyOriginalDraftChange((s) => ({
        ...s,
        takes: [...s.takes, take],
        mainTakeId: s.mainTakeId ?? take.id,
      }));
      // Let the fire-and-forget forward persist flush.
      await Promise.resolve();
    });

    // Chip is showing (draft updated in memory).
    expect(draft?.takes).toHaveLength(1);

    // Simulate a page reload: read the song back from the store.
    const reloaded = await encoreDb.originals.get('song-1');
    expect(reloaded?.takes).toHaveLength(1);
    expect(reloaded?.takes[0]?.id).toBe('take-1');
    expect(reloaded?.mainTakeId).toBe('take-1');
  });
});
