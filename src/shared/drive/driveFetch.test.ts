import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  driveGetJson,
  etagFromDriveResponse,
  formatDriveRequestFailure,
  pickPreferredDriveListFileId,
  summarizeDriveApiErrorBody,
} from './driveFetch';
import {
  DRIVE_MAX_CONCURRENT_REQUESTS,
  __resetDriveRequestGovernorForTests,
} from './driveRequestGovernor';

vi.mock('../session/labsGoogleSessionPort', () => ({
  tryRefreshGoogleAccessTokenViaBff: vi.fn(async () => null),
}));

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  __resetDriveRequestGovernorForTests();
});

describe('driveFetch retry — honors Retry-After', () => {
  it('waits at least the Retry-After header value before the next attempt', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429, headers: { 'Retry-After': '2' } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const promise = driveGetJson<{ ok: boolean }>('token', '/files');
    // Let the first fetch + body drain settle.
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Not yet elapsed the 2s Retry-After → still no retry.
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Cross 2s → the retry fires.
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await expect(promise).resolves.toEqual({ ok: true });
  });

  it('retries transient 503 with a bounded backoff and then succeeds', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const promise = driveGetJson<{ ok: boolean }>('token', '/files');
    // No Retry-After → jittered backoff is < the 500ms base ceiling; drain past it.
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await expect(promise).resolves.toEqual({ ok: true });
  });

  it('does not retry a non-transient 412 (etag conflict is the caller’s to handle)', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('conflict', { status: 412 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(driveGetJson('token', '/files')).rejects.toThrow(/412/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('driveFetch — bounded global concurrency at the choke point', () => {
  it(`keeps at most DRIVE_MAX_CONCURRENT_REQUESTS (${DRIVE_MAX_CONCURRENT_REQUESTS}) fetches in flight`, async () => {
    const cap = DRIVE_MAX_CONCURRENT_REQUESTS;
    const total = cap + 5;
    let active = 0;
    let maxActive = 0;
    const gates: Array<() => void> = [];

    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((resolve) => gates.push(resolve));
      active -= 1;
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal('fetch', fetchMock);

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    const runs = Array.from({ length: total }, () => driveGetJson('token', '/files'));

    await flush();
    expect(active).toBe(cap);

    while (gates.length > 0) {
      gates.shift()!();
      await flush();
    }

    await Promise.all(runs);
    expect(maxActive).toBe(cap);
    expect(fetchMock).toHaveBeenCalledTimes(total);
  });
});

describe('summarizeDriveApiErrorBody', () => {
  it('parses Drive v3 JSON error message', () => {
    const body = JSON.stringify({
      error: {
        errors: [{ message: 'Insufficient Permission', reason: 'insufficientPermissions' }],
        message: 'Insufficient Permission',
      },
    });
    expect(summarizeDriveApiErrorBody(body)).toBe('Insufficient Permission');
  });

  it('falls back to plain text', () => {
    expect(summarizeDriveApiErrorBody('not json')).toBe('not json');
  });
});

describe('etagFromDriveResponse', () => {
  it('reads ETag header when present', () => {
    const res = new Response(null, { headers: { ETag: '"abc123"' } });
    expect(etagFromDriveResponse(res)).toBe('"abc123"');
  });
});

describe('formatDriveRequestFailure', () => {
  it('appends scope hint for 403 insufficient auth', () => {
    const body = JSON.stringify({
      error: { errors: [{ message: 'Insufficient Permission' }] },
    });
    const msg = formatDriveRequestFailure('GET', '/files', 403, body);
    expect(msg).toContain('Insufficient Permission');
    expect(msg).toMatch(/sign in/i);
  });

  it('appends session hint for 401', () => {
    const msg = formatDriveRequestFailure('GET', '/files', 401, '{"error":{"message":"Invalid Credentials"}}');
    expect(msg).toContain('401');
    expect(msg).toMatch(/sign(ing)? in/i);
  });
});

describe('pickPreferredDriveListFileId', () => {
  it('returns preferred id when it is still in the list', () => {
    expect(
      pickPreferredDriveListFileId(
        [
          { id: 'older', modifiedTime: '2025-01-02T00:00:00.000Z' },
          { id: 'stable', modifiedTime: '2020-01-01T00:00:00.000Z' },
        ],
        'stable',
      ),
    ).toBe('stable');
  });

  it('picks most recently modified when preferred is missing or not listed', () => {
    expect(
      pickPreferredDriveListFileId(
        [
          { id: 'a', modifiedTime: '2025-01-01T00:00:00.000Z' },
          { id: 'b', modifiedTime: '2026-02-01T00:00:00.000Z' },
        ],
        undefined,
      ),
    ).toBe('b');
    expect(
      pickPreferredDriveListFileId(
        [
          { id: 'a', modifiedTime: '2025-01-01T00:00:00.000Z' },
          { id: 'b', modifiedTime: '2026-02-01T00:00:00.000Z' },
        ],
        'gone',
      ),
    ).toBe('b');
  });

  it('returns undefined for empty input', () => {
    expect(pickPreferredDriveListFileId(undefined, 'x')).toBeUndefined();
    expect(pickPreferredDriveListFileId([], 'x')).toBeUndefined();
  });
});
