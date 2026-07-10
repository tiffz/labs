import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DRIVE_RESUMABLE_CHUNK_MULTIPLE_BYTES,
  isRetryableDriveUploadNetworkError,
  nextByteAfterDriveRange,
  parseDriveResumableRangeHeader,
  queryDriveResumableUploadStatus,
  resolveOffsetAfterChunk308,
  uploadDriveFileResumableChunked,
  xhrTimeoutMsForBytes,
  type DriveUploadHttpResult,
} from './driveResumableUpload';
import { DriveHttpError } from './driveFetchErrors';

vi.mock('../audio/wakeLock', () => ({
  requestWakeLock: vi.fn(async () => undefined),
  releaseWakeLock: vi.fn(async () => undefined),
}));


describe('parseDriveResumableRangeHeader', () => {
  it('parses the last received byte', () => {
    expect(parseDriveResumableRangeHeader('bytes=0-524287')).toBe(524287);
    expect(parseDriveResumableRangeHeader('bytes=0-0')).toBe(0);
  });

  it('returns -1 when missing or malformed', () => {
    expect(parseDriveResumableRangeHeader(null)).toBe(-1);
    expect(parseDriveResumableRangeHeader('')).toBe(-1);
    expect(parseDriveResumableRangeHeader('bytes=*')).toBe(-1);
  });
});

describe('nextByteAfterDriveRange', () => {
  it('advances past the last received byte', () => {
    expect(nextByteAfterDriveRange('bytes=0-99')).toBe(100);
    expect(nextByteAfterDriveRange(null)).toBe(0);
  });
});

describe('resolveOffsetAfterChunk308', () => {
  it('uses Range when Drive reports progress', () => {
    expect(
      resolveOffsetAfterChunk308({
        rangeHeader: 'bytes=0-99',
        chunkStart: 0,
        chunkEndExclusive: 256,
      }),
    ).toBe(100);
  });

  it('falls back to the chunk end when Range is hidden (CORS)', () => {
    expect(
      resolveOffsetAfterChunk308({
        rangeHeader: null,
        chunkStart: 0,
        chunkEndExclusive: 256,
      }),
    ).toBe(256);
  });
});

describe('xhrTimeoutMsForBytes', () => {
  it('scales with size and stays within bounds', () => {
    expect(xhrTimeoutMsForBytes(1024)).toBeGreaterThanOrEqual(60_000);
    expect(xhrTimeoutMsForBytes(80 * 1024 * 1024)).toBeLessThanOrEqual(10 * 60_000);
    expect(xhrTimeoutMsForBytes(5 * 1024 * 1024)).toBeGreaterThan(xhrTimeoutMsForBytes(1024));
  });
});

describe('isRetryableDriveUploadNetworkError', () => {
  it('retries TypeError / network-looking messages', () => {
    expect(isRetryableDriveUploadNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isRetryableDriveUploadNetworkError(new Error('net::ERR_NETWORK_IO_SUSPENDED'))).toBe(true);
  });

  it('does not retry auth failures', () => {
    expect(isRetryableDriveUploadNetworkError(new DriveHttpError('nope', 401))).toBe(false);
    expect(isRetryableDriveUploadNetworkError(new DriveHttpError('nope', 403))).toBe(false);
  });
});

function mockPutResult(status: number, body: string, headers: Record<string, string> = {}): DriveUploadHttpResult {
  return {
    status,
    body,
    getHeader: (name) => {
      const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
      return key ? headers[key]! : null;
    },
  };
}

