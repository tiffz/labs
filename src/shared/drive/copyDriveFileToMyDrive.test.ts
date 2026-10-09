import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DriveHttpError } from './driveFetchErrors';
import {
  DriveCopyError,
  classifyDriveCopyFailure,
  copyDriveFileToMyDrive,
  isGoogleNativeMimeType,
  type DriveCopyProgress,
} from './copyDriveFileToMyDrive';

/**
 * The classification is the load-bearing part: it decides whether the UI retries, tells the user to
 * ask for access, or gives up. Getting it wrong is what turned a shared link into an infinite
 * retry loop in the performance editor.
 */
describe('classifyDriveCopyFailure', () => {
  it('treats 403 as a permission problem, not a transient one', () => {
    expect(classifyDriveCopyFailure(new DriveHttpError('forbidden', 403))).toBe('no-access');
  });

  it('treats 404 as not-found', () => {
    // Drive returns 404 for a file that exists but was never shared with this user, so this is the
    // common case for "my friend sent me a link" — not a typo'd URL.
    expect(classifyDriveCopyFailure(new DriveHttpError('not found', 404))).toBe('not-found');
  });

  it('does not classify a transient status as permanent', () => {
    expect(classifyDriveCopyFailure(new DriveHttpError('rate limited', 429))).toBe('failed');
    expect(classifyDriveCopyFailure(new DriveHttpError('server', 500))).toBe('failed');
  });

  it('passes through a reason already decided by the copy itself', () => {
    expect(classifyDriveCopyFailure(new DriveCopyError('not-a-file', 'nope'))).toBe('not-a-file');
  });

  it('falls back to failed for anything unrecognised', () => {
    expect(classifyDriveCopyFailure(new TypeError('Failed to fetch'))).toBe('failed');
    expect(classifyDriveCopyFailure(undefined)).toBe('failed');
  });
});

describe('isGoogleNativeMimeType', () => {
  it('detects export-only Google types', () => {
    expect(isGoogleNativeMimeType('application/vnd.google-apps.document')).toBe(true);
    expect(isGoogleNativeMimeType('application/vnd.google-apps.spreadsheet')).toBe(true);
  });

  it('accepts real media', () => {
    expect(isGoogleNativeMimeType('video/mp4')).toBe(false);
    expect(isGoogleNativeMimeType('audio/mpeg')).toBe(false);
    expect(isGoogleNativeMimeType(undefined)).toBe(false);
  });

  it('does not mistake a Drive folder for a copyable file', () => {
    // Folders are also a google-apps type, so they are rejected by the same check.
    expect(isGoogleNativeMimeType('application/vnd.google-apps.folder')).toBe(true);
  });
});

/*
 * Behaviour of the copy itself, against a fake Drive at the `fetch` layer so the real request
 * helpers run. Only the resumable upload is stubbed — it has its own tests and a chunked protocol
 * that would drown these in fixture.
 */
const uploadMock = vi.hoisted(() => vi.fn());
vi.mock('./driveFetch', async (importActual) => {
  const actual = await importActual<typeof import('./driveFetch')>();
  return { ...actual, driveUploadFileResumable: uploadMock };
});

type FakeDrive = {
  mimeType?: string;
  size?: number;
  /** Status `files.copy` answers with; 200 copies server-side. */
  copyStatus?: number;
  /** Status `alt=media` answers with. */
  mediaStatus?: number;
  /** Omit Content-Length on the media response. */
  hideLength?: boolean;
  chunks?: number;
};

function installFakeDrive(drive: FakeDrive) {
  const calls: string[] = [];
  const bytes = drive.size ?? 4000;
  const chunkCount = drive.chunks ?? 4;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (method === 'POST' && url.includes('/copy')) {
        calls.push('copy');
        const status = drive.copyStatus ?? 200;
        return status === 200
          ? new Response(JSON.stringify({ id: 'server-copy-id', name: 'Gig.mp4', size: String(bytes) }), { status })
          : new Response('{"error":{"message":"denied"}}', { status });
      }
      if (url.includes('alt=media')) {
        calls.push('media');
        if ((drive.mediaStatus ?? 200) !== 200) {
          return new Response('{"error":{"message":"denied"}}', { status: drive.mediaStatus });
        }
        const chunkSize = Math.ceil(bytes / chunkCount);
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            for (let sent = 0; sent < bytes; sent += chunkSize) {
              controller.enqueue(new Uint8Array(Math.min(chunkSize, bytes - sent)));
            }
            controller.close();
          },
        });
        const headers: Record<string, string> = { 'Content-Type': 'video/mp4' };
        if (!drive.hideLength) headers['Content-Length'] = String(bytes);
        return new Response(body, { status: 200, headers });
      }
      calls.push('meta');
      const meta: Record<string, string> = { id: 'src', name: 'Gig.mp4', mimeType: drive.mimeType ?? 'video/mp4' };
      if (drive.size != null && !drive.hideLength) meta.size = String(drive.size);
      return new Response(JSON.stringify(meta), { status: 200 });
    }),
  );
  return calls;
}

