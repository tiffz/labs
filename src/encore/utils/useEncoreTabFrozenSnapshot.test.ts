import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { encoreTabBodyPropsAreEqual, useEncoreTabFrozenSnapshot } from './useEncoreTabFrozenSnapshot';

describe('useEncoreTabFrozenSnapshot', () => {
  it('returns live value while tab is active', () => {
    const { result, rerender } = renderHook(
      ({ active, value }: { active: boolean; value: number }) => useEncoreTabFrozenSnapshot(active, value),
      { initialProps: { active: true, value: 1 } },
    );
    expect(result.current).toBe(1);
    rerender({ active: true, value: 2 });
    expect(result.current).toBe(2);
  });

  it('freezes snapshot while tab is inactive', () => {
    const { result, rerender } = renderHook(
      ({ active, value }: { active: boolean; value: number }) => useEncoreTabFrozenSnapshot(active, value),
      { initialProps: { active: true, value: 1 } },
    );
    rerender({ active: false, value: 99 });
    expect(result.current).toBe(1);
  });
});

describe('encoreTabBodyPropsAreEqual', () => {
  it('skips render when both tabs are inactive', () => {
    expect(
      encoreTabBodyPropsAreEqual(
        { tabActive: false, songs: [{ id: 'a' }] as never, count: 1 },
        { tabActive: false, songs: [{ id: 'b' }] as never, count: 2 },
      ),
    ).toBe(true);
  });

  it('re-renders when tab becomes active', () => {
    expect(
      encoreTabBodyPropsAreEqual({ tabActive: false, songs: [] as never }, { tabActive: true, songs: [] as never }),
    ).toBe(false);
  });
});
