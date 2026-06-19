import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useLabsDriveSyncToastMessage } from './useLabsDriveSyncToastMessage';

describe('useLabsDriveSyncToastMessage', () => {
  it('routes transient Drive sync success to toast and dismisses the menu message', () => {
    const onDismissMessage = vi.fn();
    const { result, rerender } = renderHook(
      ({ message }: { message: string | null }) =>
        useLabsDriveSyncToastMessage(message, onDismissMessage),
      { initialProps: { message: null as string | null } },
    );

    rerender({ message: 'Synced from Drive (merged 218 comics).' });

    expect(result.current.toastMessage).toBe('Synced from Drive (merged 218 comics).');
    expect(onDismissMessage).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.clearToast();
    });

    expect(result.current.toastMessage).toBeNull();
  });

  it('keeps persistent errors in the account menu', () => {
    const onDismissMessage = vi.fn();
    const { result, rerender } = renderHook(
      ({ message }: { message: string | null }) =>
        useLabsDriveSyncToastMessage(message, onDismissMessage),
      { initialProps: { message: null as string | null } },
    );

    rerender({ message: 'Could not sync with Drive.' });

    expect(result.current.toastMessage).toBeNull();
    expect(onDismissMessage).not.toHaveBeenCalled();
  });
});
