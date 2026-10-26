import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { importOriginalTakeFromDrive } from './originalTakeDriveImport';
import type { OriginalAudioTake } from './types';

vi.mock('./drive/originalsSharded', () => ({
  ensureOriginalsDriveLayout: vi.fn(async () => ({ audioFolderId: 'originals-audio-folder' })),
}));

/*
 * A fake Drive at the `fetch` layer, so the shared plan/execute helpers run for real. Records every
 * write so a test can prove a reference leaves the user's original alone.
 */
type FakeFile = { name: string; mimeType: string; ownedByMe?: boolean; targetId?: string };
const SHORTCUT = 'application/vnd.google-apps.shortcut';
const ID = (n: number) => `take${String(n).padStart(25, '0')}`;

let files: Record<string, FakeFile> = {};
let writes: { method: string; path: string; body: Record<string, unknown> }[] = [];
let copyStatus = 200;
let shortcutStatus = 200;

beforeEach(() => {
  files = {};
  writes = [];
  copyStatus = 200;
  shortcutStatus = 200;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      if (method !== 'GET') {
        const body = init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : {};
        writes.push({ method, path: url.pathname, body });
        if (url.pathname.endsWith('/copy')) {
          return copyStatus === 200
            ? new Response(JSON.stringify({ id: 'copy-in-my-drive', name: body.name }), { status: 200 })
            : new Response('{"error":{"message":"denied"}}', { status: copyStatus });
        }
        return shortcutStatus === 200
          ? new Response(JSON.stringify({ id: 'new-shortcut' }), { status: 200 })
          : new Response('{"error":{"message":"nope"}}', { status: shortcutStatus });
      }
      if (url.searchParams.get('alt') === 'media') {
        return new Response('{"error":{"message":"denied"}}', { status: 403 });
      }
      const id = decodeURIComponent(url.pathname.split('/files/')[1] ?? '');
      const file = files[id];
      if (!file) return new Response('{"error":{"message":"File not found"}}', { status: 404 });
      return new Response(
        JSON.stringify({
          id,
          name: file.name,
          mimeType: file.mimeType,
          ...(file.ownedByMe === undefined ? {} : { ownedByMe: file.ownedByMe }),
          ...(file.targetId ? { shortcutDetails: { targetId: file.targetId } } : {}),
        }),
        { status: 200 },
      );
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const link = (id: string) => `https://drive.google.com/file/d/${id}/view`;

describe('importOriginalTakeFromDrive', () => {
  it('references a file you own, and only adds a shortcut beside it', async () => {
    files[ID(1)] = { name: 'Demo 3.mov', mimeType: 'video/quicktime', ownedByMe: true };
    const result = await importOriginalTakeFromDrive(link(ID(1)), { accessToken: 't', existingTakes: [] });

    expect(result).toMatchObject({
      ok: true,
      via: 'reference',
      take: { label: 'Demo 3.mov', driveFileId: ID(1), mimeType: 'video/quicktime', source: 'imported' },
    });
    // The only write is a new shortcut in Encore's own folder. The original is never touched.
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      method: 'POST',
      body: {
        mimeType: SHORTCUT,
        parents: ['originals-audio-folder'],
        shortcutDetails: { targetId: ID(1) },
      },
    });
  });

  it('copies a friend’s file into the Originals audio folder', async () => {
    files[ID(2)] = { name: 'Friend demo.m4a', mimeType: 'audio/mp4', ownedByMe: false };
    const result = await importOriginalTakeFromDrive(link(ID(2)), { accessToken: 't', existingTakes: [] });

    expect(result).toMatchObject({ ok: true, via: 'copy', take: { driveFileId: 'copy-in-my-drive' } });
    expect(writes).toEqual([
      expect.objectContaining({
        path: `/drive/v3/files/${ID(2)}/copy`,
        body: expect.objectContaining({ parents: ['originals-audio-folder'] }),
      }),
    ]);
  });

  it('copies the friend’s file behind your own shortcut', async () => {
    files[ID(3)] = { name: 'My shortcut', mimeType: SHORTCUT, ownedByMe: true, targetId: ID(4) };
    files[ID(4)] = { name: 'Friend demo.wav', mimeType: 'audio/wav', ownedByMe: false };
    const result = await importOriginalTakeFromDrive(link(ID(3)), { accessToken: 't', existingTakes: [] });

    expect(result).toMatchObject({ ok: true, via: 'copy', take: { driveFileId: 'copy-in-my-drive' } });
    expect(writes[0]?.path).toBe(`/drive/v3/files/${ID(4)}/copy`);
  });

  it('refuses a file that is not audio or video, before any write', async () => {
    files[ID(5)] = { name: 'Lead sheet.pdf', mimeType: 'application/pdf', ownedByMe: true };
    const result = await importOriginalTakeFromDrive(link(ID(5)), { accessToken: 't', existingTakes: [] });

    expect(result).toEqual({ ok: false, message: "That file isn't an audio or video file." });
    expect(writes).toEqual([]);
  });

  it('does not add the same owned file twice', async () => {
    files[ID(6)] = { name: 'Demo.mp3', mimeType: 'audio/mpeg', ownedByMe: true };
    const existing: OriginalAudioTake = {
      id: 'take-1',
      label: 'Demo.mp3',
      timestamp: 0,
      source: 'imported',
      driveFileId: ID(6),
    };
    const result = await importOriginalTakeFromDrive(link(ID(6)), {
      accessToken: 't',
      existingTakes: [existing],
    });

    expect(result).toEqual({ ok: false, message: 'That file is already one of these takes.' });
    expect(writes).toEqual([]);
  });

  it('adds no take when the copy fails', async () => {
    files[ID(7)] = { name: 'Friend demo.mp3', mimeType: 'audio/mpeg', ownedByMe: false };
    copyStatus = 500;
    // The download fallback is refused too (alt=media → 403), so the copy cannot finish.
    const result = await importOriginalTakeFromDrive(link(ID(7)), { accessToken: 't', existingTakes: [] });

    expect(result.ok).toBe(false);
  });

  it('keeps the take when only the organising shortcut fails', async () => {
    files[ID(8)] = { name: 'Demo.wav', mimeType: 'audio/wav', ownedByMe: true };
    shortcutStatus = 403;
    const result = await importOriginalTakeFromDrive(link(ID(8)), { accessToken: 't', existingTakes: [] });

    expect(result).toMatchObject({ ok: true, via: 'reference', take: { driveFileId: ID(8) } });
  });
});
