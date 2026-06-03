import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStanzaFileDrop } from './useStanzaFileDrop';

function fileLike(name: string, type: string): File {
  return { name, type, size: 1 } as File;
}

function dataTransferLike(files: File[]): DataTransfer {
  return {
    files: {
      length: files.length,
      item: (i: number) => files[i] ?? null,
    },
  } as unknown as DataTransfer;
}

describe('useStanzaFileDrop', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onAudioFiles on drop even when types are empty but files are populated', () => {
    const onAudioFiles = vi.fn();
    renderHook(() => useStanzaFileDrop({ onAudioFiles }));

    const file = fileLike('song.mp3', 'audio/mpeg');
    const dt = dataTransferLike([file]);

    act(() => {
      const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
      Object.defineProperty(event, 'dataTransfer', { value: dt });
      window.dispatchEvent(event);
    });

    expect(onAudioFiles).toHaveBeenCalledTimes(1);
    expect(onAudioFiles.mock.calls[0]?.[0]?.[0]?.name).toBe('song.mp3');
  });
});
