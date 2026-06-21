import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LabsUndoProvider } from '../../shared/undo/LabsUndoContext';
import { useWordsSectionsState } from './useWordsSectionsState';

function wrapper({ children }: { children: ReactNode }) {
  return <LabsUndoProvider>{children}</LabsUndoProvider>;
}

describe('useWordsSectionsState', () => {
  it('keeps user-selected song key when committing chord-symbol progressions', () => {
    const { result } = renderHook(() => useWordsSectionsState(), { wrapper });
    const sectionId = result.current.sections[0]?.id;
    expect(sectionId).toBeTruthy();

    act(() => {
      result.current.setSongKey('D');
    });
    expect(result.current.songKey).toBe('D');

    act(() => {
      result.current.commitSectionChordProgression(sectionId!, 'G-C-Am-F');
    });

    expect(result.current.songKey).toBe('D');
  });

  it('does not push a commit when chord progression text is unchanged', () => {
    const { result } = renderHook(() => useWordsSectionsState(), { wrapper });
    const sectionId = result.current.sections[0]?.id;
    const initialProgression = result.current.sections[0]?.chordProgressionInput;
    expect(sectionId).toBeTruthy();
    expect(initialProgression).toBeTruthy();

    act(() => {
      result.current.setSongKey('Bb');
    });

    act(() => {
      result.current.commitSectionChordProgression(sectionId!, initialProgression!);
    });

    expect(result.current.songKey).toBe('Bb');
  });
});
