import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEncoreHeavyListTabLaidOut } from './useEncoreHeavyListTabLaidOut';

describe('useEncoreHeavyListTabLaidOut', () => {
  it('does not signal until active and ready', () => {
    const onHeavyTabLaidOut = vi.fn();
    renderHook(({ active, ready }) => useEncoreHeavyListTabLaidOut(active, ready, onHeavyTabLaidOut), {
      initialProps: { active: true, ready: false },
    });
    expect(onHeavyTabLaidOut).not.toHaveBeenCalled();
  });

  it('signals once after ready and two animation frames', async () => {
    const onHeavyTabLaidOut = vi.fn();
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      });

    renderHook(({ active, ready }) => useEncoreHeavyListTabLaidOut(active, ready, onHeavyTabLaidOut), {
      initialProps: { active: true, ready: false },
    });

    rafSpy.mockClear();
    renderHook(({ active, ready }) => useEncoreHeavyListTabLaidOut(active, ready, onHeavyTabLaidOut), {
      initialProps: { active: true, ready: true },
    });

    expect(onHeavyTabLaidOut).toHaveBeenCalledTimes(1);
    rafSpy.mockRestore();
  });
});
