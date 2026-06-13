import { renderHook } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useStopVideoWhenInactive } from './useStopVideoWhenInactive';

describe('useStopVideoWhenInactive', () => {
  it('pauses and resets the video when inactive', () => {
    const videoRef = createRef<HTMLVideoElement>();
    const pause = vi.fn();
    const video = { pause, currentTime: 12 } as unknown as HTMLVideoElement;
    videoRef.current = video;

    const { rerender } = renderHook(({ active }) => useStopVideoWhenInactive(active, videoRef), {
      initialProps: { active: true },
    });

    rerender({ active: false });

    expect(pause).toHaveBeenCalledTimes(1);
    expect(video.currentTime).toBe(0);
  });
});
