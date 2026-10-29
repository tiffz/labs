import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../drive/driveFetch', () => ({
  driveListFiles: vi.fn(),
  driveGetMedia: vi.fn(),
}));

import * as driveFetch from '../drive/driveFetch';
import { encoreLyricsPlainText, readEncoreOriginals } from './encoreOriginalsReader';

const list = vi.mocked(driveFetch.driveListFiles);
const media = vi.mocked(driveFetch.driveGetMedia);

/** A Drive with Encore_App/Originals and a manifest of two songs. */
function encoreDrive(files: Record<string, string>, folders = { app: 'app', originals: 'orig', manifest: 'man' }) {
  list.mockImplementation(async (_t, q: string) => {
    if (q.includes("name='Encore_App'")) return { files: folders.app ? [{ id: folders.app }] : [] };
    if (q.includes("name='Originals'")) return { files: folders.originals ? [{ id: folders.originals }] : [] };
    if (q.includes('originals_manifest.json')) return { files: folders.manifest ? [{ id: folders.manifest }] : [] };
    return { files: [] };
  });
  media.mockImplementation(async (_t, id: string) => files[id] ?? '');
}

const song = (id: string, title: string, updatedAt: string) =>
  JSON.stringify({ id, title, lyricsAndChords: '[C]Hello [G]moon', updatedAt, takes: [], history: [] });

beforeEach(() => vi.clearAllMocks());

describe('readEncoreOriginals', () => {
  it('lists every song in the manifest, newest first, opened by file id', async () => {
    encoreDrive({
      man: JSON.stringify({ version: 1, originals: { a: { fileId: 'fa', updatedAt: '1' }, b: { fileId: 'fb', updatedAt: '2' } } }),
      fa: song('a', 'Moon', '2026-01-01T00:00:00Z'),
      fb: song('b', 'Steps', '2026-03-01T00:00:00Z'),
    });
    const read = await readEncoreOriginals('t');
    expect(read).toEqual({ status: 'ok', songs: [expect.objectContaining({ title: 'Steps' }), expect.objectContaining({ title: 'Moon' })] });
  });

  // "Can't check" must never look like "no songs".
  it.each([
    ['no Encore folder', { app: '', originals: 'orig', manifest: 'man' }],
    ['no Originals folder', { app: 'app', originals: '', manifest: 'man' }],
    ['no manifest', { app: 'app', originals: 'orig', manifest: '' }],
  ])('reports %s as unavailable, not as an empty list', async (_name, folders) => {
    encoreDrive({}, folders);
    expect((await readEncoreOriginals('t')).status).toBe('unavailable');
  });

  it('reports a Drive error as unavailable', async () => {
    list.mockRejectedValue(new Error('offline'));
    expect(await readEncoreOriginals('t')).toEqual({ status: 'unavailable', reason: 'offline' });
  });
});

describe('encoreLyricsPlainText', () => {
  it('drops chords and directives, keeps the words', () => {
    expect(encoreLyricsPlainText('{title: Moon}\n[C]Hello [G]moon\n\n\n\nGoodbye')).toBe('Hello moon\n\nGoodbye');
  });
});

// ADR 0032: Encore owns its songs. The reader may list and read, never write.
describe('encoreOriginalsReader guardrail', () => {
  it('imports no Drive helper that creates, changes or removes a file', () => {
    const source = readFileSync(join(__dirname, 'encoreOriginalsReader.ts'), 'utf8');
    const imported = [...source.matchAll(/import \{([^}]*)\} from '[^']*driveFetch'/g)].flatMap((m) =>
      m[1]!.split(',').map((s) => s.trim()),
    );
    expect(imported.length).toBeGreaterThan(0);
    expect(imported.filter((name) => !/^drive(Get|List)/.test(name))).toEqual([]);
  });
});