async function runCopy() {
  const progress: DriveCopyProgress[] = [];
  const result = await copyDriveFileToMyDrive({
    accessToken: 'token',
    sourceFileId: 'src',
    parentFolderId: 'perf-folder',
    onProgress: (p) => progress.push(p),
  });
  return { result, progress };
}

describe('copyDriveFileToMyDrive', () => {
  beforeEach(() => {
    uploadMock.mockReset();
    uploadMock.mockImplementation(
      async (_token: string, file: File, _parents: string[], _name: string, opts?: { onProgress?: (p: { bytesSent: number; bytesTotal: number }) => void }) => {
        opts?.onProgress?.({ bytesSent: file.size / 2, bytesTotal: file.size });
        opts?.onProgress?.({ bytesSent: file.size, bytesTotal: file.size });
        return { id: 'uploaded-id' };
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('copies server-side when Drive allows it, without pulling the bytes through the browser', async () => {
    const calls = installFakeDrive({ size: 4000 });
    const { result, progress } = await runCopy();

    expect(result).toMatchObject({ fileId: 'server-copy-id', via: 'server-copy', bytes: 4000 });
    expect(calls).not.toContain('media');
    expect(uploadMock).not.toHaveBeenCalled();
    expect(progress.map((p) => p.stage)).toEqual(['preparing', 'server-copy']);
  });

  it('falls back to download and upload, reporting download progress from the first chunk', async () => {
    const calls = installFakeDrive({ size: 4000, copyStatus: 403, chunks: 4 });
    const { result, progress } = await runCopy();

    expect(result).toMatchObject({ fileId: 'uploaded-id', via: 'download-upload', bytes: 4000 });
    expect(calls).toEqual(expect.arrayContaining(['copy', 'media']));

    // The bar used to sit at 0 for the whole download. It must climb while bytes arrive.
    const download = progress.filter((p) => p.stage === 'download');
    expect(download.length).toBeGreaterThanOrEqual(4);
    expect(download.map((p) => p.bytesDone)).toEqual([0, 1000, 2000, 3000, 4000]);
    expect(download.at(-1)?.fraction).toBeCloseTo(0.5);

    const upload = progress.filter((p) => p.stage === 'upload');
    expect(upload.at(-1)?.fraction).toBe(1);

    const fractions = progress.map((p) => p.fraction).filter((f): f is number => f != null);
    for (let i = 1; i < fractions.length; i += 1) {
      expect(fractions[i]).toBeGreaterThanOrEqual(fractions[i - 1]!);
    }
    const uploadedFile = uploadMock.mock.calls[0]![1] as File;
    expect(uploadedFile.size).toBe(4000);
  });

  it('reports an unknown size as indeterminate, not as 0%', async () => {
    installFakeDrive({ size: 4000, copyStatus: 403, hideLength: true });
    const { progress } = await runCopy();

    const download = progress.filter((p) => p.stage === 'download');
    expect(download.length).toBeGreaterThan(0);
    for (const p of download) {
      expect(p.fraction).toBeNull();
      expect(p.bytesTotal).toBeNull();
    }
  });

  it('still raises a permission failure the editor can classify, so it can ask for read access', async () => {
    installFakeDrive({ copyStatus: 404, mediaStatus: 403 });
    const error = await runCopy().catch((e: unknown) => e);

    expect(classifyDriveCopyFailure(error)).toBe('no-access');
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('rejects a Google Doc before trying either copy route', async () => {
    const calls = installFakeDrive({ mimeType: 'application/vnd.google-apps.document' });
    const error = await runCopy().catch((e: unknown) => e);

    expect(classifyDriveCopyFailure(error)).toBe('not-a-file');
    expect(calls).not.toContain('copy');
    expect(calls).not.toContain('media');
  });
});
