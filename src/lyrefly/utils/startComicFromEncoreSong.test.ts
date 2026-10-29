// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { lyreflyDb } from '../db/lyreflyDb';
import { lyreflyWorkPhase } from '../workflow/lyreflyWorkPhase';
import { lyreflyWorkIdForSong, startComicFromEncoreSong } from './startComicFromEncoreSong';

const song = {
  id: 'song-1',
  title: 'A Far Away Moon',
  lyricsAndChords: '{title: Moon}\n[C]I know the [G]moon\nis where you <rest>',
  instrumental: false,
  updatedAt: '2026-10-01T00:00:00Z',
};

beforeEach(async () => {
  await lyreflyDb.delete();
  await lyreflyDb.open();
});

describe('startComicFromEncoreSong', () => {
  it('starts a comic idea with the lyrics quoted and a snapshot of the song', async () => {
    const project = await startComicFromEncoreSong(song);
    expect(project.id).toBe(lyreflyWorkIdForSong('song-1'));
    expect(project.title).toBe('A Far Away Moon');
    expect(project.brainstormHtml).toBe('<blockquote><p>I know the moon</p><p>is where you &lt;rest&gt;</p></blockquote>');
    expect(project.sources).toEqual([
      expect.objectContaining({ kind: 'encore-original', songId: 'song-1', snapshot: expect.objectContaining({ songUpdatedAt: song.updatedAt }) }),
    ]);
    const script = await lyreflyDb.scriptDocuments.get(project.scriptDocumentId);
    // An idea, not yet developing: it belongs in the Sketchbook.
    expect(lyreflyWorkPhase(project, { scriptMarkdown: script?.markdown, pageNodeCount: 0, publishLogCount: 0, packageOnDevice: true })).toBe('idea');
  });

  it('starting the same song again opens the same comic', async () => {
    const first = await startComicFromEncoreSong(song);
    const again = await startComicFromEncoreSong({ ...song, title: 'Renamed' });
    expect(again.id).toBe(first.id);
    expect(await lyreflyDb.projects.count()).toBe(1);
    expect(await lyreflyDb.scriptDocuments.count()).toBe(1);
  });
});
