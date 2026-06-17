import { describe, expect, it, vi } from 'vitest';
import { GestureUploadCancelledError } from './gestureUploadCancellation';
import { filterUploadFilesSkippingDuplicates } from './gestureUploadDuplicateFilter';
import { throttleUploadProgress } from './gestureUploadProgressReport';

describe('throttleUploadProgress', () => {
  it('coalesces rapid calls', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttleUploadProgress(fn, 200);
    throttled(1, 10);
    throttled(2, 10);
    throttled(3, 10);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith(1, 10);
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(3, 10);
    vi.useRealTimers();
  });
});

describe('filterUploadFilesSkippingDuplicates abort', () => {
  it('stops hashing when shouldAbort returns true', async () => {
    let calls = 0;
    await expect(
      filterUploadFilesSkippingDuplicates(
        [
          new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
          new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
        ],
        {
          existingKeys: new Set(['md5:deadbeef:1']),
          shouldAbort: () => {
            calls += 1;
            return calls > 1;
          },
        },
      ),
    ).rejects.toBeInstanceOf(GestureUploadCancelledError);
  });
});
