import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  describeDriveFileImportRejection,
  executeDriveFileImport,
  planDriveFileImport,
  type DriveFileImportPlan,
} from './importDriveFile';

/*
 * A fake Drive at the `fetch` layer, so the real metadata, shortcut-resolution and copy helpers run.
 * Files are keyed by id. A token in `readOnlyTokens` may read bytes; any other token is refused the
 * way a `drive.file`-only token is refused for a file the app did not create.
 */
type FakeFile = {
  name: string;
  mimeType: string;
  ownedByMe?: boolean;
  targetId?: string;
};

const SHORTCUT = 'application/vnd.google-apps.shortcut';
const ID = (n: number) => `file${String(n).padStart(25, '0')}`;

function installFakeDrive(
  files: Record<string, FakeFile>,
  opts?: { readOnlyTokens?: string[]; metaStatus?: number }
) {
  const writes: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const token = String(
        (init?.headers as Record<string, string> | undefined)?.Authorization ??
          ''
      ).replace('Bearer ', '');
      const canRead = (opts?.readOnlyTokens ?? ['session']).includes(token);
      const id = decodeURIComponent(
        url.pathname.split('/files/')[1]?.split('/')[0] ?? ''
      );

      if (method === 'POST' && url.pathname.endsWith('/copy')) {
        writes.push(`copy:${id}`);
        if (!canRead)
          return new Response('{"error":{"message":"denied"}}', {
            status: 403,
          });
        return new Response(
          JSON.stringify({ id: 'copy-id', name: files[id]?.name }),
          { status: 200 }
        );
      }
      if (method !== 'GET') {
        writes.push(`${method}:${url.pathname}`);
        return new Response('{}', { status: 200 });
      }
      if (url.searchParams.get('alt') === 'media') {
        return new Response('{"error":{"message":"denied"}}', { status: 403 });
      }
      if (opts?.metaStatus)
        return new Response('{"error":{"message":"x"}}', {
          status: opts.metaStatus,
        });
      const file = files[id];
      if (!file)
        return new Response('{"error":{"message":"File not found"}}', {
          status: 404,
        });
      const body: Record<string, unknown> = {
        id,
        name: file.name,
        mimeType: file.mimeType,
      };
      if (file.ownedByMe !== undefined) body.ownedByMe = file.ownedByMe;
      if (file.targetId) body.shortcutDetails = { targetId: file.targetId };
      return new Response(JSON.stringify(body), { status: 200 });
    })
  );
  return { writes };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('planDriveFileImport', () => {
  it('references a file the user owns', async () => {
    installFakeDrive({
      [ID(1)]: {
        name: 'demo.mov',
        mimeType: 'video/quicktime',
        ownedByMe: true,
      },
    });
    expect(
      await planDriveFileImport(
        'session',
        `https://drive.google.com/file/d/${ID(1)}/view`
      )
    ).toEqual({
      ok: true,
      plan: {
        kind: 'reference',
        fileId: ID(1),
        name: 'demo.mov',
        mimeType: 'video/quicktime',
      },
    });
  });

  it('copies a file someone else owns', async () => {
    installFakeDrive({
      [ID(2)]: { name: 'friend.m4a', mimeType: 'audio/mp4', ownedByMe: false },
    });
    const result = await planDriveFileImport('session', ID(2));
    expect(result.ok && result.plan.kind).toBe('copy');
  });

  it('copies when Drive does not say who owns the file', async () => {
    // A missing ownedByMe must not read as "mine": a pointer at a stranger's file rots silently.
    installFakeDrive({
      [ID(3)]: { name: 'unknown.mp3', mimeType: 'audio/mpeg' },
    });
    const result = await planDriveFileImport('session', ID(3));
    expect(result.ok && result.plan.kind).toBe('copy');
  });

  it('reads ownership from the shortcut target, not the shortcut', async () => {
    // The user owns the SHORTCUT; a friend owns the file it points at. Trusting the shortcut row
    // stores a pointer at the friend's file, which is what the performance editor did.
    installFakeDrive({
      [ID(4)]: {
        name: 'my shortcut',
        mimeType: SHORTCUT,
        ownedByMe: true,
        targetId: ID(5),
      },
      [ID(5)]: {
        name: 'friend.mov',
        mimeType: 'video/quicktime',
        ownedByMe: false,
      },
    });
    expect(await planDriveFileImport('session', ID(4))).toEqual({
      ok: true,
      plan: {
        kind: 'copy',
        sourceFileId: ID(5),
        name: 'friend.mov',
        mimeType: 'video/quicktime',
      },
    });
  });

  it('references the target id when the user owns both shortcut and target', async () => {
    installFakeDrive({
      [ID(6)]: {
        name: 'shortcut',
        mimeType: SHORTCUT,
        ownedByMe: true,
        targetId: ID(7),
      },
      [ID(7)]: { name: 'mine.wav', mimeType: 'audio/wav', ownedByMe: true },
    });
    const result = await planDriveFileImport('session', ID(6));
    expect(result.ok && result.plan).toEqual({
      kind: 'reference',
      fileId: ID(7),
      name: 'mine.wav',
      mimeType: 'audio/wav',
    });
  });

  it.each([
    [
      'folder',
      {
        name: 'Gigs',
        mimeType: 'application/vnd.google-apps.folder',
        ownedByMe: true,
      },
    ],
    [
      'google-native',
      {
        name: 'Lyrics',
        mimeType: 'application/vnd.google-apps.document',
        ownedByMe: true,
      },
    ],
  ] as const)('rejects a %s', async (reason, file) => {
    installFakeDrive({ [ID(8)]: file });
    expect(await planDriveFileImport('session', ID(8))).toEqual({
      ok: false,
      reason,
    });
  });

  it('rejects a file the caller does not accept', async () => {
    installFakeDrive({
      [ID(9)]: { name: 'cover.png', mimeType: 'image/png', ownedByMe: true },
    });
    const accepts = (c: { mimeType: string | null }) =>
      Boolean(c.mimeType?.startsWith('audio/'));
    expect(await planDriveFileImport('session', ID(9), { accepts })).toEqual({
      ok: false,
      reason: 'not-accepted',
    });
  });

  it('rejects input that is not a Drive file link', async () => {
    installFakeDrive({});
    expect(
      await planDriveFileImport('session', 'https://youtube.com/watch?v=abc')
    ).toEqual({
      ok: false,
      reason: 'not-a-drive-link',
    });
  });

  it('reports a file this account cannot see as not-found', async () => {
    installFakeDrive({});
    expect(await planDriveFileImport('session', ID(10))).toEqual({
      ok: false,
      reason: 'not-found',
    });
  });

  it('throws a transient failure instead of calling it not-found', async () => {
    // "You can't open this link" for a rate limit would send the user chasing permissions.
    installFakeDrive(
      { [ID(11)]: { name: 'x.mp3', mimeType: 'audio/mpeg', ownedByMe: true } },
      { metaStatus: 400 }
    );
    await expect(planDriveFileImport('session', ID(11))).rejects.toThrow();
  });

  it('never writes to Drive', async () => {
    const drive = installFakeDrive({
      [ID(12)]: { name: 'x.mp3', mimeType: 'audio/mpeg', ownedByMe: false },
    });
    await planDriveFileImport('session', ID(12));
    expect(drive.writes).toEqual([]);
  });
});

