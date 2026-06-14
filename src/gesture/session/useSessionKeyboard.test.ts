import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSessionKeyboard } from './useSessionKeyboard';

describe('useSessionKeyboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onMarkDone on Enter', () => {
    const onMarkDone = vi.fn();
    renderHook(() =>
      useSessionKeyboard(
        {
          onPause: vi.fn(),
          onMarkDone,
          onSkip: vi.fn(),
          onBack: vi.fn(),
          onExit: vi.fn(),
        },
        true,
      ),
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onMarkDone).toHaveBeenCalledTimes(1);
  });

  it('does not call handlers when disabled', () => {
    const onMarkDone = vi.fn();
    renderHook(() =>
      useSessionKeyboard(
        {
          onPause: vi.fn(),
          onMarkDone,
          onSkip: vi.fn(),
          onBack: vi.fn(),
          onExit: vi.fn(),
        },
        false,
      ),
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onMarkDone).not.toHaveBeenCalled();
  });
});
