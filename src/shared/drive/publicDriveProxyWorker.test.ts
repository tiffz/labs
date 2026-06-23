import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Env } from '../../../workers/labs-session-bff/src/constants';
import {
  handlePublicDriveMedia,
  handlePublicDriveMeta,
  parsePublicDriveFileId,
} from '../../../workers/labs-session-bff/src/publicDriveProxy';

const cors = new Headers({ 'Access-Control-Allow-Origin': 'https://labs.tiffzhang.com' });

function mockEnv(overrides?: Partial<Env>): Env {
  return {
    SESSION_KV: {
      get: vi.fn(async () => null),
      put: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      list: vi.fn(async () => ({ keys: [], list_complete: true, cacheStatus: null })),
    } as unknown as KVNamespace,
    ALLOWED_ORIGINS: 'https://labs.tiffzhang.com',
    GOOGLE_DRIVE_REFERER: 'https://labs.tiffzhang.com/encore/',
    GOOGLE_API_KEY: 'test-api-key',
    ...overrides,
  };
}

describe('session BFF public Drive proxy', () => {
  describe('parsePublicDriveFileId', () => {
    it('parses media and meta routes', () => {
      expect(parsePublicDriveFileId('/v1/public-drive/files/abc123/media', 'media')).toBe('abc123');
      expect(parsePublicDriveFileId('/v1/public-drive/files/abc123/meta', 'meta')).toBe('abc123');
      expect(parsePublicDriveFileId('/v1/public-drive/files/bad/id/media', 'media')).toBeNull();
    });
  });

  describe('handlePublicDriveMedia', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn(async () =>
        new Response(JSON.stringify({ version: 1, songs: [], performances: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ) as typeof fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('returns 503 when GOOGLE_API_KEY is missing', async () => {
      const req = new Request('https://example.com/v1/public-drive/files/file1/media?supportsAllDrives=false');
      const res = await handlePublicDriveMedia(req, mockEnv({ GOOGLE_API_KEY: undefined }), cors);
      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({ error: /missing GOOGLE_API_KEY/ });
    });

    it('proxies to Google Drive with Referer header', async () => {
      const req = new Request('https://example.com/v1/public-drive/files/file1/media?supportsAllDrives=false', {
        headers: { 'CF-Connecting-IP': '203.0.113.1' },
      });
      const res = await handlePublicDriveMedia(req, mockEnv(), cors);
      expect(res.status).toBe(200);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.googleapis.com/drive/v3/files/file1'),
        expect.objectContaining({
          headers: { Referer: 'https://labs.tiffzhang.com/encore/' },
        }),
      );
    });
  });

  describe('handlePublicDriveMeta', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn(async () =>
        new Response('{"mimeType":"application/json"}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ) as typeof fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('returns 503 when GOOGLE_API_KEY is missing', async () => {
      const req = new Request('https://example.com/v1/public-drive/files/file1/meta?supportsAllDrives=false');
      const res = await handlePublicDriveMeta(req, mockEnv({ GOOGLE_API_KEY: undefined }), cors);
      expect(res.status).toBe(503);
    });
  });
});