describe('uploadDriveFileResumableChunked', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('uploads a small file in one final chunk via XHR put', async () => {
    const file = new Blob(['hello-video'], { type: 'video/mp4' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('', {
          status: 200,
          headers: { Location: 'https://www.googleapis.com/upload/session/abc' },
        }),
      ),
    );
    const put = vi.fn(async () => mockPutResult(200, JSON.stringify({ id: 'file-1' })));

    const result = await uploadDriveFileResumableChunked({
      accessToken: 'tok',
      file,
      parents: ['folder'],
      fileName: 'clip.mp4',
      mimeType: 'video/mp4',
      chunkBytes: DRIVE_RESUMABLE_CHUNK_MULTIPLE_BYTES,
      put,
    });
    expect(result).toEqual({ id: 'file-1' });
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('advances through intermediate 308 responses even when Range is missing', async () => {
    const chunk = DRIVE_RESUMABLE_CHUNK_MULTIPLE_BYTES;
    const total = chunk + 10;
    const bytes = new Uint8Array(total);
    bytes.fill(3);
    const file = new Blob([bytes], { type: 'video/mp4' });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('', {
          status: 200,
          headers: { Location: 'https://www.googleapis.com/upload/session/norange' },
        }),
      ),
    );

    const put = vi.fn(async ({ headers }: { headers: Record<string, string> }) => {
      const range = headers['Content-Range'];
      if (range === `bytes 0-${chunk - 1}/${total}`) {
        // Simulate CORS-hidden Range — the bug that stalled multi-chunk browser uploads.
        return mockPutResult(308, '');
      }
      if (range === `bytes ${chunk}-${total - 1}/${total}`) {
        return mockPutResult(200, JSON.stringify({ id: 'file-norange' }));
      }
      throw new Error(`unexpected range ${range}`);
    });

    await expect(
      uploadDriveFileResumableChunked({
        accessToken: 'tok',
        file,
        parents: ['folder'],
        fileName: 'mid.mp4',
        mimeType: 'video/mp4',
        chunkBytes: chunk,
        put,
      }),
    ).resolves.toEqual({ id: 'file-norange' });
    expect(put).toHaveBeenCalledTimes(2);
  });

  it('resumes after a network failure by querying Range and continuing', async () => {
    vi.useFakeTimers();
    const chunk = DRIVE_RESUMABLE_CHUNK_MULTIPLE_BYTES;
    const total = chunk * 2 + 10;
    const bytes = new Uint8Array(total);
    bytes.fill(7);
    const file = new Blob([bytes], { type: 'video/mp4' });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('', {
          status: 200,
          headers: { Location: 'https://www.googleapis.com/upload/session/resume' },
        }),
      ),
    );

    let dataPuts = 0;
    const put = vi.fn(async ({ headers }: { headers: Record<string, string> }) => {
      const range = headers['Content-Range'];

      if (range === `bytes */${total}`) {
        return mockPutResult(308, '', { Range: `bytes=0-${chunk - 1}` });
      }

      dataPuts += 1;
      if (dataPuts === 1) {
        return mockPutResult(308, '', { Range: `bytes=0-${chunk - 1}` });
      }
      if (dataPuts === 2) {
        throw new TypeError('Failed to fetch');
      }
      if (dataPuts === 3) {
        expect(range).toBe(`bytes ${chunk}-${chunk * 2 - 1}/${total}`);
        return mockPutResult(308, '', { Range: `bytes=0-${chunk * 2 - 1}` });
      }
      expect(range).toBe(`bytes ${chunk * 2}-${total - 1}/${total}`);
      return mockPutResult(200, JSON.stringify({ id: 'file-2' }));
    });

    const pending = uploadDriveFileResumableChunked({
      accessToken: 'tok',
      file,
      parents: ['folder'],
      fileName: 'big.mp4',
      mimeType: 'video/mp4',
      chunkBytes: chunk,
      put,
    });

    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual({ id: 'file-2' });
    expect(dataPuts).toBeGreaterThanOrEqual(4);
  });

  it('throws immediately when offline so callers can show waiting UI', async () => {
    const file = new Blob(['offline'], { type: 'video/mp4' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('', {
          status: 200,
          headers: { Location: 'https://www.googleapis.com/upload/session/offline' },
        }),
      ),
    );
    vi.stubGlobal('navigator', { onLine: false } as Navigator);

    const put = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(
      uploadDriveFileResumableChunked({
        accessToken: 'tok',
        file,
        parents: ['folder'],
        fileName: 'clip.mp4',
        mimeType: 'video/mp4',
        chunkBytes: DRIVE_RESUMABLE_CHUNK_MULTIPLE_BYTES,
        put,
      }),
    ).rejects.toThrow('Failed to fetch');
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('restarts the session when Drive returns 404 for a stale upload URI', async () => {
    vi.useFakeTimers();
    const file = new Blob(['abc'], { type: 'video/mp4' });
    let inits = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        inits += 1;
        return new Response('', {
          status: 200,
          headers: { Location: `https://www.googleapis.com/upload/session/${inits}` },
        });
      }),
    );

    const put = vi.fn(async ({ url }: { url: string }) => {
      if (url.endsWith('/session/1')) return mockPutResult(404, 'gone');
      return mockPutResult(200, JSON.stringify({ id: 'file-3' }));
    });

    const pending = uploadDriveFileResumableChunked({
      accessToken: 'tok',
      file,
      parents: ['folder'],
      fileName: 'retry.mp4',
      mimeType: 'video/mp4',
      put,
    });
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual({ id: 'file-3' });
    expect(inits).toBe(2);
  });
});

describe('queryDriveResumableUploadStatus', () => {
  it('returns next byte from 308 Range', async () => {
    const put = vi.fn(async () => mockPutResult(308, '', { Range: 'bytes=0-1023' }));
    await expect(queryDriveResumableUploadStatus('https://session', 5000, put)).resolves.toEqual({
      nextByte: 1024,
      completed: false,
    });
  });
});
