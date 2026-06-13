import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLocalVideoObjectUrl } from './useLocalVideoObjectUrl';

describe('useLocalVideoObjectUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shares one blob URL across concurrent hooks for the same file', async () => {
    const createObjectURL = vi.fn(() => 'blob:test-shared');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' });

    const first = renderHook(() => useLocalVideoObjectUrl(file));
    const second = renderHook(() => useLocalVideoObjectUrl(file));

    await waitFor(() => {
      expect(first.result.current).toBe('blob:test-shared');
      expect(second.result.current).toBe('blob:test-shared');
    });
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    first.unmount();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    second.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-shared');
  });
});
