import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useConceptArtSelection } from './useConceptArtSelection';
import type { VisualDevAsset } from '../types';

function asset(id: string): VisualDevAsset {
  return {
    id,
    projectId: 'p1',
    kind: 'image',
    title: id,
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('useConceptArtSelection', () => {
  it('selects the first gallery piece by default', () => {
    const gallery = [asset('a'), asset('b')];
    const { result, rerender } = renderHook(({ items }) => useConceptArtSelection(items), {
      initialProps: { items: gallery },
    });

    expect(result.current.selected?.id).toBe('a');
    expect(result.current.selectedIndex).toBe(0);

    rerender({ items: gallery });
    act(() => result.current.selectNext());
    expect(result.current.selected?.id).toBe('b');

    act(() => result.current.selectNext());
    expect(result.current.selected?.id).toBe('a');
  });

  it('cycles through four gallery pieces', () => {
    const gallery = [asset('a'), asset('b'), asset('c'), asset('d')];
    const { result } = renderHook(() => useConceptArtSelection(gallery));

    expect(result.current.selected?.id).toBe('a');
    act(() => result.current.selectNext());
    expect(result.current.selected?.id).toBe('b');
    act(() => result.current.selectNext());
    expect(result.current.selected?.id).toBe('c');
    act(() => result.current.selectNext());
    expect(result.current.selected?.id).toBe('d');
    act(() => result.current.selectNext());
    expect(result.current.selected?.id).toBe('a');
  });

  it('clears selection when gallery is empty', () => {
    const { result, rerender } = renderHook(({ items }) => useConceptArtSelection(items), {
      initialProps: { items: [asset('a')] },
    });

    expect(result.current.selected?.id).toBe('a');
    rerender({ items: [] });
    expect(result.current.selected).toBeNull();
  });
});