describe('executeDriveFileImport', () => {
  const copyPlan: DriveFileImportPlan = {
    kind: 'copy',
    sourceFileId: ID(20),
    name: 'friend.mov',
    mimeType: 'video/quicktime',
  };
  const friendFile = {
    [ID(20)]: {
      name: 'friend.mov',
      mimeType: 'video/quicktime',
      ownedByMe: false,
    },
  };

  it('returns an owned file without touching Drive', async () => {
    const drive = installFakeDrive({});
    const result = await executeDriveFileImport(
      {
        kind: 'reference',
        fileId: ID(21),
        name: 'mine.mov',
        mimeType: 'video/quicktime',
      },
      { accessToken: 'session', parentFolderId: 'folder' }
    );
    expect(result).toEqual({
      fileId: ID(21),
      name: 'mine.mov',
      via: 'reference',
    });
    expect(drive.writes).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('copies a foreign file with the session token when it can read it', async () => {
    installFakeDrive(friendFile);
    const requestReadAccess = vi.fn();
    const result = await executeDriveFileImport(copyPlan, {
      accessToken: 'session',
      parentFolderId: 'folder',
      requestReadAccess,
    });
    expect(result).toMatchObject({ fileId: 'copy-id', via: 'server-copy' });
    expect(requestReadAccess).not.toHaveBeenCalled();
  });

  it('asks for read access once, then copies with the new token', async () => {
    installFakeDrive(friendFile, { readOnlyTokens: ['broad'] });
    const requestReadAccess = vi.fn(async () => 'broad');
    const result = await executeDriveFileImport(copyPlan, {
      accessToken: 'file-only',
      parentFolderId: 'folder',
      requestReadAccess,
    });
    expect(result).toMatchObject({ fileId: 'copy-id', via: 'server-copy' });
    expect(requestReadAccess).toHaveBeenCalledTimes(1);
  });

  it('gives up when even the broadened token cannot read the file', async () => {
    installFakeDrive(friendFile, { readOnlyTokens: [] });
    const requestReadAccess = vi.fn(async () => 'broad');
    await expect(
      executeDriveFileImport(copyPlan, {
        accessToken: 'file-only',
        parentFolderId: 'folder',
        requestReadAccess,
      })
    ).rejects.toThrow();
    expect(requestReadAccess).toHaveBeenCalledTimes(1);
  });

  it('does not prompt when no prompt is offered', async () => {
    installFakeDrive(friendFile, { readOnlyTokens: [] });
    await expect(
      executeDriveFileImport(copyPlan, {
        accessToken: 'file-only',
        parentFolderId: 'folder',
      })
    ).rejects.toThrow();
  });
});

describe('describeDriveFileImportRejection', () => {
  it('names what the field wanted', () => {
    expect(
      describeDriveFileImportRejection('folder', 'an audio or video file')
    ).toBe('That link is a folder. Paste a link to an audio or video file.');
  });
});
